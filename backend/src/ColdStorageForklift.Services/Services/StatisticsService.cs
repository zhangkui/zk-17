namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface IStatisticsService
{
    Task<List<HighRiskPeriod>> GetHighRiskPeriodsAsync(DateTime? startTime = null, DateTime? endTime = null);
    Task<List<WarningTrend>> GetWarningTrendAsync(DateTime startTime, DateTime endTime, string interval = "day");
    Task<List<ZoneRisk>> GetZoneRiskRankingAsync(DateTime? startTime = null, DateTime? endTime = null);
    Task<List<TeamSafety>> GetTeamSafetyScoresAsync(DateTime? startTime = null, DateTime? endTime = null);
}

public class HighRiskPeriod
{
    public int Hour { get; set; }
    public int EventCount { get; set; }
    public RiskLevel AverageRiskLevel { get; set; }
}

public class WarningTrend
{
    public DateTime Date { get; set; }
    public int TotalCount { get; set; }
    public int CriticalCount { get; set; }
    public int HighCount { get; set; }
    public int MediumCount { get; set; }
    public int LowCount { get; set; }
}

public class ZoneRisk
{
    public Guid ZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public int WarningCount { get; set; }
    public double AverageDistance { get; set; }
    public RiskLevel RiskLevel { get; set; }
}

public class TeamSafety
{
    public Guid TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public double SafetyScore { get; set; }
    public int TotalWarnings { get; set; }
    public int CriticalWarnings { get; set; }
    public double AcknowledgedRate { get; set; }
}

public class StatisticsService : IStatisticsService
{
    private readonly IRepository<CollisionWarning> _warningRepository;
    private readonly IRepository<BlindSpotZone> _blindSpotRepository;
    private readonly IRepository<Team> _teamRepository;
    private readonly IRepository<Zone> _zoneRepository;

    public StatisticsService(
        IRepository<CollisionWarning> warningRepository,
        IRepository<BlindSpotZone> blindSpotRepository,
        IRepository<Team> teamRepository,
        IRepository<Zone> zoneRepository)
    {
        _warningRepository = warningRepository;
        _blindSpotRepository = blindSpotRepository;
        _teamRepository = teamRepository;
        _zoneRepository = zoneRepository;
    }

    public async Task<List<HighRiskPeriod>> GetHighRiskPeriodsAsync(DateTime? startTime = null, DateTime? endTime = null)
    {
        var query = _warningRepository.Query();

        if (startTime.HasValue)
            query = query.Where(w => w.CreatedAt >= startTime.Value);
        if (endTime.HasValue)
            query = query.Where(w => w.CreatedAt <= endTime.Value);

        var warnings = query.ToList();

        var result = warnings
            .GroupBy(w => w.CreatedAt.Hour)
            .Select(g => new HighRiskPeriod
            {
                Hour = g.Key,
                EventCount = g.Count(),
                AverageRiskLevel = g.Any(w => w.RiskLevel == RiskLevel.Critical) ? RiskLevel.Critical :
                                   g.Any(w => w.RiskLevel == RiskLevel.High) ? RiskLevel.High :
                                   g.Any(w => w.RiskLevel == RiskLevel.Medium) ? RiskLevel.Medium : RiskLevel.Low
            })
            .OrderBy(p => p.Hour)
            .ToList();

        return await Task.FromResult(result);
    }

    public async Task<List<WarningTrend>> GetWarningTrendAsync(DateTime startTime, DateTime endTime, string interval = "day")
    {
        var warnings = _warningRepository.Query()
            .Where(w => w.CreatedAt >= startTime && w.CreatedAt <= endTime)
            .ToList();

        IEnumerable<IGrouping<DateTime, CollisionWarning>> grouped;

        if (interval == "hour")
            grouped = warnings.GroupBy(w => new DateTime(w.CreatedAt.Year, w.CreatedAt.Month, w.CreatedAt.Day, w.CreatedAt.Hour, 0, 0));
        else if (interval == "week")
            grouped = warnings.GroupBy(w =>
            {
                var diff = (7 + (w.CreatedAt.DayOfWeek - DayOfWeek.Monday)) % 7;
                var monday = w.CreatedAt.Date.AddDays(-diff);
                return monday;
            });
        else
            grouped = warnings.GroupBy(w => w.CreatedAt.Date);

        var result = grouped.Select(g => new WarningTrend
        {
            Date = g.Key,
            TotalCount = g.Count(),
            CriticalCount = g.Count(w => w.RiskLevel == RiskLevel.Critical),
            HighCount = g.Count(w => w.RiskLevel == RiskLevel.High),
            MediumCount = g.Count(w => w.RiskLevel == RiskLevel.Medium),
            LowCount = g.Count(w => w.RiskLevel == RiskLevel.Low)
        })
        .OrderBy(t => t.Date)
        .ToList();

        return await Task.FromResult(result);
    }

    public async Task<List<ZoneRisk>> GetZoneRiskRankingAsync(DateTime? startTime = null, DateTime? endTime = null)
    {
        var query = _warningRepository.Query();

        if (startTime.HasValue)
            query = query.Where(w => w.CreatedAt >= startTime.Value);
        if (endTime.HasValue)
            query = query.Where(w => w.CreatedAt <= endTime.Value);

        var warnings = query.Where(w => w.ZoneId.HasValue).ToList();
        var zones = await _zoneRepository.GetAllAsync();

        var result = warnings
            .GroupBy(w => w.ZoneId!.Value)
            .Select(g =>
            {
                var zone = zones.FirstOrDefault(z => z.Id == g.Key);
                return new ZoneRisk
                {
                    ZoneId = g.Key,
                    ZoneName = zone?.Name ?? "未知区域",
                    WarningCount = g.Count(),
                    AverageDistance = g.Average(w => w.Distance),
                    RiskLevel = g.Any(w => w.RiskLevel == RiskLevel.Critical) ? RiskLevel.Critical :
                                g.Any(w => w.RiskLevel == RiskLevel.High) ? RiskLevel.High :
                                g.Any(w => w.RiskLevel == RiskLevel.Medium) ? RiskLevel.Medium : RiskLevel.Low
                };
            })
            .OrderByDescending(r => r.RiskLevel)
            .ThenByDescending(r => r.WarningCount)
            .ToList();

        return await Task.FromResult(result);
    }

    public async Task<List<TeamSafety>> GetTeamSafetyScoresAsync(DateTime? startTime = null, DateTime? endTime = null)
    {
        var teams = await _teamRepository.GetAllAsync();
        var warnings = _warningRepository.Query();

        if (startTime.HasValue)
            warnings = warnings.Where(w => w.CreatedAt >= startTime.Value);
        if (endTime.HasValue)
            warnings = warnings.Where(w => w.CreatedAt <= endTime.Value);

        var allWarnings = warnings.ToList();
        var result = new List<TeamSafety>();

        foreach (var team in teams)
        {
            var teamWarnings = allWarnings.Where(w =>
                w.AcknowledgedBy == team.Leader ||
                w.Message.Contains(team.Name)).ToList();

            if (!teamWarnings.Any())
            {
                result.Add(new TeamSafety
                {
                    TeamId = team.Id,
                    TeamName = team.Name,
                    SafetyScore = 100,
                    TotalWarnings = 0,
                    CriticalWarnings = 0,
                    AcknowledgedRate = 1.0
                });
                continue;
            }

            var criticalCount = teamWarnings.Count(w => w.RiskLevel == RiskLevel.Critical);
            var acknowledgedRate = (double)teamWarnings.Count(w => w.IsAcknowledged) / teamWarnings.Count;
            var score = Math.Max(0, 100 - criticalCount * 15 - (teamWarnings.Count - criticalCount) * 5 - (1 - acknowledgedRate) * 20);

            result.Add(new TeamSafety
            {
                TeamId = team.Id,
                TeamName = team.Name,
                SafetyScore = Math.Round(score, 1),
                TotalWarnings = teamWarnings.Count,
                CriticalWarnings = criticalCount,
                AcknowledgedRate = Math.Round(acknowledgedRate, 2)
            });
        }

        return await Task.FromResult(result.OrderByDescending(s => s.SafetyScore).ToList());
    }
}
