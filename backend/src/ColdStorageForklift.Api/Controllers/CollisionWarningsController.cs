namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/warnings")]
public class CollisionWarningsController : ControllerBase
{
    private readonly ICollisionWarningService _warningService;

    public CollisionWarningsController(ICollisionWarningService warningService)
    {
        _warningService = warningService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CollisionWarningDto>>> GetActiveWarnings()
    {
        var warnings = await _warningService.GetActiveWarningsAsync();
        var dtos = warnings.Select(w => new CollisionWarningDto(
            w.Id, w.ForkliftId, w.PersonnelId, w.ZoneId,
            w.WarningType, w.RiskLevel, w.Distance,
            w.ForkliftPositionX, w.ForkliftPositionY,
            w.PersonnelPositionX, w.PersonnelPositionY,
            w.Message, w.IsAcknowledged, w.AcknowledgedBy,
            w.AcknowledgedAt, w.CreatedAt));
        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CollisionWarningDto>> GetWarning(Guid id)
    {
        var warning = await _warningService.GetWarningByIdAsync(id);
        if (warning == null) return NotFound();

        return Ok(new CollisionWarningDto(
            warning.Id, warning.ForkliftId, warning.PersonnelId, warning.ZoneId,
            warning.WarningType, warning.RiskLevel, warning.Distance,
            warning.ForkliftPositionX, warning.ForkliftPositionY,
            warning.PersonnelPositionX, warning.PersonnelPositionY,
            warning.Message, warning.IsAcknowledged, warning.AcknowledgedBy,
            warning.AcknowledgedAt, warning.CreatedAt));
    }

    [HttpPost("{id:guid}/acknowledge")]
    public async Task<ActionResult<CollisionWarningDto>> AcknowledgeWarning(Guid id, [FromBody] AcknowledgeWarningRequest request)
    {
        var warning = await _warningService.AcknowledgeWarningAsync(id, request.AcknowledgedBy);
        if (warning == null) return NotFound();

        return Ok(new CollisionWarningDto(
            warning.Id, warning.ForkliftId, warning.PersonnelId, warning.ZoneId,
            warning.WarningType, warning.RiskLevel, warning.Distance,
            warning.ForkliftPositionX, warning.ForkliftPositionY,
            warning.PersonnelPositionX, warning.PersonnelPositionY,
            warning.Message, warning.IsAcknowledged, warning.AcknowledgedBy,
            warning.AcknowledgedAt, warning.CreatedAt));
    }

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<CollisionWarningDto>>> GetWarningHistory(
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var warnings = await _warningService.GetWarningHistoryAsync(startTime, endTime);
        var dtos = warnings.Select(w => new CollisionWarningDto(
            w.Id, w.ForkliftId, w.PersonnelId, w.ZoneId,
            w.WarningType, w.RiskLevel, w.Distance,
            w.ForkliftPositionX, w.ForkliftPositionY,
            w.PersonnelPositionX, w.PersonnelPositionY,
            w.Message, w.IsAcknowledged, w.AcknowledgedBy,
            w.AcknowledgedAt, w.CreatedAt));
        return Ok(dtos);
    }
}
