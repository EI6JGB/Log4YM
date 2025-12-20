using System.Collections.Concurrent;
using System.Net.Sockets;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using Log4YM.Contracts.Events;
using Log4YM.Server.Hubs;

namespace Log4YM.Server.Services;

/// <summary>
/// Service for Hamlib rigctld TCP connection for CAT control
/// Connects to rigctld daemon running on specified host:port
/// </summary>
public class HamlibService : BackgroundService
{
    private readonly ILogger<HamlibService> _logger;
    private readonly IHubContext<LogHub, ILogHubClient> _hubContext;
    private readonly ConcurrentDictionary<string, HamlibConnection> _connections = new();

    private const int DefaultRigctldPort = 4532;
    private const int PollIntervalMs = 250;

    public HamlibService(
        ILogger<HamlibService> logger,
        IHubContext<LogHub, ILogHubClient> hubContext)
    {
        _logger = logger;
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Hamlib service starting...");

        // Poll connected radios periodically
        while (!stoppingToken.IsCancellationRequested)
        {
            foreach (var connection in _connections.Values.Where(c => c.IsConnected))
            {
                await connection.PollStateAsync();
            }
            await Task.Delay(PollIntervalMs, stoppingToken);
        }
    }

    public bool HasRadio(string radioId) => _connections.ContainsKey(radioId);

    /// <summary>
    /// Connect to a rigctld instance
    /// </summary>
    public async Task ConnectAsync(string host, int port = DefaultRigctldPort, string? name = null)
    {
        var radioId = $"hamlib-{host}:{port}";

        if (_connections.ContainsKey(radioId))
        {
            _logger.LogDebug("Already connected to rigctld at {Host}:{Port}", host, port);
            return;
        }

        await _hubContext.BroadcastRadioConnectionStateChanged(
            new RadioConnectionStateChangedEvent(radioId, RadioConnectionState.Connecting));

        var connection = new HamlibConnection(radioId, host, port, name ?? $"rigctld ({host})", _logger, _hubContext);
        if (_connections.TryAdd(radioId, connection))
        {
            _ = connection.ConnectAsync();
        }
    }

    public async Task DisconnectAsync(string radioId)
    {
        if (_connections.TryRemove(radioId, out var connection))
        {
            await connection.DisconnectAsync();
            await _hubContext.BroadcastRadioConnectionStateChanged(
                new RadioConnectionStateChangedEvent(radioId, RadioConnectionState.Disconnected));
            await _hubContext.BroadcastRadioRemoved(new RadioRemovedEvent(radioId));
        }
    }

    public IEnumerable<RadioDiscoveredEvent> GetDiscoveredRadios()
    {
        return _connections.Values.Select(c => new RadioDiscoveredEvent(
            c.RadioId,
            RadioType.Hamlib,
            c.Name,
            c.Host,
            c.Port,
            null,
            null
        ));
    }

    public IEnumerable<RadioStateChangedEvent> GetRadioStates()
    {
        return _connections.Values
            .Where(c => c.IsConnected)
            .Select(c => c.GetCurrentState())
            .Where(s => s != null)!;
    }
}

internal class HamlibConnection
{
    public string RadioId { get; }
    public string Host { get; }
    public int Port { get; }
    public string Name { get; }

    private readonly ILogger _logger;
    private readonly IHubContext<LogHub, ILogHubClient> _hubContext;

    private TcpClient? _tcpClient;
    private NetworkStream? _stream;
    private StreamReader? _reader;
    private StreamWriter? _writer;
    private CancellationTokenSource? _cts;

    private long _currentFrequencyHz;
    private string _currentMode = "USB";
    private int _currentPassband;
    private bool _isTransmitting;
    private bool _announced;

    public bool IsConnected => _tcpClient?.Connected ?? false;

    public HamlibConnection(string radioId, string host, int port, string name, ILogger logger, IHubContext<LogHub, ILogHubClient> hubContext)
    {
        RadioId = radioId;
        Host = host;
        Port = port;
        Name = name;
        _logger = logger;
        _hubContext = hubContext;
    }

    public async Task ConnectAsync()
    {
        _cts = new CancellationTokenSource();

        try
        {
            _logger.LogInformation("Connecting to rigctld at {Host}:{Port}", Host, Port);

            _tcpClient = new TcpClient();
            await _tcpClient.ConnectAsync(Host, Port, _cts.Token);
            _stream = _tcpClient.GetStream();
            _reader = new StreamReader(_stream, Encoding.ASCII);
            _writer = new StreamWriter(_stream, Encoding.ASCII) { AutoFlush = true };

            _logger.LogInformation("Connected to rigctld at {Host}:{Port}", Host, Port);

            // Get initial state
            await PollStateAsync();

            await _hubContext.BroadcastRadioConnectionStateChanged(
                new RadioConnectionStateChangedEvent(RadioId, RadioConnectionState.Connected));

            // Announce as discovered
            if (!_announced)
            {
                _announced = true;
                await _hubContext.BroadcastRadioDiscovered(new RadioDiscoveredEvent(
                    RadioId,
                    RadioType.Hamlib,
                    Name,
                    Host,
                    Port,
                    null,
                    null
                ));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to rigctld at {Host}:{Port}", Host, Port);
            await _hubContext.BroadcastRadioConnectionStateChanged(
                new RadioConnectionStateChangedEvent(RadioId, RadioConnectionState.Error, ex.Message));
        }
    }

    public Task DisconnectAsync()
    {
        _cts?.Cancel();
        _reader?.Dispose();
        _writer?.Dispose();
        _stream?.Close();
        _tcpClient?.Close();
        _tcpClient = null;
        _stream = null;
        _reader = null;
        _writer = null;
        return Task.CompletedTask;
    }

    public RadioStateChangedEvent? GetCurrentState()
    {
        if (!IsConnected) return null;

        return new RadioStateChangedEvent(
            RadioId,
            _currentFrequencyHz,
            _currentMode,
            _isTransmitting,
            BandHelper.GetBand(_currentFrequencyHz),
            null
        );
    }

    public async Task PollStateAsync()
    {
        if (!IsConnected || _writer == null || _reader == null) return;

        try
        {
            var stateChanged = false;

            // Get frequency (command: f)
            var freqResponse = await SendCommandAsync("f");
            if (long.TryParse(freqResponse?.Trim(), out var freq) && freq != _currentFrequencyHz)
            {
                _currentFrequencyHz = freq;
                stateChanged = true;
            }

            // Get mode (command: m) - returns mode and passband on separate lines
            var modeResponse = await SendCommandAsync("m");
            if (!string.IsNullOrEmpty(modeResponse))
            {
                var lines = modeResponse.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                if (lines.Length >= 1)
                {
                    var mode = lines[0].Trim().ToUpper();
                    if (mode != _currentMode)
                    {
                        _currentMode = mode;
                        stateChanged = true;
                    }
                }
                if (lines.Length >= 2 && int.TryParse(lines[1].Trim(), out var passband))
                {
                    _currentPassband = passband;
                }
            }

            // Get PTT state (command: t)
            var pttResponse = await SendCommandAsync("t");
            if (int.TryParse(pttResponse?.Trim(), out var ptt))
            {
                var newTx = ptt != 0;
                if (newTx != _isTransmitting)
                {
                    _isTransmitting = newTx;
                    stateChanged = true;
                }
            }

            if (stateChanged)
            {
                await BroadcastStateAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error polling rigctld state");
            // Connection may be lost, try to reconnect
            await DisconnectAsync();
            await _hubContext.BroadcastRadioConnectionStateChanged(
                new RadioConnectionStateChangedEvent(RadioId, RadioConnectionState.Disconnected));
        }
    }

    private async Task<string?> SendCommandAsync(string command)
    {
        if (_writer == null || _reader == null) return null;

        try
        {
            await _writer.WriteLineAsync(command);

            // Read response - rigctld sends response followed by "RPRT 0" for success
            var response = new StringBuilder();
            string? line;

            // Set a read timeout
            _stream!.ReadTimeout = 1000;

            while ((line = await _reader.ReadLineAsync()) != null)
            {
                // RPRT indicates end of response
                if (line.StartsWith("RPRT"))
                {
                    // Check for error
                    if (!line.Contains("RPRT 0") && !line.Contains("RPRT0"))
                    {
                        _logger.LogDebug("rigctld error response: {Line}", line);
                        return null;
                    }
                    break;
                }
                response.AppendLine(line);
            }

            return response.ToString();
        }
        catch (IOException)
        {
            // Timeout or connection issue
            return null;
        }
    }

    private async Task BroadcastStateAsync()
    {
        var state = GetCurrentState();
        if (state != null)
        {
            _logger.LogDebug("Hamlib state: {Freq} Hz, {Mode}, TX={Tx}",
                _currentFrequencyHz, _currentMode, _isTransmitting);
            await _hubContext.BroadcastRadioStateChanged(state);
        }
    }
}
