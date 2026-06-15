using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Core.Interfaces;
using ColdStorageForklift.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ColdStorageForklift.Infrastructure.Repositories;

public class BlindSpotRepository : IBlindSpotRepository
{
    private readonly AppDbContext _context;

    public BlindSpotRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<BlindSpotZone?> GetByIdAsync(Guid id)
    {
        return await _context.BlindSpotZones.FindAsync(id);
    }

    public async Task<IReadOnlyList<BlindSpotZone>> GetByZoneIdAsync(Guid zoneId)
    {
        return await _context.BlindSpotZones.Where(b => b.ZoneId == zoneId).ToListAsync();
    }

    public async Task<IReadOnlyList<BlindSpotZone>> GetByForkliftIdAsync(Guid forkliftId)
    {
        return await _context.BlindSpotZones.Where(b => b.ForkliftId == forkliftId).ToListAsync();
    }

    public async Task<IReadOnlyList<BlindSpotZone>> GetBySeverityAsync(BlindSpotSeverity severity)
    {
        return await _context.BlindSpotZones.Where(b => b.Severity == severity).ToListAsync();
    }

    public async Task<IReadOnlyList<BlindSpotZone>> GetAllAsync()
    {
        return await _context.BlindSpotZones.ToListAsync();
    }

    public async Task<BlindSpotZone> AddAsync(BlindSpotZone blindSpot)
    {
        _context.BlindSpotZones.Add(blindSpot);
        await _context.SaveChangesAsync();
        return blindSpot;
    }

    public async Task UpdateAsync(BlindSpotZone blindSpot)
    {
        _context.BlindSpotZones.Update(blindSpot);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var blindSpot = await _context.BlindSpotZones.FindAsync(id);
        if (blindSpot is not null)
        {
            _context.BlindSpotZones.Remove(blindSpot);
            await _context.SaveChangesAsync();
        }
    }
}
