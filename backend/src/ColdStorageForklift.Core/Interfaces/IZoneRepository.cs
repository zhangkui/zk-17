using ColdStorageForklift.Core.Entities;

namespace ColdStorageForklift.Core.Interfaces;

public interface IZoneRepository
{
    Task<Zone?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Zone>> GetAllAsync();
    Task<IReadOnlyList<Zone>> GetHighRiskZonesAsync();
    Task<Zone> AddAsync(Zone zone);
    Task UpdateAsync(Zone zone);
    Task DeleteAsync(Guid id);
    Task<IReadOnlyList<ZoneObstacle>> GetObstaclesByZoneIdAsync(Guid zoneId);
    Task<ZoneObstacle> AddObstacleAsync(ZoneObstacle obstacle);
    Task DeleteObstacleAsync(Guid obstacleId);
}
