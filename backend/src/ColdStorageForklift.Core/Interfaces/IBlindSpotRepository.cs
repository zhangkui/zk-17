using ColdStorageForklift.Core.Entities;

namespace ColdStorageForklift.Core.Interfaces;

public interface IBlindSpotRepository
{
    Task<BlindSpotZone?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<BlindSpotZone>> GetByZoneIdAsync(Guid zoneId);
    Task<IReadOnlyList<BlindSpotZone>> GetByForkliftIdAsync(Guid forkliftId);
    Task<IReadOnlyList<BlindSpotZone>> GetByRiskLevelAsync(RiskLevel riskLevel);
    Task<IReadOnlyList<BlindSpotZone>> GetActiveAsync();
    Task<IReadOnlyList<BlindSpotZone>> GetAllAsync();
    Task<BlindSpotZone> AddAsync(BlindSpotZone blindSpot);
    Task UpdateAsync(BlindSpotZone blindSpot);
    Task DeleteAsync(Guid id);
}
