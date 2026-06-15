using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Core.Interfaces;
using ColdStorageForklift.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ColdStorageForklift.Infrastructure.Repositories;

public class PositionRepository : IPositionRepository
{
    private readonly AppDbContext _context;

    public PositionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PositionRecord?> GetByIdAsync(Guid id)
    {
        return await _context.PositionRecords.FindAsync(id);
    }

    public async Task<IReadOnlyList<PositionRecord>> GetByEntityIdAsync(Guid entityId)
    {
        return await _context.PositionRecords
            .Where(p => p.EntityId == entityId)
            .OrderByDescending(p => p.RecordedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<PositionRecord>> GetByTimeRangeAsync(DateTime from, DateTime to)
    {
        return await _context.PositionRecords
            .Where(p => p.RecordedAt >= from && p.RecordedAt <= to)
            .OrderByDescending(p => p.RecordedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<PositionRecord>> GetLatestByEntityTypeAsync(PositionEntityType entityType, int count)
    {
        return await _context.PositionRecords
            .Where(p => p.EntityType == entityType)
            .OrderByDescending(p => p.RecordedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<PositionRecord> AddAsync(PositionRecord record)
    {
        _context.PositionRecords.Add(record);
        await _context.SaveChangesAsync();
        return record;
    }

    public async Task<IReadOnlyList<PositionRecord>> AddBatchAsync(IEnumerable<PositionRecord> records)
    {
        await _context.PositionRecords.AddRangeAsync(records);
        await _context.SaveChangesAsync();
        return records.ToList();
    }

    public async Task<IReadOnlyList<Forklift>> GetAllForkliftsAsync()
    {
        return await _context.Forklifts.ToListAsync();
    }

    public async Task<IReadOnlyList<Personnel>> GetAllPersonnelAsync()
    {
        return await _context.Personnel.ToListAsync();
    }

    public async Task<Forklift?> GetForkliftByIdAsync(Guid id)
    {
        return await _context.Forklifts.FindAsync(id);
    }

    public async Task<Personnel?> GetPersonnelByIdAsync(Guid id)
    {
        return await _context.Personnel.FindAsync(id);
    }

    public async Task UpdateForkliftPositionAsync(Guid forkliftId, double x, double y, double speed, double direction)
    {
        var forklift = await _context.Forklifts.FindAsync(forkliftId);
        if (forklift is not null)
        {
            forklift.CurrentPositionX = x;
            forklift.CurrentPositionY = y;
            forklift.Speed = speed;
            forklift.Direction = direction;
            forklift.LastPositionUpdate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task UpdatePersonnelPositionAsync(Guid personnelId, double x, double y)
    {
        var personnel = await _context.Personnel.FindAsync(personnelId);
        if (personnel is not null)
        {
            personnel.CurrentPositionX = x;
            personnel.CurrentPositionY = y;
            personnel.LastPositionUpdate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
