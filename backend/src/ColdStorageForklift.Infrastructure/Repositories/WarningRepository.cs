using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Core.Interfaces;
using ColdStorageForklift.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ColdStorageForklift.Infrastructure.Repositories;

public class WarningRepository : IWarningRepository
{
    private readonly AppDbContext _context;

    public WarningRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CollisionWarning?> GetByIdAsync(Guid id)
    {
        return await _context.CollisionWarnings.FindAsync(id);
    }

    public async Task<IReadOnlyList<CollisionWarning>> GetByZoneIdAsync(Guid zoneId)
    {
        return await _context.CollisionWarnings
            .Where(w => w.ZoneId == zoneId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<CollisionWarning>> GetByForkliftIdAsync(Guid forkliftId)
    {
        return await _context.CollisionWarnings
            .Where(w => w.ForkliftId == forkliftId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<CollisionWarning>> GetUnacknowledgedAsync()
    {
        return await _context.CollisionWarnings
            .Where(w => !w.IsAcknowledged)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<CollisionWarning>> GetByTimeRangeAsync(DateTime from, DateTime to)
    {
        return await _context.CollisionWarnings
            .Where(w => w.CreatedAt >= from && w.CreatedAt <= to)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<CollisionWarning>> GetByRiskLevelAsync(RiskLevel riskLevel)
    {
        return await _context.CollisionWarnings
            .Where(w => w.RiskLevel == riskLevel)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<CollisionWarning> AddAsync(CollisionWarning warning)
    {
        _context.CollisionWarnings.Add(warning);
        await _context.SaveChangesAsync();
        return warning;
    }

    public async Task AcknowledgeAsync(Guid warningId)
    {
        var warning = await _context.CollisionWarnings.FindAsync(warningId);
        if (warning is not null)
        {
            warning.IsAcknowledged = true;
            warning.AcknowledgedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<int> GetUnacknowledgedCountAsync()
    {
        return await _context.CollisionWarnings.CountAsync(w => !w.IsAcknowledged);
    }
}
