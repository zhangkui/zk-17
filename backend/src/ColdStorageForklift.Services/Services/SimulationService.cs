namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface ISimulationService
{
    Task GenerateSimulationDataAsync();
}

public class SimulationService : ISimulationService
{
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Personnel> _personnelRepository;
    private readonly IRepository<Zone> _zoneRepository;
    private readonly IRepository<CollisionWarning> _warningRepository;
    private readonly IPositionService _positionService;
    private readonly Random _random = new();

    public SimulationService(
        IRepository<Forklift> forkliftRepository,
        IRepository<Personnel> personnelRepository,
        IRepository<Zone> zoneRepository,
        IRepository<CollisionWarning> warningRepository,
        IPositionService positionService)
    {
        _forkliftRepository = forkliftRepository;
        _personnelRepository = personnelRepository;
        _zoneRepository = zoneRepository;
        _warningRepository = warningRepository;
        _positionService = positionService;
    }

    public async Task GenerateSimulationDataAsync()
    {
        var forklifts = (await _forkliftRepository.GetAllAsync()).Where(f => f.Status == ForkliftStatus.Online).ToList();
        var personnel = (await _personnelRepository.GetAllAsync()).Where(p => p.Status == PersonnelStatus.Online).ToList();
        var zones = (await _zoneRepository.GetAllAsync()).ToList();

        foreach (var forklift in forklifts)
        {
            var newX = Math.Max(0, Math.Min(700, forklift.CurrentPositionX + _random.Next(-15, 16)));
            var newY = Math.Max(0, Math.Min(400, forklift.CurrentPositionY + _random.Next(-15, 16)));
            var direction = (forklift.Direction + _random.Next(-30, 31) + 360) % 360;
            var speed = _random.Next(0, 51) / 10.0;

            await _positionService.RecordForkliftPositionAsync(forklift.Id, newX, newY, direction, speed);
        }

        foreach (var person in personnel)
        {
            var newX = Math.Max(0, Math.Min(700, person.CurrentPositionX + _random.Next(-8, 9)));
            var newY = Math.Max(0, Math.Min(400, person.CurrentPositionY + _random.Next(-8, 9)));

            await _positionService.RecordPersonnelPositionAsync(person.Id, newX, newY);
        }

        if (_random.Next(0, 10) < 3 && forklifts.Count > 0 && personnel.Count > 0)
        {
            var forklift = forklifts[_random.Next(forklifts.Count)];
            var person = personnel[_random.Next(personnel.Count)];
            var zone = zones.Count > 0 ? zones[_random.Next(zones.Count)] : null;

            var distance = _random.Next(5, 31) / 10.0;
            var riskLevel = distance switch
            {
                < 1.0 => RiskLevel.Critical,
                < 2.0 => RiskLevel.High,
                < 3.0 => RiskLevel.Medium,
                _ => RiskLevel.Low
            };

            var warningType = _random.Next(0, 3) switch
            {
                0 => WarningType.PersonForkliftApproach,
                1 => WarningType.VehicleCollision,
                _ => WarningType.BlindSpotIntrusion
            };

            var warning = new CollisionWarning
            {
                Id = Guid.NewGuid(),
                ForkliftId = forklift.Id,
                PersonnelId = person.Id,
                ZoneId = zone?.Id,
                WarningType = warningType,
                RiskLevel = riskLevel,
                Distance = distance,
                ForkliftPositionX = forklift.CurrentPositionX,
                ForkliftPositionY = forklift.CurrentPositionY,
                PersonnelPositionX = person.CurrentPositionX,
                PersonnelPositionY = person.CurrentPositionY,
                Message = GetWarningMessage(warningType, riskLevel),
                IsAcknowledged = false,
                CreatedAt = DateTime.UtcNow
            };

            await _warningRepository.AddAsync(warning);
        }
    }

    private static string GetWarningMessage(WarningType type, RiskLevel level)
    {
        var typeMsg = type switch
        {
            WarningType.PersonForkliftApproach => "人车接近预警",
            WarningType.VehicleCollision => "车辆碰撞预警",
            WarningType.BlindSpotIntrusion => "盲区入侵预警",
            _ => "安全预警"
        };

        var levelMsg = level switch
        {
            RiskLevel.Critical => "极高风险",
            RiskLevel.High => "高风险",
            RiskLevel.Medium => "中风险",
            _ => "低风险"
        };

        return $"{levelMsg}：{typeMsg}";
    }
}
