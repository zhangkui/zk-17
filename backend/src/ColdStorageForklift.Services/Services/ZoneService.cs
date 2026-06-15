namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface IZoneService
{
    Task<Zone> CreateZoneAsync(Zone zone);
    Task<Zone> UpdateZoneAsync(Zone zone);
    Task DeleteZoneAsync(Guid id);
    Task<Zone?> GetZoneByIdAsync(Guid id);
    Task<IEnumerable<Zone>> GetAllZonesAsync();
    Task<Zone?> GetZoneWithObstaclesAsync(Guid id);
}

public class ZoneService : IZoneService
{
    private readonly IRepository<Zone> _zoneRepository;
    private readonly IRepository<ZoneObstacle> _obstacleRepository;

    public ZoneService(IRepository<Zone> zoneRepository, IRepository<ZoneObstacle> obstacleRepository)
    {
        _zoneRepository = zoneRepository;
        _obstacleRepository = obstacleRepository;
    }

    public async Task<Zone> CreateZoneAsync(Zone zone)
    {
        zone.Id = Guid.NewGuid();
        zone.CreatedAt = DateTime.UtcNow;
        zone.UpdatedAt = DateTime.UtcNow;
        return await _zoneRepository.AddAsync(zone);
    }

    public async Task<Zone> UpdateZoneAsync(Zone zone)
    {
        zone.UpdatedAt = DateTime.UtcNow;
        await _zoneRepository.UpdateAsync(zone);
        return zone;
    }

    public async Task DeleteZoneAsync(Guid id)
    {
        var zone = await _zoneRepository.GetByIdAsync(id);
        if (zone != null) await _zoneRepository.DeleteAsync(zone);
    }

    public async Task<Zone?> GetZoneByIdAsync(Guid id)
    {
        return await _zoneRepository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<Zone>> GetAllZonesAsync()
    {
        return await _zoneRepository.GetAllAsync();
    }

    public async Task<Zone?> GetZoneWithObstaclesAsync(Guid id)
    {
        var zone = await _zoneRepository.GetByIdAsync(id);
        if (zone == null) return null;
        var obstacles = _obstacleRepository.Query().Where(o => o.ZoneId == id).ToList();
        return zone;
    }
}
