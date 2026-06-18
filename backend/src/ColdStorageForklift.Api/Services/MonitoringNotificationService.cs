namespace ColdStorageForklift.Api.Services;

using ColdStorageForklift.Api.Hubs;
using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.SignalR;

public class MonitoringNotificationService : IMonitoringNotificationService
{
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly IBlindSpotService _blindSpotService;

    public MonitoringNotificationService(
        IHubContext<MonitoringHub> hubContext,
        IBlindSpotService blindSpotService)
    {
        _hubContext = hubContext;
        _blindSpotService = blindSpotService;
    }

    public async Task BroadcastForkliftPositionUpdateAsync(Guid forkliftId, Forklift? forklift, double x, double y, double direction, double speed)
    {
        await _hubContext.Clients.Group("monitoring")
            .SendAsync("ForkliftPositionUpdate", new
            {
                id = forkliftId,
                code = forklift?.Code,
                model = forklift?.Model,
                currentPositionX = x,
                currentPositionY = y,
                direction = direction,
                speed = speed,
                status = forklift?.Status,
                lastPositionUpdate = DateTime.UtcNow
            });
    }

    public async Task BroadcastPersonnelPositionUpdateAsync(Guid personnelId, Personnel? personnel, double x, double y)
    {
        await _hubContext.Clients.Group("monitoring")
            .SendAsync("PersonnelPositionUpdate", new
            {
                id = personnelId,
                name = personnel?.Name,
                badge = personnel?.Badge,
                currentPositionX = x,
                currentPositionY = y,
                status = personnel?.Status,
                lastPositionUpdate = DateTime.UtcNow
            });
    }

    public async Task BroadcastBlindSpotUpdateAsync(IEnumerable<BlindSpotZone> blindSpots)
    {
        var blindSpotDtos = new List<object>();

        foreach (var bs in blindSpots)
        {
            var personnelInBlindSpot = await _blindSpotService.IdentifyPersonnelInBlindSpotAsync(bs.ForkliftId);
            var personnelDtos = personnelInBlindSpot.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                badge = p.Badge,
                currentPositionX = p.CurrentPositionX,
                currentPositionY = p.CurrentPositionY,
                status = p.Status,
                lastPositionUpdate = p.LastPositionUpdate
            }).ToList();

            blindSpotDtos.Add(new
            {
                id = bs.Id,
                forkliftId = bs.ForkliftId,
                centerX = bs.CenterX,
                centerY = bs.CenterY,
                radius = bs.Radius,
                direction = bs.Direction,
                riskLevel = bs.RiskLevel,
                detectedAt = bs.DetectedAt,
                isActive = bs.IsActive,
                personnel = personnelDtos
            });
        }

        await _hubContext.Clients.Group("monitoring")
            .SendAsync("BlindSpotUpdate", blindSpotDtos);
    }
}
