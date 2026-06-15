namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record HighRiskPeriodDto(
    int Hour,
    int EventCount,
    RiskLevel AverageRiskLevel);

public record WarningTrendDto(
    DateTime Date,
    int TotalCount,
    int CriticalCount,
    int HighCount,
    int MediumCount,
    int LowCount);

public record ZoneRiskDto(
    Guid ZoneId,
    string ZoneName,
    int WarningCount,
    double AverageDistance,
    RiskLevel RiskLevel);

public record TeamSafetyDto(
    Guid TeamId,
    string TeamName,
    double SafetyScore,
    int TotalWarnings,
    int CriticalWarnings,
    double AcknowledgedRate);

public record StatisticsDto(
    List<HighRiskPeriodDto> HighRiskPeriods,
    List<WarningTrendDto> WarningTrends,
    List<ZoneRiskDto> ZoneRiskRanking,
    List<TeamSafetyDto> TeamSafetyScores);
