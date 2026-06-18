namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public class PredictionWarningDto
{
    public Guid Id { get; set; }
    public Guid ForkliftId { get; set; }
    public string ForkliftName { get; set; } = string.Empty;
    public Guid? PersonnelId { get; set; }
    public string? PersonnelName { get; set; }
    public Guid? ZoneId { get; set; }
    public string? ZoneName { get; set; }
    public WarningType WarningType { get; set; }
    public RiskLevel PredictedRiskLevel { get; set; }
    public double PredictedDistance { get; set; }
    public double ForkliftPositionX { get; set; }
    public double ForkliftPositionY { get; set; }
    public double ForkliftSpeed { get; set; }
    public double ForkliftDirection { get; set; }
    public double? PersonnelPositionX { get; set; }
    public double? PersonnelPositionY { get; set; }
    public double? PersonnelSpeed { get; set; }
    public double? PersonnelDirection { get; set; }
    public double PredictedCollisionTime { get; set; }
    public string Message { get; set; } = string.Empty;
    public PredictionStatus Status { get; set; }
    public string? HandledBy { get; set; }
    public DateTime? HandledAt { get; set; }
    public string? HandleRemark { get; set; }
    public bool? BecameActualWarning { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class CreatePredictionWarningDto
{
    public Guid ForkliftId { get; set; }
    public Guid? PersonnelId { get; set; }
    public WarningType WarningType { get; set; }
    public RiskLevel PredictedRiskLevel { get; set; }
    public double PredictedDistance { get; set; }
    public double PredictedCollisionTime { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class HandlePredictionWarningDto
{
    public string HandledBy { get; set; } = string.Empty;
    public string? Remark { get; set; }
}

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
}

public class HistoricalRiskAnalysisDto
{
    public List<HighRiskPeriodDto> HighRiskPeriods { get; set; } = [];
    public List<ZoneRiskDto> HighRiskZones { get; set; } = [];
    public List<TeamRiskDto> HighRiskTeams { get; set; } = [];
    public List<WarningTypeStatDto> WarningTypeStats { get; set; } = [];
    public RiskSummaryDto Summary { get; set; } = new();
}

public class TeamRiskDto
{
    public Guid TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int WarningCount { get; set; }
    public int CriticalCount { get; set; }
    public double RiskScore { get; set; }
    public RiskLevel RiskLevel { get; set; }
}

public class WarningTypeStatDto
{
    public WarningType Type { get; set; }
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class RiskSummaryDto
{
    public int TotalWarnings { get; set; }
    public int CriticalWarnings { get; set; }
    public int HighWarnings { get; set; }
    public int MediumWarnings { get; set; }
    public int LowWarnings { get; set; }
    public double AverageResponseTime { get; set; }
    public double AcknowledgmentRate { get; set; }
}
