using Microsoft.AspNetCore.SignalR;
using Log4YM.Contracts.Events;

namespace Log4YM.Server.Hubs;

public interface ILogHubClient
{
    Task OnCallsignFocused(CallsignFocusedEvent evt);
    Task OnCallsignLookedUp(CallsignLookedUpEvent evt);
    Task OnQsoLogged(QsoLoggedEvent evt);
    Task OnSpotReceived(SpotReceivedEvent evt);
    Task OnSpotSelected(SpotSelectedEvent evt);
    Task OnRotatorPosition(RotatorPositionEvent evt);
    Task OnRigStatus(RigStatusEvent evt);
    Task OnStationLocation(StationLocationEvent evt);
}

public class LogHub : Hub<ILogHubClient>
{
    private readonly ILogger<LogHub> _logger;

    public LogHub(ILogger<LogHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Client-to-server methods (called by frontend)

    public async Task FocusCallsign(CallsignFocusedEvent evt)
    {
        _logger.LogDebug("Callsign focused: {Callsign} from {Source}", evt.Callsign, evt.Source);
        await Clients.Others.OnCallsignFocused(evt);
    }

    public async Task SelectSpot(SpotSelectedEvent evt)
    {
        _logger.LogDebug("Spot selected: {DxCall} on {Frequency}", evt.DxCall, evt.Frequency);
        await Clients.Others.OnSpotSelected(evt);
    }

    public async Task CommandRotator(RotatorCommandEvent evt)
    {
        _logger.LogDebug("Rotator command: {Azimuth} from {Source}", evt.TargetAzimuth, evt.Source);
        // This would be handled by the rotator service
        // For now, just broadcast it
        await Clients.All.OnRotatorPosition(new RotatorPositionEvent(
            evt.RotatorId,
            evt.TargetAzimuth,
            true,
            evt.TargetAzimuth
        ));
    }
}

// Extension method for broadcasting events from services
public static class LogHubExtensions
{
    public static async Task BroadcastSpot(this IHubContext<LogHub, ILogHubClient> hub, SpotReceivedEvent evt)
    {
        await hub.Clients.All.OnSpotReceived(evt);
    }

    public static async Task BroadcastQso(this IHubContext<LogHub, ILogHubClient> hub, QsoLoggedEvent evt)
    {
        await hub.Clients.All.OnQsoLogged(evt);
    }

    public static async Task BroadcastCallsignLookup(this IHubContext<LogHub, ILogHubClient> hub, CallsignLookedUpEvent evt)
    {
        await hub.Clients.All.OnCallsignLookedUp(evt);
    }

    public static async Task BroadcastRotatorPosition(this IHubContext<LogHub, ILogHubClient> hub, RotatorPositionEvent evt)
    {
        await hub.Clients.All.OnRotatorPosition(evt);
    }
}
