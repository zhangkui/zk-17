using ColdStorageForklift.Core.Entities;

namespace ColdStorageForklift.Core.Interfaces;

public interface IEventLogRepository
{
    Task<EventLog?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<EventLog>> GetByEventTypeAsync(EventType eventType);
    Task<IReadOnlyList<EventLog>> GetByTimeRangeAsync(DateTime from, DateTime to);
    Task<IReadOnlyList<EventLog>> GetByZoneIdAsync(Guid zoneId);
    Task<IReadOnlyList<EventLog>> GetByForkliftIdAsync(Guid forkliftId);
    Task<IReadOnlyList<EventLog>> GetRecentAsync(int count);
    Task<EventLog> AddAsync(EventLog eventLog);
    Task<int> GetCountByEventTypeAsync(EventType eventType);
    Task<Dictionary<int, int>> GetHourlyDistributionAsync(DateTime from, DateTime to);
}
