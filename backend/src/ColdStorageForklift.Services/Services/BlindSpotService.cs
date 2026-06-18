namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface IBlindSpotService
{
    Task<BlindSpotZone> CalculateBlindSpotAsync(Guid forkliftId);
    Task<IEnumerable<BlindSpotZone>> GetActiveBlindSpotsAsync();
    Task<BlindSpotZone?> GetForkliftBlindSpotAsync(Guid forkliftId);
    Task<List<Personnel>> IdentifyPersonnelInBlindSpotAsync(Guid forkliftId);
    Task UpdateBlindSpotRiskLevelAsync(Guid blindSpotId, RiskLevel riskLevel);
    Task RecalculateAllBlindSpotsAsync();
}

public class BlindSpotService : IBlindSpotService
{
    private readonly IRepository<BlindSpotZone> _blindSpotRepository;
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Personnel> _personnelRepository;
    private readonly IRepository<Zone> _zoneRepository;

    public BlindSpotService(
        IRepository<BlindSpotZone> blindSpotRepository,
        IRepository<Forklift> forkliftRepository,
        IRepository<Personnel> personnelRepository,
        IRepository<Zone> zoneRepository)
    {
        _blindSpotRepository = blindSpotRepository;
        _forkliftRepository = forkliftRepository;
        _personnelRepository = personnelRepository;
        _zoneRepository = zoneRepository;
    }

    public async Task<BlindSpotZone> CalculateBlindSpotAsync(Guid forkliftId)
    {
        var forklift = await _forkliftRepository.GetByIdAsync(forkliftId);
        if (forklift == null) throw new InvalidOperationException("Forklift not found");

        var existing = _blindSpotRepository.Query()
            .FirstOrDefault(b => b.ForkliftId == forkliftId && b.IsActive);

        var blindSpot = existing ?? new BlindSpotZone { Id = Guid.NewGuid(), ForkliftId = forkliftId };

        blindSpot.CenterX = forklift.CurrentPositionX;
        blindSpot.CenterY = forklift.CurrentPositionY;
        blindSpot.Radius = forklift.BlindSpotRadius;
        blindSpot.Direction = forklift.Direction;
        blindSpot.DetectedAt = DateTime.UtcNow;
        blindSpot.IsActive = true;

        var containingZone = _zoneRepository.Query()
            .FirstOrDefault(z =>
                forklift.CurrentPositionX >= z.PositionX &&
                forklift.CurrentPositionX <= z.PositionX + z.Width &&
                forklift.CurrentPositionY >= z.PositionY &&
                forklift.CurrentPositionY <= z.PositionY + z.Height);
        blindSpot.ZoneId = containingZone?.Id;

        var personnelInBlindSpot = await IdentifyPersonnelInBlindSpotAsync(forkliftId);
        blindSpot.RiskLevel = personnelInBlindSpot.Count switch
        {
            >= 3 => RiskLevel.Critical,
            >= 2 => RiskLevel.High,
            >= 1 => RiskLevel.Medium,
            _ => RiskLevel.Low
        };

        if (existing != null)
            await _blindSpotRepository.UpdateAsync(blindSpot);
        else
            await _blindSpotRepository.AddAsync(blindSpot);

        return blindSpot;
    }

    public async Task<IEnumerable<BlindSpotZone>> GetActiveBlindSpotsAsync()
    {
        return await Task.FromResult(_blindSpotRepository.Query().Where(b => b.IsActive).ToList());
    }

    public async Task<BlindSpotZone?> GetForkliftBlindSpotAsync(Guid forkliftId)
    {
        return await Task.FromResult(_blindSpotRepository.Query()
            .FirstOrDefault(b => b.ForkliftId == forkliftId && b.IsActive));
    }

    public async Task<List<Personnel>> IdentifyPersonnelInBlindSpotAsync(Guid forkliftId)
    {
        var forklift = await _forkliftRepository.GetByIdAsync(forkliftId);
        if (forklift == null) return new List<Personnel>();

        var allPersonnel = await _personnelRepository.GetAllAsync();
        var result = new List<Personnel>();

        foreach (var person in allPersonnel)
        {
            if (IsInBlindSpot(forklift, person))
                result.Add(person);
        }

        return result;
    }

    public async Task UpdateBlindSpotRiskLevelAsync(Guid blindSpotId, RiskLevel riskLevel)
    {
        var blindSpot = await _blindSpotRepository.GetByIdAsync(blindSpotId);
        if (blindSpot == null) return;

        blindSpot.RiskLevel = riskLevel;
        await _blindSpotRepository.UpdateAsync(blindSpot);
    }

    public async Task RecalculateAllBlindSpotsAsync()
    {
        var forklifts = await _forkliftRepository.GetAllAsync();
        foreach (var forklift in forklifts.Where(f => f.Status == ForkliftStatus.Online))
        {
            await CalculateBlindSpotAsync(forklift.Id);
        }
    }

    private bool IsInBlindSpot(Forklift forklift, Personnel person)
    {
        var dx = person.CurrentPositionX - forklift.CurrentPositionX;
        var dy = person.CurrentPositionY - forklift.CurrentPositionY;
        var distance = Math.Sqrt(dx * dx + dy * dy);

        if (distance > forklift.BlindSpotRadius) return false;

        var angleToPerson = Math.Atan2(dy, dx) * (180.0 / Math.PI);
        if (angleToPerson < 0) angleToPerson += 360;

        var rearDirection = (forklift.Direction + 180) % 360;
        var halfAngle = 60.0;

        var diff = Math.Abs(angleToPerson - rearDirection);
        if (diff > 180) diff = 360 - diff;

        return diff <= halfAngle;
    }
}
