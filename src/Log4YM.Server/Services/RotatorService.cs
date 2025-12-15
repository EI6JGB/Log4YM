using System.Net.Sockets;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using Log4YM.Contracts.Events;
using Log4YM.Contracts.Models;
using Log4YM.Server.Hubs;

namespace Log4YM.Server.Services;

/// <summary>
/// Service for controlling antenna rotator via hamlib rotctld protocol (TCP).
/// Default port 4533.
///
/// Protocol commands:
/// - p or \get_pos: Get current azimuth/elevation
/// - P az el or \set_pos az el: Set target position
/// - S or \stop: Stop rotation
/// </summary>
public class RotatorService : BackgroundService
{
    private readonly ILogger<RotatorService> _logger;
    private readonly IHubContext<LogHub, ILogHubClient> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;

    private TcpClient? _client;
    private NetworkStream? _stream;
    private StreamReader? _reader;
    private StreamWriter? _writer;

    private RotatorSettings _settings = new();
    private double _currentAzimuth;
    private double? _targetAzimuth;
    private bool _isMoving;
    private bool _isConnected;
    private DateTime _lastPositionUpdate = DateTime.MinValue;
    private readonly object _lock = new();

    public RotatorService(
        ILogger<RotatorService> logger,
        IHubContext<LogHub, ILogHubClient> hubContext,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Rotator service starting...");

        // Load initial settings
        await RefreshSettingsAsync();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Periodically refresh settings in case they changed
                await RefreshSettingsAsync();

                if (!_settings.Enabled)
                {
                    if (_isConnected)
                    {
                        Disconnect();
                    }
                    await Task.Delay(5000, stoppingToken);
                    continue;
                }

                // Try to connect if not connected
                if (!_isConnected)
                {
                    await ConnectAsync(stoppingToken);
                }

                if (_isConnected)
                {
                    // Poll current position
                    await PollPositionAsync(stoppingToken);
                }

                await Task.Delay(_settings.PollingIntervalMs, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in rotator service loop");
                Disconnect();
                await Task.Delay(5000, stoppingToken);
            }
        }

        Disconnect();
        _logger.LogInformation("Rotator service stopped");
    }

    private async Task RefreshSettingsAsync()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var settingsService = scope.ServiceProvider.GetRequiredService<ISettingsService>();
            var userSettings = await settingsService.GetSettingsAsync();
            var newSettings = userSettings.Rotator;

            // Check if connection settings changed
            if (_settings.IpAddress != newSettings.IpAddress ||
                _settings.Port != newSettings.Port ||
                _settings.Enabled != newSettings.Enabled)
            {
                if (_isConnected && _settings.Enabled)
                {
                    _logger.LogInformation("Rotator settings changed, reconnecting...");
                    Disconnect();
                }
            }

            _settings = newSettings;

            _logger.LogDebug("Rotator settings: Enabled={Enabled}, IP={Ip}, Port={Port}",
                _settings.Enabled, _settings.IpAddress, _settings.Port);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh rotator settings");
        }
    }

    private async Task ConnectAsync(CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Connecting to rotctld at {Ip}:{Port}...",
                _settings.IpAddress, _settings.Port);

            _client = new TcpClient();
            await _client.ConnectAsync(_settings.IpAddress, _settings.Port, ct);

            _stream = _client.GetStream();
            _reader = new StreamReader(_stream, Encoding.ASCII);
            _writer = new StreamWriter(_stream, Encoding.ASCII) { AutoFlush = true };

            _isConnected = true;
            _logger.LogInformation("Connected to rotctld at {Ip}:{Port}",
                _settings.IpAddress, _settings.Port);

            // Initial position poll
            await PollPositionAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to connect to rotctld at {Ip}:{Port}: {Message}",
                _settings.IpAddress, _settings.Port, ex.Message);
            Disconnect();
        }
    }

    private void Disconnect()
    {
        try
        {
            _reader?.Dispose();
            _writer?.Dispose();
            _stream?.Dispose();
            _client?.Dispose();
        }
        catch { }
        finally
        {
            _reader = null;
            _writer = null;
            _stream = null;
            _client = null;
            _isConnected = false;
        }
    }

    private async Task PollPositionAsync(CancellationToken ct)
    {
        try
        {
            if (_writer == null || _reader == null)
                return;

            // Send get position command
            await _writer.WriteLineAsync("p");

            // Read response - rotctld returns azimuth on first line, elevation on second
            var azLine = await _reader.ReadLineAsync(ct);
            var elLine = await _reader.ReadLineAsync(ct);

            if (azLine != null && double.TryParse(azLine, out var azimuth))
            {
                // Normalize azimuth to 0-360 (rotctld can return negative values like -75 for 285°)
                azimuth = ((azimuth % 360) + 360) % 360;

                var previousAzimuth = _currentAzimuth;
                _currentAzimuth = azimuth;

                // Determine if moving (azimuth changed since last poll)
                var wasMoving = _isMoving;
                _isMoving = Math.Abs(_currentAzimuth - previousAzimuth) > 0.5;

                // Clear target if we've reached it
                if (_targetAzimuth.HasValue && Math.Abs(_currentAzimuth - _targetAzimuth.Value) < 2.0)
                {
                    _targetAzimuth = null;
                    _isMoving = false;
                }

                _logger.LogDebug("Rotator position: {Azimuth:F1}° (raw: {Raw}, moving: {IsMoving})",
                    _currentAzimuth, azLine, _isMoving);

                // Broadcast position update
                await BroadcastPositionAsync();

                _lastPositionUpdate = DateTime.UtcNow;
            }
            else
            {
                _logger.LogWarning("Failed to parse rotator position. Response: az={Az}, el={El}",
                    azLine ?? "(null)", elLine ?? "(null)");
            }
        }
        catch (IOException ex)
        {
            _logger.LogWarning("Lost connection to rotctld: {Message}", ex.Message);
            Disconnect();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error polling rotator position");
        }
    }

    private async Task BroadcastPositionAsync()
    {
        var evt = new RotatorPositionEvent(
            _settings.RotatorId,
            _currentAzimuth,
            _isMoving,
            _targetAzimuth
        );

        await _hubContext.Clients.All.OnRotatorPosition(evt);
    }

    /// <summary>
    /// Command the rotator to move to a target azimuth.
    /// Called from LogHub.
    /// </summary>
    public async Task SetPositionAsync(double targetAzimuth)
    {
        // Normalize to 0-360
        targetAzimuth = ((targetAzimuth % 360) + 360) % 360;

        _logger.LogInformation("Commanding rotator to {Azimuth}°", targetAzimuth);

        if (!_isConnected || _writer == null)
        {
            _logger.LogWarning("Cannot command rotator - not connected");

            // Still broadcast the target so UI updates
            _targetAzimuth = targetAzimuth;
            _isMoving = true;
            await BroadcastPositionAsync();
            return;
        }

        try
        {
            _targetAzimuth = targetAzimuth;
            _isMoving = true;

            // Send position command (P azimuth elevation)
            // Use 0 for elevation since we're doing azimuth-only
            await _writer.WriteLineAsync($"P {targetAzimuth:F1} 0");

            // Read response (RPRT 0 means success)
            var response = await _reader!.ReadLineAsync();

            if (response != null && response.StartsWith("RPRT") && !response.Contains("0"))
            {
                _logger.LogWarning("Rotator command failed: {Response}", response);
            }

            // Broadcast updated state
            await BroadcastPositionAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error commanding rotator");
            Disconnect();
        }
    }

    /// <summary>
    /// Stop the rotator.
    /// </summary>
    public async Task StopAsync()
    {
        _logger.LogInformation("Stopping rotator");

        if (!_isConnected || _writer == null)
        {
            _logger.LogWarning("Cannot stop rotator - not connected");
            return;
        }

        try
        {
            await _writer.WriteLineAsync("S");
            var response = await _reader!.ReadLineAsync();

            _isMoving = false;
            _targetAzimuth = null;

            await BroadcastPositionAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping rotator");
            Disconnect();
        }
    }

    /// <summary>
    /// Get current rotator status.
    /// </summary>
    public RotatorPositionEvent GetCurrentStatus()
    {
        return new RotatorPositionEvent(
            _settings.RotatorId,
            _currentAzimuth,
            _isMoving,
            _targetAzimuth
        );
    }

    /// <summary>
    /// Check if rotator is connected.
    /// </summary>
    public bool IsConnected => _isConnected;
}
