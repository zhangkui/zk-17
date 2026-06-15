using ColdStorageForklift.Core.Entities;

namespace ColdStorageForklift.Core.Interfaces;

public interface IPositionRepository
{
    Task<PositionRecord?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<PositionRecord>> GetByEntityIdAsync(Guid entityId);
    Task<IReadOnlyList<PositionRecord>> GetByTimeRangeAsync(DateTime from, DateTime to);
    Task<IReadOnlyList<PositionRecord>> GetLatestByEntityTypeAsync(PositionEntityType entityType, int count);
    Task<PositionRecord> AddAsync(PositionRecord record);
    Task<IReadOnlyList<PositionRecord>> AddBatchAsync(IEnumerable<PositionRecord> records);
    Task<IReadOnlyList<Forklift>> GetAllForkliftsAsync();
    Task<IReadOnlyList<Personnel>> GetAllPersonnelAsync();
    Task<Forklift?> GetForkliftByIdAsync(Guid id);
    Task<Personnel?> GetPersonnelByIdAsync(Guid id);
    Task UpdateForkliftPositionAsync(Guid forkliftId, double x, double y, double speed, double direction);
    Task UpdatePersonnelPositionAsync(Guid personnelId, double x, double y);
}
