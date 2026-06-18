namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.Mvc;
using Svc = ColdStorageForklift.Services;

[ApiController]
[Route("api/predictions")]
public class PredictionWarningsController : ControllerBase
{
    private readonly IRiskPredictionService _predictionService;

    public PredictionWarningsController(IRiskPredictionService predictionService)
    {
        _predictionService = predictionService;
    }

    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<PredictionWarningDto>>> GetActivePredictions()
    {
        var predictions = await _predictionService.GetActivePredictionsAsync();
        var dtos = predictions.Select(p => MapToDto(p));
        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PredictionWarningDto>> GetPredictionById(Guid id)
    {
        var prediction = await _predictionService.GetPredictionByIdAsync(id);
        if (prediction == null)
            return NotFound();
        return Ok(MapToDto(prediction));
    }

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<PredictionWarningDto>>> GetPredictionHistory(
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var predictions = await _predictionService.GetPredictionHistoryAsync(startTime, endTime);
        var dtos = predictions.Select(p => MapToDto(p));
        return Ok(dtos);
    }

    [HttpPost("{id}/acknowledge")]
    public async Task<ActionResult<PredictionWarningDto>> AcknowledgePrediction(
        Guid id,
        [FromBody] HandlePredictionWarningDto request)
    {
        var result = await _predictionService.AcknowledgePredictionAsync(id, request.HandledBy, request.Remark);
        if (result == null)
            return NotFound();
        return Ok(MapToDto(result));
    }

    [HttpPost("{id}/ignore")]
    public async Task<ActionResult<PredictionWarningDto>> IgnorePrediction(
        Guid id,
        [FromBody] HandlePredictionWarningDto request)
    {
        var result = await _predictionService.IgnorePredictionAsync(id, request.HandledBy, request.Remark);
        if (result == null)
            return NotFound();
        return Ok(MapToDto(result));
    }

    [HttpPost("{id}/escalate")]
    public async Task<ActionResult<PredictionWarningDto>> EscalatePrediction(
        Guid id,
        [FromBody] HandlePredictionWarningDto request)
    {
        var result = await _predictionService.EscalatePredictionAsync(id, request.HandledBy, request.Remark);
        if (result == null)
            return NotFound();
        return Ok(MapToDto(result));
    }

    [HttpPost("{id}/resolve")]
    public async Task<ActionResult<PredictionWarningDto>> ResolvePrediction(
        Guid id,
        [FromBody] HandlePredictionWarningDto request)
    {
        var result = await _predictionService.ResolvePredictionAsync(id, request.HandledBy, request.Remark);
        if (result == null)
            return NotFound();
        return Ok(MapToDto(result));
    }

    [HttpGet("historical-analysis")]
    public async Task<ActionResult<HistoricalRiskAnalysisDto>> GetHistoricalRiskAnalysis(
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var analysis = await _predictionService.GetHistoricalRiskAnalysisAsync(startTime, endTime);
        var dto = new HistoricalRiskAnalysisDto
        {
            HighRiskPeriods = analysis.HighRiskPeriods
                .Select(p => new HighRiskPeriodDto(p.Hour, p.EventCount, p.AverageRiskLevel))
                .ToList(),
            HighRiskZones = analysis.HighRiskZones
                .Select(z => new ZoneRiskDto(z.ZoneId, z.ZoneName, z.WarningCount, z.AverageDistance, z.RiskLevel))
                .ToList(),
            HighRiskTeams = analysis.HighRiskTeams
                .Select(t => new TeamRiskDto
                {
                    TeamId = t.TeamId,
                    TeamName = t.TeamName,
                    WarningCount = t.WarningCount,
                    CriticalCount = t.CriticalCount,
                    RiskScore = t.RiskScore,
                    RiskLevel = t.RiskLevel
                })
                .ToList(),
            WarningTypeStats = analysis.WarningTypeStats
                .Select(s => new WarningTypeStatDto
                {
                    Type = s.Type,
                    Count = s.Count,
                    Percentage = s.Percentage
                })
                .ToList(),
            ZoneHeatRanking = analysis.ZoneHeatRanking
                .Select(z => new ZoneHeatDto
                {
                    ZoneId = z.ZoneId,
                    ZoneName = z.ZoneName,
                    PersonnelVisitCount = z.PersonnelVisitCount,
                    ForkliftVisitCount = z.ForkliftVisitCount,
                    TotalVisitCount = z.TotalVisitCount,
                    HeatScore = z.HeatScore
                })
                .ToList(),
            TrailHeatPeriods = analysis.TrailHeatPeriods
                .Select(p => new TrailHeatPeriodDto
                {
                    Hour = p.Hour,
                    PersonnelCount = p.PersonnelCount,
                    ForkliftCount = p.ForkliftCount,
                    TotalCount = p.TotalCount
                })
                .ToList(),
            PersonnelTrailStats = new TrailStatsDto
            {
                TotalRecords = analysis.PersonnelTrailStats.TotalRecords,
                ActiveEntities = analysis.PersonnelTrailStats.ActiveEntities,
                AverageSpeed = analysis.PersonnelTrailStats.AverageSpeed,
                MaxSpeed = analysis.PersonnelTrailStats.MaxSpeed
            },
            ForkliftTrailStats = new TrailStatsDto
            {
                TotalRecords = analysis.ForkliftTrailStats.TotalRecords,
                ActiveEntities = analysis.ForkliftTrailStats.ActiveEntities,
                AverageSpeed = analysis.ForkliftTrailStats.AverageSpeed,
                MaxSpeed = analysis.ForkliftTrailStats.MaxSpeed
            },
            Summary = new RiskSummaryDto
            {
                TotalWarnings = analysis.Summary.TotalWarnings,
                CriticalWarnings = analysis.Summary.CriticalWarnings,
                HighWarnings = analysis.Summary.HighWarnings,
                MediumWarnings = analysis.Summary.MediumWarnings,
                LowWarnings = analysis.Summary.LowWarnings,
                AverageResponseTime = analysis.Summary.AverageResponseTime,
                AcknowledgmentRate = analysis.Summary.AcknowledgmentRate
            }
        };
        return Ok(dto);
    }

    [HttpPost("calculate")]
    public async Task<ActionResult<IEnumerable<Svc.RiskPredictionResult>>> CalculatePredictions()
    {
        var results = await _predictionService.CalculatePredictionsAsync();
        return Ok(results);
    }

    private static PredictionWarningDto MapToDto(PredictionWarning p)
    {
        return new PredictionWarningDto
        {
            Id = p.Id,
            ForkliftId = p.ForkliftId,
            ForkliftName = p.Forklift?.Code ?? $"叉车-{p.ForkliftId.ToString().Substring(0, 4)}",
            PersonnelId = p.PersonnelId,
            PersonnelName = p.Personnel?.Name,
            ZoneId = p.ZoneId,
            ZoneName = p.Zone?.Name,
            WarningType = p.WarningType,
            PredictedRiskLevel = p.PredictedRiskLevel,
            PredictedDistance = p.PredictedDistance,
            ForkliftPositionX = p.ForkliftPositionX,
            ForkliftPositionY = p.ForkliftPositionY,
            ForkliftSpeed = p.ForkliftSpeed,
            ForkliftDirection = p.ForkliftDirection,
            PersonnelPositionX = p.PersonnelPositionX,
            PersonnelPositionY = p.PersonnelPositionY,
            PersonnelSpeed = p.PersonnelSpeed,
            PersonnelDirection = p.PersonnelDirection,
            PredictedCollisionTime = p.PredictedCollisionTime,
            Message = p.Message,
            Status = p.Status,
            HandledBy = p.HandledBy,
            HandledAt = p.HandledAt,
            HandleRemark = p.HandleRemark,
            BecameActualWarning = p.BecameActualWarning,
            CreatedAt = p.CreatedAt,
            ExpiresAt = p.ExpiresAt
        };
    }
}
