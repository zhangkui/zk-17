namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;

public interface IMonitoringNotificationService
{
    Task BroadcastForkliftPositionUpdateAsync(Guid forkliftId, Forklift? forklift, double x, double y, double direction, double speed);
    Task BroadcastPersonnelPositionUpdateAsync(Guid personnelId, Personnel? personnel, double x, double y);
    Task BroadcastBlindSpotUpdateAsync(IEnumerable<BlindSpotZone> blindSpots);
}
