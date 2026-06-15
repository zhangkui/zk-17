namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface IPositionService
{
    Task RecordForkliftPositionAsync(Guid forkliftId, double x, double y, double direction, double speed);
    Task RecordPersonnelPositionAsync(Guid personnelId, double x, double y);
    Task<IEnumerable<Forklift>> GetForkliftPositionsAsync();
    Task<IEnumerable<Personnel>> GetPersonnelPositionsAsync();
    Task<IEnumerable<PositionRecord>> GetPositionHistoryAsync(DateTime startTime, DateTime endTime, PositionEntityType? entityType = null, Guid? entityId = null);
}

public class PositionService : IPositionService
{
    private readonly IRepository<PositionRecord> _positionRepository;
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Personnel> _personnelRepository;

    public PositionService(
        IRepository<PositionRecord> positionRepository,
        IRepository<Forklift> forkliftRepository,
        IRepository<Personnel> personnelRepository)
    {
        _positionRepository = positionRepository;
        _forkliftRepository = forkliftRepository;
        _personnelRepository = personnelRepository;
    }

    public async Task RecordForkliftPositionAsync(Guid forkliftId, double x, double y, double direction, double speed)
    {
        var record = new PositionRecord
        {
            Id = Guid.NewGuid(),
            EntityType = PositionEntityType.Forklift,
            EntityId = forkliftId,
            PositionX = x,
            PositionY = y,
            Direction = direction,
            Speed = speed,
            RecordedAt = DateTime.UtcNow
        };
        await _positionRepository.AddAsync(record);

        var forklift = await _forkliftRepository.GetByIdAsync(forkliftId);
        if (forklift != null)
        {
            forklift.CurrentPositionX = x;
            forklift.CurrentPositionY = y;
            forklift.Direction = direction;
            forklift.Speed = speed;
            forklift.LastPositionUpdate = DateTime.UtcNow;
            await _forkliftRepository.UpdateAsync(forklift);
        }
    }

    public async Task RecordPersonnelPositionAsync(Guid personnelId, double x, double y)
    {
        var record = new PositionRecord
        {
            Id = Guid.NewGuid(),
            EntityType = PositionEntityType.Personnel,
            EntityId = personnelId,
            PositionX = x,
            PositionY = y,
            RecordedAt = DateTime.UtcNow
        };
        await _positionRepository.AddAsync(record);

        var personnel = await _personnelRepository.GetByIdAsync(personnelId);
        if (personnel != null)
        {
            personnel.CurrentPositionX = x;
            personnel.CurrentPositionY = y;
            personnel.LastPositionUpdate = DateTime.UtcNow;
            await _personnelRepository.UpdateAsync(personnel);
        }
    }

    public async Task<IEnumerable<Forklift>> GetForkliftPositionsAsync()
    {
        return await _forkliftRepository.GetAllAsync();
    }

    public async Task<IEnumerable<Personnel>> GetPersonnelPositionsAsync()
    {
        return await _personnelRepository.GetAllAsync();
    }

    public async Task<IEnumerable<PositionRecord>> GetPositionHistoryAsync(DateTime startTime, DateTime endTime, PositionEntityType? entityType = null, Guid? entityId = null)
    {
        var query = _positionRepository.Query()
            .Where(p => p.RecordedAt >= startTime && p.RecordedAt <= endTime);

        if (entityType.HasValue)
            query = query.Where(p => p.EntityType == entityType.Value);

        if (entityId.HasValue)
            query = query.Where(p => p.EntityId == entityId.Value);

        return await Task.FromResult(query.OrderBy(p => p.RecordedAt).ToList());
    }
}
