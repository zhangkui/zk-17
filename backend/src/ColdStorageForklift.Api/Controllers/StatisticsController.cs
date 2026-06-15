namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/statistics")]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsService _statisticsService;

    public StatisticsController(IStatisticsService statisticsService)
    {
        _statisticsService = statisticsService;
    }

    [HttpGet("high-risk-periods")]
    public async Task<ActionResult<IEnumerable<HighRiskPeriodDto>>> GetHighRiskPeriods(
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var periods = await _statisticsService.GetHighRiskPeriodsAsync(startTime, endTime);
        var dtos = periods.Select(p => new HighRiskPeriodDto(p.Hour, p.EventCount, p.AverageRiskLevel));
        return Ok(dtos);
    }

    [HttpGet("warning-trend")]
    public async Task<ActionResult<IEnumerable<WarningTrendDto>>> GetWarningTrend(
        [FromQuery] DateTime startTime,
        [FromQuery] DateTime endTime,
        [FromQuery] string interval = "day")
    {
        var trends = await _statisticsService.GetWarningTrendAsync(startTime, endTime, interval);
        var dtos = trends.Select(t => new WarningTrendDto(
            t.Date, t.TotalCount, t.CriticalCount, t.HighCount, t.MediumCount, t.LowCount));
        return Ok(dtos);
    }

    [HttpGet("zone-risk-ranking")]
    public async Task<ActionResult<IEnumerable<ZoneRiskDto>>> GetZoneRiskRanking(
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var ranking = await _statisticsService.GetZoneRiskRankingAsync(startTime, endTime);
        var dtos = ranking.Select(r => new ZoneRiskDto(
            r.ZoneId, r.ZoneName, r.WarningCount, r.AverageDistance, r.RiskLevel));
        return Ok(dtos);
    }

    [HttpGet("team-safety-scores")]
    public async Task<ActionResult<IEnumerable<TeamSafetyDto>>> GetTeamSafetyScores(
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var scores = await _statisticsService.GetTeamSafetyScoresAsync(startTime, endTime);
        var dtos = scores.Select(s => new TeamSafetyDto(
            s.TeamId, s.TeamName, s.SafetyScore, s.TotalWarnings, s.CriticalWarnings, s.AcknowledgedRate));
        return Ok(dtos);
    }
}
