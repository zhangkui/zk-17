namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Core.Interfaces;
using ColdStorageForklift.Infrastructure.Repositories;

public class RiskPredictionResult
{
    public Guid ForkliftId { get; set; }
    public Guid? PersonnelId { get; set; }
    public WarningType WarningType { get; set; }
    public RiskLevel RiskLevel { get; set; }
    public double PredictedDistance { get; set; }
    public double PredictedCollisionTime { get; set; }
    public double Confidence { get; set; }
    public string Message { get; set; } = string.Empty;
    public double ForkliftPositionX { get; set; }
    public double ForkliftPositionY { get; set; }
    public double ForkliftSpeed { get; set; }
    public double ForkliftDirection { get; set; }
    public double? PersonnelPositionX { get; set; }
    public double? PersonnelPositionY { get; set; }
    public double? PersonnelSpeed { get; set; }
    public double? PersonnelDirection { get; set; }
}

public interface IRiskPredictionService
{
    Task<List<RiskPredictionResult>> CalculatePredictionsAsync();
    Task<PredictionWarning?> GeneratePredictionWarningAsync(RiskPredictionResult result);
    Task<List<PredictionWarning>> GetActivePredictionsAsync();
    Task<PredictionWarning?> GetPredictionByIdAsync(Guid id);
    Task<PredictionWarning?> AcknowledgePredictionAsync(Guid predictionId, string handledBy, string? remark = null);
    Task<PredictionWarning?> IgnorePredictionAsync(Guid predictionId, string handledBy, string? remark = null);
    Task<PredictionWarning?> EscalatePredictionAsync(Guid predictionId, string handledBy, string? remark = null);
    Task<PredictionWarning?> ResolvePredictionAsync(Guid predictionId, string handledBy, string? remark = null);
    Task ExpireOldPredictionsAsync();
    Task<HistoricalRiskAnalysis> GetHistoricalRiskAnalysisAsync(DateTime? startTime = null, DateTime? endTime = null);
    Task<List<PredictionWarning>> GetPredictionHistoryAsync(DateTime? startTime = null, DateTime? endTime = null);
}

public class RiskPredictionService : IRiskPredictionService
{
    private readonly IRepository<PredictionWarning> _predictionRepository;
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Personnel> _personnelRepository;
    private readonly IRepository<Zone> _zoneRepository;
    private readonly IRepository<CollisionWarning> _warningRepository;
    private readonly IRepository<BlindSpotZone> _blindSpotRepository;
    private readonly IRepository<Team> _teamRepository;
    private readonly IPositionRepository _positionRepository;

    private const double PredictionTimeWindowSeconds = 30;
    private const double WarningDistanceThreshold = 15.0;
    private const double CriticalDistanceThreshold = 3.0;
    private const double HighDistanceThreshold = 5.0;
    private const double MediumDistanceThreshold = 8.0;
    private const double DefaultPersonSpeed = 1.5;
    private const int PositionLookbackSeconds = 30;

    public RiskPredictionService(
        IRepository<PredictionWarning> predictionRepository,
        IRepository<Forklift> forkliftRepository,
        IRepository<Personnel> personnelRepository,
        IRepository<Zone> zoneRepository,
        IRepository<CollisionWarning> warningRepository,
        IRepository<BlindSpotZone> blindSpotRepository,
        IRepository<Team> teamRepository,
        IPositionRepository positionRepository)
    {
        _predictionRepository = predictionRepository;
        _forkliftRepository = forkliftRepository;
        _personnelRepository = personnelRepository;
        _zoneRepository = zoneRepository;
        _warningRepository = warningRepository;
        _blindSpotRepository = blindSpotRepository;
        _teamRepository = teamRepository;
        _positionRepository = positionRepository;
    }

    public async Task<List<RiskPredictionResult>> CalculatePredictionsAsync()
    {
        var results = new List<RiskPredictionResult>();
        var forklifts = (await _forkliftRepository.GetAllAsync())
            .Where(f => f.Status == ForkliftStatus.Online).ToList();
        var personnel = (await _personnelRepository.GetAllAsync())
            .Where(p => p.Status == PersonnelStatus.Online).ToList();
        var zones = (await _zoneRepository.GetAllAsync()).ToList();
        var blindSpots = (await _blindSpotRepository.GetAllAsync())
            .Where(b => b.IsActive).ToList();

        var personPositionDict = new Dictionary<Guid, PositionRecord?>();
        foreach (var person in personnel)
        {
            var records = await _positionRepository.GetByEntityIdAsync(person.Id);
            personPositionDict[person.Id] = records.FirstOrDefault();
        }

        foreach (var forklift in forklifts)
        {
            foreach (var person in personnel)
            {
                personPositionDict.TryGetValue(person.Id, out var personPosition);
                var result = CalculatePersonForkliftPrediction(forklift, person, personPosition, zones, blindSpots);
                if (result != null && result.RiskLevel >= RiskLevel.Low)
                {
                    results.Add(result);
                }
            }

            foreach (var otherForklift in forklifts.Where(f => f.Id != forklift.Id))
            {
                var result = CalculateVehicleCollisionPrediction(forklift, otherForklift, zones);
                if (result != null && result.RiskLevel >= RiskLevel.Low)
                {
                    results.Add(result);
                }
            }
        }

        return results.OrderByDescending(r => r.RiskLevel).ToList();
    }

    private RiskPredictionResult? CalculatePersonForkliftPrediction(
        Forklift forklift, Personnel person, PositionRecord? personPosition, List<Zone> zones, List<BlindSpotZone> blindSpots)
    {
        var currentDistance = CalculateDistance(
            forklift.CurrentPositionX, forklift.CurrentPositionY,
            person.CurrentPositionX, person.CurrentPositionY);

        if (currentDistance > WarningDistanceThreshold * 2)
            return null;

        var forkliftVel = VelocityFromSpeedDirection(forklift.Speed, forklift.Direction);
        var personSpeed = GetPersonSpeed(person, personPosition);
        var personDirection = GetPersonDirection(person, personPosition);
        var personVel = VelocityFromSpeedDirection(personSpeed, personDirection);

        var relVelX = personVel.x - forkliftVel.x;
        var relVelY = personVel.y - forkliftVel.y;
        var relSpeed = Math.Sqrt(relVelX * relVelX + relVelY * relVelY);

        var predictedPositions = PredictPositions(
            forklift.CurrentPositionX, forklift.CurrentPositionY, forkliftVel.x, forkliftVel.y,
            person.CurrentPositionX, person.CurrentPositionY, personVel.x, personVel.y,
            PredictionTimeWindowSeconds);

        var minDistance = predictedPositions.Min(p => p.distance);
        var timeToClosest = predictedPositions.First(p => p.distance == minDistance).time;

        if (minDistance > WarningDistanceThreshold)
            return null;

        var riskScore = CalculateRiskScore(minDistance, relSpeed, timeToClosest);

        var inBlindSpot = IsInBlindSpot(forklift, person, blindSpots);
        if (inBlindSpot)
            riskScore += 15;

        var zone = GetZoneForPosition(forklift.CurrentPositionX, forklift.CurrentPositionY, zones);
        if (zone?.IsHighRisk == true)
            riskScore += 10;

        var riskLevel = ScoreToRiskLevel(riskScore);

        if (riskLevel < RiskLevel.Low)
            return null;

        var confidence = CalculateConfidence(currentDistance, minDistance, relSpeed);

        return new RiskPredictionResult
        {
            ForkliftId = forklift.Id,
            PersonnelId = person.Id,
            WarningType = WarningType.PersonForkliftApproach,
            RiskLevel = riskLevel,
            PredictedDistance = minDistance,
            PredictedCollisionTime = timeToClosest,
            Confidence = confidence,
            Message = BuildPredictionMessage(WarningType.PersonForkliftApproach, riskLevel, minDistance, timeToClosest),
            ForkliftPositionX = forklift.CurrentPositionX,
            ForkliftPositionY = forklift.CurrentPositionY,
            ForkliftSpeed = forklift.Speed,
            ForkliftDirection = forklift.Direction,
            PersonnelPositionX = person.CurrentPositionX,
            PersonnelPositionY = person.CurrentPositionY,
            PersonnelSpeed = personSpeed,
            PersonnelDirection = personDirection
        };
    }

    private RiskPredictionResult? CalculateVehicleCollisionPrediction(
        Forklift forklift1, Forklift forklift2, List<Zone> zones)
    {
        var currentDistance = CalculateDistance(
            forklift1.CurrentPositionX, forklift1.CurrentPositionY,
            forklift2.CurrentPositionX, forklift2.CurrentPositionY);

        if (currentDistance > WarningDistanceThreshold * 2)
            return null;

        var vel1 = VelocityFromSpeedDirection(forklift1.Speed, forklift1.Direction);
        var vel2 = VelocityFromSpeedDirection(forklift2.Speed, forklift2.Direction);

        var relVelX = vel2.x - vel1.x;
        var relVelY = vel2.y - vel1.y;
        var relSpeed = Math.Sqrt(relVelX * relVelX + relVelY * relVelY);

        var predictedPositions = PredictPositions(
            forklift1.CurrentPositionX, forklift1.CurrentPositionY, vel1.x, vel1.y,
            forklift2.CurrentPositionX, forklift2.CurrentPositionY, vel2.x, vel2.y,
            PredictionTimeWindowSeconds);

        var minDistance = predictedPositions.Min(p => p.distance);
        var timeToClosest = predictedPositions.First(p => p.distance == minDistance).time;

        if (minDistance > WarningDistanceThreshold)
            return null;

        var riskScore = CalculateRiskScore(minDistance, relSpeed, timeToClosest);

        var zone = GetZoneForPosition(forklift1.CurrentPositionX, forklift1.CurrentPositionY, zones);
        if (zone?.IsHighRisk == true)
            riskScore += 10;

        var riskLevel = ScoreToRiskLevel(riskScore);

        if (riskLevel < RiskLevel.Low)
            return null;

        var confidence = CalculateConfidence(currentDistance, minDistance, relSpeed);

        return new RiskPredictionResult
        {
            ForkliftId = forklift1.Id,
            WarningType = WarningType.VehicleCollision,
            RiskLevel = riskLevel,
            PredictedDistance = minDistance,
            PredictedCollisionTime = timeToClosest,
            Confidence = confidence,
            Message = BuildPredictionMessage(WarningType.VehicleCollision, riskLevel, minDistance, timeToClosest)
        };
    }

    private static double CalculateDistance(double x1, double y1, double x2, double y2)
    {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    private static (double x, double y) VelocityFromSpeedDirection(double speed, double direction)
    {
        var rad = direction * Math.PI / 180.0;
        return (speed * Math.Cos(rad), speed * Math.Sin(rad));
    }

    private static double GetPersonSpeed(Personnel person, PositionRecord? positionRecord)
    {
        if (positionRecord != null && positionRecord.Speed > 0)
        {
            return positionRecord.Speed;
        }
        return person.Status == PersonnelStatus.Online ? DefaultPersonSpeed : 0;
    }

    private static double GetPersonDirection(Personnel person, PositionRecord? positionRecord)
    {
        if (positionRecord != null)
        {
            return positionRecord.Direction;
        }
        return 0;
    }

    private static List<(double time, double distance)> PredictPositions(
        double x1, double y1, double vx1, double vy1,
        double x2, double y2, double vx2, double vy2,
        double timeWindow)
    {
        var results = new List<(double, double)>();
        var steps = 30;
        var dt = timeWindow / steps;

        for (int i = 0; i <= steps; i++)
        {
            var t = i * dt;
            var px1 = x1 + vx1 * t;
            var py1 = y1 + vy1 * t;
            var px2 = x2 + vx2 * t;
            var py2 = y2 + vy2 * t;
            var dist = CalculateDistance(px1, py1, px2, py2);
            results.Add((t, dist));
        }

        return results;
    }

    private static double CalculateRiskScore(double minDistance, double relSpeed, double timeToClosest)
    {
        var distanceScore = minDistance switch
        {
            < CriticalDistanceThreshold => 90,
            < HighDistanceThreshold => 75,
            < MediumDistanceThreshold => 55,
            < 12 => 35,
            _ => 15
        };

        var speedScore = relSpeed switch
        {
            > 5 => 20,
            > 3 => 15,
            > 1.5 => 10,
            _ => 5
        };

        var timeScore = timeToClosest switch
        {
            < 5 => 15,
            < 10 => 10,
            < 20 => 5,
            _ => 0
        };

        return Math.Min(100, distanceScore + speedScore + timeScore);
    }

    private static RiskLevel ScoreToRiskLevel(double score)
    {
        return score switch
        {
            >= 80 => RiskLevel.Critical,
            >= 60 => RiskLevel.High,
            >= 40 => RiskLevel.Medium,
            >= 25 => RiskLevel.Low,
            _ => RiskLevel.Low
        };
    }

    private static double CalculateConfidence(double currentDistance, double minDistance, double relSpeed)
    {
        var distanceFactor = Math.Max(0, 1 - Math.Abs(currentDistance - minDistance) / Math.Max(currentDistance, 1));
        var speedFactor = Math.Min(1, relSpeed / 5.0);
        return Math.Round(0.5 + 0.3 * distanceFactor + 0.2 * speedFactor, 2);
    }

    private static bool IsInBlindSpot(Forklift forklift, Personnel person, List<BlindSpotZone> blindSpots)
    {
        var forkliftBlindSpots = blindSpots.Where(b => b.ForkliftId == forklift.Id);
        foreach (var bs in forkliftBlindSpots)
        {
            var dist = CalculateDistance(bs.CenterX, bs.CenterY, person.CurrentPositionX, person.CurrentPositionY);
            if (dist <= bs.Radius)
                return true;
        }
        return false;
    }

    private static Zone? GetZoneForPosition(double x, double y, List<Zone> zones)
    {
        return zones.FirstOrDefault(z =>
            x >= z.PositionX && x <= z.PositionX + z.Width &&
            y >= z.PositionY && y <= z.PositionY + z.Height);
    }

    private static string BuildPredictionMessage(WarningType type, RiskLevel level, double distance, double timeToClosest)
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
            WarningType.PersonForkliftApproach => "人车接近",
            WarningType.VehicleCollision => "车辆碰撞",
            WarningType.BlindSpotIntrusion => "盲区入侵",
            _ => "未知"
        };

        return $"{levelText}：预测{typeText}，预计{timeToClosest:F0}秒后距离 {distance:F1}m";
    }

    public async Task<PredictionWarning?> GeneratePredictionWarningAsync(RiskPredictionResult result)
    {
        var forklift = await _forkliftRepository.GetByIdAsync(result.ForkliftId);
        if (forklift == null) return null;

        var existingActive = _predictionRepository.Query()
            .Where(p => p.ForkliftId == result.ForkliftId &&
                       p.PersonnelId == result.PersonnelId &&
                       p.WarningType == result.WarningType &&
                       p.Status == PredictionStatus.Active)
            .FirstOrDefault();

        if (existingActive != null)
        {
            existingActive.PredictedRiskLevel = result.RiskLevel;
            existingActive.PredictedDistance = result.PredictedDistance;
            existingActive.PredictedCollisionTime = result.PredictedCollisionTime;
            existingActive.Message = result.Message;
            existingActive.ForkliftPositionX = forklift.CurrentPositionX;
            existingActive.ForkliftPositionY = forklift.CurrentPositionY;
            existingActive.ForkliftSpeed = forklift.Speed;
            existingActive.ForkliftDirection = forklift.Direction;
            existingActive.PersonnelSpeed = result.PersonnelSpeed;
            existingActive.PersonnelDirection = result.PersonnelDirection;
            existingActive.ExpiresAt = DateTime.UtcNow.AddSeconds(30);
            await _predictionRepository.UpdateAsync(existingActive);
            return existingActive;
        }

        var warning = new PredictionWarning
        {
            Id = Guid.NewGuid(),
            ForkliftId = result.ForkliftId,
            PersonnelId = result.PersonnelId,
            WarningType = result.WarningType,
            PredictedRiskLevel = result.RiskLevel,
            PredictedDistance = result.PredictedDistance,
            ForkliftPositionX = forklift.CurrentPositionX,
            ForkliftPositionY = forklift.CurrentPositionY,
            ForkliftSpeed = forklift.Speed,
            ForkliftDirection = forklift.Direction,
            PersonnelPositionX = result.PersonnelPositionX,
            PersonnelPositionY = result.PersonnelPositionY,
            PersonnelSpeed = result.PersonnelSpeed,
            PersonnelDirection = result.PersonnelDirection,
            PredictedCollisionTime = result.PredictedCollisionTime,
            Message = result.Message,
            Status = PredictionStatus.Active,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddSeconds(30)
        };

        var zones = await _zoneRepository.GetAllAsync();
        var zone = GetZoneForPosition(forklift.CurrentPositionX, forklift.CurrentPositionY, zones.ToList());
        if (zone != null)
        {
            warning.ZoneId = zone.Id;
        }

        return await _predictionRepository.AddAsync(warning);
    }

    public async Task<List<PredictionWarning>> GetActivePredictionsAsync()
    {
        await ExpireOldPredictionsAsync();
        return _predictionRepository.Query()
            .Where(p => p.Status == PredictionStatus.Active)
            .OrderByDescending(p => p.PredictedRiskLevel)
            .ThenByDescending(p => p.CreatedAt)
            .ToList();
    }

    public async Task<PredictionWarning?> GetPredictionByIdAsync(Guid id)
    {
        return await _predictionRepository.GetByIdAsync(id);
    }

    public async Task<PredictionWarning?> AcknowledgePredictionAsync(Guid predictionId, string handledBy, string? remark = null)
    {
        var prediction = await _predictionRepository.GetByIdAsync(predictionId);
        if (prediction == null) return null;

        prediction.Status = PredictionStatus.Acknowledged;
        prediction.HandledBy = handledBy;
        prediction.HandledAt = DateTime.UtcNow;
        prediction.HandleRemark = remark;

        await _predictionRepository.UpdateAsync(prediction);
        return prediction;
    }

    public async Task<PredictionWarning?> IgnorePredictionAsync(Guid predictionId, string handledBy, string? remark = null)
    {
        var prediction = await _predictionRepository.GetByIdAsync(predictionId);
        if (prediction == null) return null;

        prediction.Status = PredictionStatus.Ignored;
        prediction.HandledBy = handledBy;
        prediction.HandledAt = DateTime.UtcNow;
        prediction.HandleRemark = remark;

        await _predictionRepository.UpdateAsync(prediction);
        return prediction;
    }

    public async Task<PredictionWarning?> EscalatePredictionAsync(Guid predictionId, string handledBy, string? remark = null)
    {
        var prediction = await _predictionRepository.GetByIdAsync(predictionId);
        if (prediction == null) return null;

        prediction.Status = PredictionStatus.Escalated;
        prediction.HandledBy = handledBy;
        prediction.HandledAt = DateTime.UtcNow;
        prediction.HandleRemark = remark;

        await _predictionRepository.UpdateAsync(prediction);
        return prediction;
    }

    public async Task<PredictionWarning?> ResolvePredictionAsync(Guid predictionId, string handledBy, string? remark = null)
    {
        var prediction = await _predictionRepository.GetByIdAsync(predictionId);
        if (prediction == null) return null;

        prediction.Status = PredictionStatus.Resolved;
        prediction.HandledBy = handledBy;
        prediction.HandledAt = DateTime.UtcNow;
        prediction.HandleRemark = remark;

        await _predictionRepository.UpdateAsync(prediction);
        return prediction;
    }

    public async Task ExpireOldPredictionsAsync()
    {
        var now = DateTime.UtcNow;
        var expired = _predictionRepository.Query()
            .Where(p => p.Status == PredictionStatus.Active && p.ExpiresAt < now)
            .ToList();

        foreach (var p in expired)
        {
            p.Status = PredictionStatus.Expired;
            await _predictionRepository.UpdateAsync(p);
        }
    }

    public async Task<HistoricalRiskAnalysis> GetHistoricalRiskAnalysisAsync(DateTime? startTime = null, DateTime? endTime = null)
    {
        startTime ??= DateTime.UtcNow.AddDays(-30);
        endTime ??= DateTime.UtcNow;

        var warnings = _warningRepository.Query()
            .Where(w => w.CreatedAt >= startTime && w.CreatedAt <= endTime)
            .ToList();

        var predictions = _predictionRepository.Query()
            .Where(p => p.CreatedAt >= startTime && p.CreatedAt <= endTime)
            .ToList();

        var teams = await _teamRepository.GetAllAsync();
        var zones = await _zoneRepository.GetAllAsync();

        var highRiskPeriods = warnings
            .GroupBy(w => w.CreatedAt.Hour)
            .Select(g => new HighRiskPeriod
            {
                Hour = g.Key,
                EventCount = g.Count(),
                AverageRiskLevel = g.Any(w => w.RiskLevel == RiskLevel.Critical) ? RiskLevel.Critical :
                                   g.Any(w => w.RiskLevel == RiskLevel.High) ? RiskLevel.High :
                                   g.Any(w => w.RiskLevel == RiskLevel.Medium) ? RiskLevel.Medium : RiskLevel.Low
            })
            .OrderByDescending(p => p.EventCount)
            .Take(10)
            .ToList();

        var highRiskZones = warnings
            .Where(w => w.ZoneId.HasValue)
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
            .OrderByDescending(r => r.WarningCount)
            .ToList();

        var highRiskTeams = new List<TeamRisk>();
        foreach (var team in teams)
        {
            var teamWarnings = warnings.Where(w =>
                w.Forklift.TeamId == team.Id ||
                (w.Personnel != null && w.Personnel.TeamId == team.Id)).ToList();

            if (teamWarnings.Count == 0) continue;

            var criticalCount = teamWarnings.Count(w => w.RiskLevel == RiskLevel.Critical);
            var riskScore = Math.Min(100, criticalCount * 15 + (teamWarnings.Count - criticalCount) * 5);

            highRiskTeams.Add(new TeamRisk
            {
                TeamId = team.Id,
                TeamName = team.Name,
                WarningCount = teamWarnings.Count,
                CriticalCount = criticalCount,
                RiskScore = riskScore,
                RiskLevel = ScoreToRiskLevel(riskScore)
            });
        }

        highRiskTeams = highRiskTeams.OrderByDescending(t => t.RiskScore).ToList();

        var warningTypeStats = warnings
            .GroupBy(w => w.WarningType)
            .Select(g => new WarningTypeStat
            {
                Type = g.Key,
                Count = g.Count(),
                Percentage = warnings.Count > 0 ? (double)g.Count() / warnings.Count : 0
            })
            .OrderByDescending(s => s.Count)
            .ToList();

        var summary = new RiskSummary
        {
            TotalWarnings = warnings.Count,
            CriticalWarnings = warnings.Count(w => w.RiskLevel == RiskLevel.Critical),
            HighWarnings = warnings.Count(w => w.RiskLevel == RiskLevel.High),
            MediumWarnings = warnings.Count(w => w.RiskLevel == RiskLevel.Medium),
            LowWarnings = warnings.Count(w => w.RiskLevel == RiskLevel.Low),
            AcknowledgmentRate = warnings.Count > 0
                ? (double)warnings.Count(w => w.IsAcknowledged) / warnings.Count
                : 0,
            AverageResponseTime = 0
        };

        var acknowledged = warnings.Where(w => w.IsAcknowledged && w.AcknowledgedAt.HasValue).ToList();
        if (acknowledged.Count > 0)
        {
            var responseTimes = acknowledged
                .Select(w => (w.AcknowledgedAt!.Value - w.CreatedAt).TotalSeconds)
                .ToList();
            summary.AverageResponseTime = responseTimes.Average();
        }

        var positionRecords = (await _positionRepository.GetByTimeRangeAsync(
            startTime.Value, endTime.Value)).ToList();

        var personnelRecords = positionRecords
            .Where(p => p.EntityType == PositionEntityType.Personnel)
            .ToList();
        var forkliftRecords = positionRecords
            .Where(p => p.EntityType == PositionEntityType.Forklift)
            .ToList();

        var trailHeatPeriods = positionRecords
            .GroupBy(p => p.RecordedAt.Hour)
            .Select(g => new TrailHeatPeriod
            {
                Hour = g.Key,
                PersonnelCount = g.Count(p => p.EntityType == PositionEntityType.Personnel),
                ForkliftCount = g.Count(p => p.EntityType == PositionEntityType.Forklift),
                TotalCount = g.Count()
            })
            .OrderByDescending(p => p.TotalCount)
            .Take(10)
            .ToList();

        var zoneHeatDict = new Dictionary<Guid, ZoneHeat>();
        foreach (var zone in zones)
        {
            zoneHeatDict[zone.Id] = new ZoneHeat
            {
                ZoneId = zone.Id,
                ZoneName = zone.Name,
                PersonnelVisitCount = 0,
                ForkliftVisitCount = 0,
                TotalVisitCount = 0,
                HeatScore = 0
            };
        }

        foreach (var record in positionRecords)
        {
            var zone = GetZoneForPosition(record.PositionX, record.PositionY, zones.ToList());
            if (zone != null && zoneHeatDict.TryGetValue(zone.Id, out var zoneHeat))
            {
                if (record.EntityType == PositionEntityType.Personnel)
                    zoneHeat.PersonnelVisitCount++;
                else if (record.EntityType == PositionEntityType.Forklift)
                    zoneHeat.ForkliftVisitCount++;
                zoneHeat.TotalVisitCount++;
            }
        }

        foreach (var zoneHeat in zoneHeatDict.Values)
        {
            zoneHeat.HeatScore = Math.Min(100,
                zoneHeat.PersonnelVisitCount * 2 + zoneHeat.ForkliftVisitCount * 3);
        }

        var zoneHeatRanking = zoneHeatDict.Values
            .Where(z => z.TotalVisitCount > 0)
            .OrderByDescending(z => z.HeatScore)
            .ToList();

        var personnelTrailStats = new TrailStats
        {
            TotalRecords = personnelRecords.Count,
            ActiveEntities = personnelRecords.Select(p => p.EntityId).Distinct().Count(),
            AverageSpeed = personnelRecords.Count > 0 ? personnelRecords.Average(p => p.Speed) : 0,
            MaxSpeed = personnelRecords.Count > 0 ? personnelRecords.Max(p => p.Speed) : 0
        };

        var forkliftTrailStats = new TrailStats
        {
            TotalRecords = forkliftRecords.Count,
            ActiveEntities = forkliftRecords.Select(p => p.EntityId).Distinct().Count(),
            AverageSpeed = forkliftRecords.Count > 0 ? forkliftRecords.Average(p => p.Speed) : 0,
            MaxSpeed = forkliftRecords.Count > 0 ? forkliftRecords.Max(p => p.Speed) : 0
        };

        return new HistoricalRiskAnalysis
        {
            HighRiskPeriods = highRiskPeriods,
            HighRiskZones = highRiskZones,
            HighRiskTeams = highRiskTeams,
            WarningTypeStats = warningTypeStats,
            ZoneHeatRanking = zoneHeatRanking,
            TrailHeatPeriods = trailHeatPeriods,
            PersonnelTrailStats = personnelTrailStats,
            ForkliftTrailStats = forkliftTrailStats,
            Summary = summary
        };
    }

    public async Task<List<PredictionWarning>> GetPredictionHistoryAsync(DateTime? startTime = null, DateTime? endTime = null)
    {
        var query = _predictionRepository.Query();

        if (startTime.HasValue)
            query = query.Where(p => p.CreatedAt >= startTime.Value);

        if (endTime.HasValue)
            query = query.Where(p => p.CreatedAt <= endTime.Value);

        return await Task.FromResult(query
            .OrderByDescending(p => p.CreatedAt)
            .ToList());
    }
}

public class HistoricalRiskAnalysis
{
    public List<HighRiskPeriod> HighRiskPeriods { get; set; } = [];
    public List<ZoneRisk> HighRiskZones { get; set; } = [];
    public List<TeamRisk> HighRiskTeams { get; set; } = [];
    public List<WarningTypeStat> WarningTypeStats { get; set; } = [];
    public List<ZoneHeat> ZoneHeatRanking { get; set; } = [];
    public List<TrailHeatPeriod> TrailHeatPeriods { get; set; } = [];
    public TrailStats PersonnelTrailStats { get; set; } = new();
    public TrailStats ForkliftTrailStats { get; set; } = new();
    public RiskSummary Summary { get; set; } = new();
}

public class ZoneHeat
{
    public Guid ZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public int PersonnelVisitCount { get; set; }
    public int ForkliftVisitCount { get; set; }
    public int TotalVisitCount { get; set; }
    public double HeatScore { get; set; }
}

public class TrailHeatPeriod
{
    public int Hour { get; set; }
    public int PersonnelCount { get; set; }
    public int ForkliftCount { get; set; }
    public int TotalCount { get; set; }
}

public class TrailStats
{
    public int TotalRecords { get; set; }
    public int ActiveEntities { get; set; }
    public double AverageSpeed { get; set; }
    public double MaxSpeed { get; set; }
}

public class TeamRisk
{
    public Guid TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int WarningCount { get; set; }
    public int CriticalCount { get; set; }
    public double RiskScore { get; set; }
    public RiskLevel RiskLevel { get; set; }
}

public class WarningTypeStat
{
    public WarningType Type { get; set; }
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class RiskSummary
{
    public int TotalWarnings { get; set; }
    public int CriticalWarnings { get; set; }
    public int HighWarnings { get; set; }
    public int MediumWarnings { get; set; }
    public int LowWarnings { get; set; }
    public double AverageResponseTime { get; set; }
    public double AcknowledgmentRate { get; set; }
}
