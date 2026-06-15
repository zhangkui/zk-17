using ColdStorageForklift.Core.Entities;

namespace ColdStorageForklift.Core.Interfaces;

public interface IWarningRepository
{
    Task<CollisionWarning?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<CollisionWarning>> GetByZoneIdAsync(Guid zoneId);
    Task<IReadOnlyList<CollisionWarning>> GetByForkliftIdAsync(Guid forkliftId);
    Task<IReadOnlyList<CollisionWarning>> GetUnacknowledgedAsync();
    Task<IReadOnlyList<CollisionWarning>> GetByTimeRangeAsync(DateTime from, DateTime to);
    Task<IReadOnlyList<CollisionWarning>> GetByRiskLevelAsync(RiskLevel riskLevel);
    Task<CollisionWarning> AddAsync(CollisionWarning warning);
    Task AcknowledgeAsync(Guid warningId);
    Task<int> GetUnacknowledgedCountAsync();
}
