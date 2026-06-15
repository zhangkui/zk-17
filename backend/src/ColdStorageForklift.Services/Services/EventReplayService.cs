namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface IEventReplayService
{
    Task<EventReplayData> GetReplayDataAsync(DateTime startTime, DateTime endTime);
    Task<IEnumerable<ReplayEventItem>> GetEventsAsync(DateTime startTime, DateTime endTime);
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

    public EventReplayService(
        IRepository<PositionRecord> positionRepository,
        IRepository<CollisionWarning> warningRepository,
        IRepository<BlindSpotZone> blindSpotRepository)
    {
        _positionRepository = positionRepository;
        _warningRepository = warningRepository;
        _blindSpotRepository = blindSpotRepository;
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

    public async Task<IEnumerable<ReplayEventItem>> GetEventsAsync(DateTime startTime, DateTime endTime)
    {
        var events = new List<ReplayEventItem>();

        var warnings = _warningRepository.Query()
            .Where(w => w.CreatedAt >= startTime && w.CreatedAt <= endTime)
            .ToList();

        foreach (var w in warnings)
        {
            events.Add(new ReplayEventItem
            {
                Id = w.Id,
                EventType = "CollisionWarning",
                Description = w.Message,
                Timestamp = w.CreatedAt,
                Metadata = new Dictionary<string, object>
                {
                    { "RiskLevel", w.RiskLevel.ToString() },
                    { "WarningType", w.WarningType.ToString() },
                    { "Distance", w.Distance },
                    { "ForkliftId", w.ForkliftId },
                    { "IsAcknowledged", w.IsAcknowledged }
                }
            });
        }

        var blindSpots = _blindSpotRepository.Query()
            .Where(b => b.DetectedAt >= startTime && b.DetectedAt <= endTime)
            .ToList();

        foreach (var b in blindSpots)
        {
            events.Add(new ReplayEventItem
            {
                Id = b.Id,
                EventType = "BlindSpotChange",
                Description = $"盲区变化 - 叉车{b.ForkliftId} 风险等级:{b.RiskLevel}",
                Timestamp = b.DetectedAt,
                Metadata = new Dictionary<string, object>
                {
                    { "ForkliftId", b.ForkliftId },
                    { "RiskLevel", b.RiskLevel.ToString() },
                    { "IsActive", b.IsActive }
                }
            });
        }

        return await Task.FromResult(events.OrderBy(e => e.Timestamp).ToList());
    }
}
