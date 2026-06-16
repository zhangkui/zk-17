namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface IEventReplayService
{
    Task<EventReplayData> GetReplayDataAsync(DateTime startTime, DateTime endTime);
    Task<IEnumerable<EventLog>> GetEventsAsync(DateTime startTime, DateTime endTime);
    Task<EventLog> CreateEventLogAsync(EventLog eventLog);
    Task<IEnumerable<EventLog>> GetEventLogsByForkliftAsync(Guid forkliftId);
    Task<IEnumerable<EventLog>> GetEventLogsByPersonnelAsync(Guid personnelId);
    Task<IEnumerable<EventLog>> GetEventLogsByTeamAsync(Guid teamId, DateTime? startTime = null, DateTime? endTime = null);
}

public class EventReplayData
{
    public List<PositionRecord> PositionRecords { get; set; } = new();
    public List<CollisionWarning> CollisionWarnings { get; set; } = new();
    public List<BlindSpotZone> BlindSpotChanges { get; set; } = new();
}

public class ReplayEventItem
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class EventReplayService : IEventReplayService
{
    private readonly IRepository<PositionRecord> _positionRepository;
    private readonly IRepository<CollisionWarning> _warningRepository;
    private readonly IRepository<BlindSpotZone> _blindSpotRepository;
    private readonly IRepository<EventLog> _eventLogRepository;
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Personnel> _personnelRepository;

    public EventReplayService(
        IRepository<PositionRecord> positionRepository,
        IRepository<CollisionWarning> warningRepository,
        IRepository<BlindSpotZone> blindSpotRepository,
        IRepository<EventLog> eventLogRepository,
        IRepository<Forklift> forkliftRepository,
        IRepository<Personnel> personnelRepository)
    {
        _positionRepository = positionRepository;
        _warningRepository = warningRepository;
        _blindSpotRepository = blindSpotRepository;
        _eventLogRepository = eventLogRepository;
        _forkliftRepository = forkliftRepository;
        _personnelRepository = personnelRepository;
    }

    public async Task<EventReplayData> GetReplayDataAsync(DateTime startTime, DateTime endTime)
    {
        var positions = _positionRepository.Query()
            .Where(p => p.RecordedAt >= startTime && p.RecordedAt <= endTime)
            .OrderBy(p => p.RecordedAt)
            .ToList();

        var warnings = _warningRepository.Query()
            .Where(w => w.CreatedAt >= startTime && w.CreatedAt <= endTime)
            .OrderBy(w => w.CreatedAt)
            .ToList();

        var blindSpots = _blindSpotRepository.Query()
            .Where(b => b.DetectedAt >= startTime && b.DetectedAt <= endTime)
            .OrderBy(b => b.DetectedAt)
            .ToList();

        return await Task.FromResult(new EventReplayData
        {
            PositionRecords = positions,
            CollisionWarnings = warnings,
            BlindSpotChanges = blindSpots
        });
    }

    public async Task<IEnumerable<EventLog>> GetEventsAsync(DateTime startTime, DateTime endTime)
    {
        var eventLogs = _eventLogRepository.Query()
            .Where(e => e.OccurredAt >= startTime && e.OccurredAt <= endTime)
            .OrderByDescending(e => e.OccurredAt)
            .ToList();

        if (eventLogs.Count == 0)
        {
            var warnings = _warningRepository.Query()
                .Where(w => w.CreatedAt >= startTime && w.CreatedAt <= endTime)
                .ToList();

            foreach (var w in warnings)
            {
                var forklift = await _forkliftRepository.GetByIdAsync(w.ForkliftId);
                var personnel = w.PersonnelId.HasValue ? await _personnelRepository.GetByIdAsync(w.PersonnelId.Value) : null;

                var eventLog = new EventLog
                {
                    Id = Guid.NewGuid(),
                    EventType = EventType.Warning,
                    Severity = w.RiskLevel,
                    ZoneId = w.ZoneId,
                    ForkliftId = w.ForkliftId,
                    PersonnelId = w.PersonnelId,
                    TeamId = forklift?.TeamId,
                    Description = w.Message,
                    PositionX = w.ForkliftPositionX,
                    PositionY = w.ForkliftPositionY,
                    OccurredAt = w.CreatedAt
                };
                await _eventLogRepository.AddAsync(eventLog);
                eventLogs.Add(eventLog);
            }
        }

        return await Task.FromResult(eventLogs);
    }

    public async Task<EventLog> CreateEventLogAsync(EventLog eventLog)
    {
        eventLog.Id = Guid.NewGuid();
        eventLog.OccurredAt = DateTime.UtcNow;
        return await _eventLogRepository.AddAsync(eventLog);
    }

    public async Task<IEnumerable<EventLog>> GetEventLogsByForkliftAsync(Guid forkliftId)
    {
        return await Task.FromResult(_eventLogRepository.Query()
            .Where(e => e.ForkliftId == forkliftId)
            .OrderByDescending(e => e.OccurredAt)
            .ToList());
    }

    public async Task<IEnumerable<EventLog>> GetEventLogsByPersonnelAsync(Guid personnelId)
    {
        return await Task.FromResult(_eventLogRepository.Query()
            .Where(e => e.PersonnelId == personnelId)
            .OrderByDescending(e => e.OccurredAt)
            .ToList());
    }

    public async Task<IEnumerable<EventLog>> GetEventLogsByTeamAsync(Guid teamId, DateTime? startTime = null, DateTime? endTime = null)
    {
        var query = _eventLogRepository.Query().Where(e => e.TeamId == teamId);

        if (startTime.HasValue)
            query = query.Where(e => e.OccurredAt >= startTime.Value);

        if (endTime.HasValue)
            query = query.Where(e => e.OccurredAt <= endTime.Value);

        return await Task.FromResult(query.OrderByDescending(e => e.OccurredAt).ToList());
    }
}
