using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Core.Interfaces;
using ColdStorageForklift.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ColdStorageForklift.Infrastructure.Repositories;

public class EventLogRepository : IEventLogRepository
{
    private readonly AppDbContext _context;

    public EventLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<EventLog?> GetByIdAsync(Guid id)
    {
        return await _context.EventLogs.FindAsync(id);
    }

    public async Task<IReadOnlyList<EventLog>> GetByTypeAsync(EventLogType type)
    {
        return await _context.EventLogs
            .Where(e => e.Type == type)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<EventLog>> GetByTimeRangeAsync(DateTime from, DateTime to)
    {
        return await _context.EventLogs
            .Where(e => e.CreatedAt >= from && e.CreatedAt <= to)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<EventLog>> GetByEntityIdAsync(Guid entityId)
    {
        return await _context.EventLogs
            .Where(e => e.RelatedEntityId == entityId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<EventLog>> GetRecentAsync(int count)
    {
        return await _context.EventLogs
            .OrderByDescending(e => e.CreatedAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<EventLog> AddAsync(EventLog eventLog)
    {
        _context.EventLogs.Add(eventLog);
        await _context.SaveChangesAsync();
        return eventLog;
    }

    public async Task<int> GetCountByTypeAsync(EventLogType type)
    {
        return await _context.EventLogs.CountAsync(e => e.Type == type);
    }
}
