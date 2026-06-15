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

    public async Task<IReadOnlyList<EventLog>> GetByEventTypeAsync(EventType eventType)
    {
        return await _context.EventLogs
            .Where(e => e.EventType == eventType)
            .OrderByDescending(e => e.OccurredAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<EventLog>> GetByTimeRangeAsync(DateTime from, DateTime to)
    {
        return await _context.EventLogs
            .Where(e => e.OccurredAt >= from && e.OccurredAt <= to)
            .OrderByDescending(e => e.OccurredAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<EventLog>> GetByZoneIdAsync(Guid zoneId)
    {
        return await _context.EventLogs
            .Where(e => e.ZoneId == zoneId)
            .OrderByDescending(e => e.OccurredAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<EventLog>> GetByForkliftIdAsync(Guid forkliftId)
    {
        return await _context.EventLogs
            .Where(e => e.ForkliftId == forkliftId)
            .OrderByDescending(e => e.OccurredAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<EventLog>> GetRecentAsync(int count)
    {
        return await _context.EventLogs
            .OrderByDescending(e => e.OccurredAt)
            .Take(count)
            .ToListAsync();
    }

    public async Task<EventLog> AddAsync(EventLog eventLog)
    {
        _context.EventLogs.Add(eventLog);
        await _context.SaveChangesAsync();
        return eventLog;
    }

    public async Task<int> GetCountByEventTypeAsync(EventType eventType)
    {
        return await _context.EventLogs.CountAsync(e => e.EventType == eventType);
    }

    public async Task<Dictionary<int, int>> GetHourlyDistributionAsync(DateTime from, DateTime to)
    {
        return await _context.EventLogs
            .Where(e => e.OccurredAt >= from && e.OccurredAt <= to)
            .GroupBy(e => e.OccurredAt.Hour)
            .Select(g => new { Hour = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Hour, x => x.Count);
    }
}
