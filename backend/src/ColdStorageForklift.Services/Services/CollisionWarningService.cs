namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface ICollisionWarningService
{
    Task<CollisionWarning?> GenerateWarningAsync(Guid forkliftId, Guid? personnelId, WarningType warningType, double distance);
    Task<CollisionWarning?> AcknowledgeWarningAsync(Guid warningId, string acknowledgedBy);
    Task<IEnumerable<CollisionWarning>> GetActiveWarningsAsync();
    Task<CollisionWarning?> GetWarningByIdAsync(Guid id);
    Task<IEnumerable<CollisionWarning>> GetWarningHistoryAsync(DateTime? startTime = null, DateTime? endTime = null);
    Task CheckAndGenerateWarningsAsync();
}

public class CollisionWarningService : ICollisionWarningService
{
    private readonly IRepository<CollisionWarning> _warningRepository;
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Personnel> _personnelRepository;

    public CollisionWarningService(
        IRepository<CollisionWarning> warningRepository,
        IRepository<Forklift> forkliftRepository,
        IRepository<Personnel> personnelRepository)
    {
        _warningRepository = warningRepository;
        _forkliftRepository = forkliftRepository;
        _personnelRepository = personnelRepository;
    }

    public async Task<CollisionWarning?> GenerateWarningAsync(Guid forkliftId, Guid? personnelId, WarningType warningType, double distance)
    {
        var riskLevel = distance switch
        {
            < 3 => RiskLevel.Critical,
            < 5 => RiskLevel.High,
            < 8 => RiskLevel.Medium,
            < 12 => RiskLevel.Low,
            _ => (RiskLevel?)null
        };

        if (riskLevel == null) return null;

        var forklift = await _forkliftRepository.GetByIdAsync(forkliftId);
        if (forklift == null) return null;

        var warning = new CollisionWarning
        {
            Id = Guid.NewGuid(),
            ForkliftId = forkliftId,
            PersonnelId = personnelId,
            WarningType = warningType,
            RiskLevel = riskLevel.Value,
            Distance = distance,
            ForkliftPositionX = forklift.CurrentPositionX,
            ForkliftPositionY = forklift.CurrentPositionY,
            Message = BuildWarningMessage(warningType, riskLevel.Value, distance),
            IsAcknowledged = false,
            CreatedAt = DateTime.UtcNow
        };

        if (personnelId.HasValue)
        {
            var personnel = await _personnelRepository.GetByIdAsync(personnelId.Value);
            if (personnel != null)
            {
                warning.PersonnelPositionX = personnel.CurrentPositionX;
                warning.PersonnelPositionY = personnel.CurrentPositionY;
            }
        }

        return await _warningRepository.AddAsync(warning);
    }

    public async Task<CollisionWarning?> AcknowledgeWarningAsync(Guid warningId, string acknowledgedBy)
    {
        var warning = await _warningRepository.GetByIdAsync(warningId);
        if (warning == null) return null;

        warning.IsAcknowledged = true;
        warning.AcknowledgedBy = acknowledgedBy;
        warning.AcknowledgedAt = DateTime.UtcNow;
        await _warningRepository.UpdateAsync(warning);
        return warning;
    }

    public async Task<IEnumerable<CollisionWarning>> GetActiveWarningsAsync()
    {
        return await Task.FromResult(_warningRepository.Query()
            .Where(w => !w.IsAcknowledged)
            .OrderByDescending(w => w.RiskLevel)
            .ThenByDescending(w => w.CreatedAt)
            .ToList());
    }

    public async Task<CollisionWarning?> GetWarningByIdAsync(Guid id)
    {
        return await _warningRepository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<CollisionWarning>> GetWarningHistoryAsync(DateTime? startTime = null, DateTime? endTime = null)
    {
        var query = _warningRepository.Query();

        if (startTime.HasValue)
            query = query.Where(w => w.CreatedAt >= startTime.Value);

        if (endTime.HasValue)
            query = query.Where(w => w.CreatedAt <= endTime.Value);

        return await Task.FromResult(query.OrderByDescending(w => w.CreatedAt).ToList());
    }

    public async Task CheckAndGenerateWarningsAsync()
    {
        var forklifts = (await _forkliftRepository.GetAllAsync()).Where(f => f.Status == ForkliftStatus.Online);
        var personnel = await _personnelRepository.GetAllAsync();

        foreach (var forklift in forklifts)
        {
            foreach (var person in personnel.Where(p => p.Status == PersonnelStatus.Online))
            {
                var distance = CalculateDistance(forklift.CurrentPositionX, forklift.CurrentPositionY,
                    person.CurrentPositionX, person.CurrentPositionY);

                if (distance < 12)
                {
                    await GenerateWarningAsync(forklift.Id, person.Id, WarningType.PersonForkliftApproach, distance);
                }
            }

            foreach (var otherForklift in forklifts.Where(f => f.Id != forklift.Id))
            {
                var distance = CalculateDistance(forklift.CurrentPositionX, forklift.CurrentPositionY,
                    otherForklift.CurrentPositionX, otherForklift.CurrentPositionY);

                if (distance < 12)
                {
                    await GenerateWarningAsync(forklift.Id, null, WarningType.VehicleCollision, distance);
                }
            }
        }
    }

    private double CalculateDistance(double x1, double y1, double x2, double y2)
    {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    private string BuildWarningMessage(WarningType type, RiskLevel level, double distance)
    {
        var levelText = level switch
        {
            RiskLevel.Critical => "极高风险",
            RiskLevel.High => "高风险",
            RiskLevel.Medium => "中风险",
            RiskLevel.Low => "低风险",
            _ => "未知"
        };

        var typeText = type switch
        {
            WarningType.PersonForkliftApproach => "人员接近",
            WarningType.VehicleCollision => "车辆碰撞",
            WarningType.BlindSpotIntrusion => "盲区入侵",
            _ => "未知"
        };

        return $"{levelText}：{typeText}，距离 {distance:F1}m";
    }
}
