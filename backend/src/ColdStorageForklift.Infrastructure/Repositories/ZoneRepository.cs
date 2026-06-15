using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Core.Interfaces;
using ColdStorageForklift.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ColdStorageForklift.Infrastructure.Repositories;

public class ZoneRepository : IZoneRepository
{
    private readonly AppDbContext _context;

    public ZoneRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Zone?> GetByIdAsync(Guid id)
    {
        return await _context.Zones.FindAsync(id);
    }

    public async Task<IReadOnlyList<Zone>> GetAllAsync()
    {
        return await _context.Zones.ToListAsync();
    }

    public async Task<IReadOnlyList<Zone>> GetHighRiskZonesAsync()
    {
        return await _context.Zones.Where(z => z.IsHighRisk).ToListAsync();
    }

    public async Task<Zone> AddAsync(Zone zone)
    {
        _context.Zones.Add(zone);
        await _context.SaveChangesAsync();
        return zone;
    }

    public async Task UpdateAsync(Zone zone)
    {
        _context.Zones.Update(zone);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var zone = await _context.Zones.FindAsync(id);
        if (zone is not null)
        {
            _context.Zones.Remove(zone);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IReadOnlyList<ZoneObstacle>> GetObstaclesByZoneIdAsync(Guid zoneId)
    {
        return await _context.ZoneObstacles.Where(o => o.ZoneId == zoneId).ToListAsync();
    }

    public async Task<ZoneObstacle> AddObstacleAsync(ZoneObstacle obstacle)
    {
        _context.ZoneObstacles.Add(obstacle);
        await _context.SaveChangesAsync();
        return obstacle;
    }

    public async Task DeleteObstacleAsync(Guid obstacleId)
    {
        var obstacle = await _context.ZoneObstacles.FindAsync(obstacleId);
        if (obstacle is not null)
        {
            _context.ZoneObstacles.Remove(obstacle);
            await _context.SaveChangesAsync();
        }
    }
}
