namespace ColdStorageForklift.Api.Hubs;

using ColdStorageForklift.Core.Entities;
using Microsoft.AspNetCore.SignalR;

public class MonitoringHub : Hub
{
    private readonly ICollisionWarningService _warningService;
    private readonly IPositionService _positionService;
    private readonly IBlindSpotService _blindSpotService;

    public MonitoringHub(
        ICollisionWarningService warningService,
        IPositionService positionService,
        IBlindSpotService blindSpotService)
    {
        _warningService = warningService;
        _positionService = positionService;
        _blindSpotService = blindSpotService;
    }

    public async Task JoinMonitoringGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "monitoring");
    }

    public async Task LeaveMonitoringGroup()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "monitoring");
    }

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "monitoring");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "monitoring");
        await base.OnDisconnectedAsync(exception);
    }
}
