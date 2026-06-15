namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/positions")]
public class PositionsController : ControllerBase
{
    private readonly IPositionService _positionService;

    public PositionsController(IPositionService positionService)
    {
        _positionService = positionService;
    }

    [HttpGet("forklifts")]
    public async Task<ActionResult<IEnumerable<ForkliftPositionDto>>> GetForkliftPositions()
    {
        var forklifts = await _positionService.GetForkliftPositionsAsync();
        var dtos = forklifts.Select(f => new ForkliftPositionDto(
            f.Id, f.Code, f.Model, f.CurrentPositionX, f.CurrentPositionY,
            f.Direction, f.Speed, f.Status, f.LastPositionUpdate));
        return Ok(dtos);
    }

    [HttpGet("personnel")]
    public async Task<ActionResult<IEnumerable<PersonnelPositionDto>>> GetPersonnelPositions()
    {
        var personnel = await _positionService.GetPersonnelPositionsAsync();
        var dtos = personnel.Select(p => new PersonnelPositionDto(
            p.Id, p.Name, p.Badge, p.CurrentPositionX, p.CurrentPositionY,
            p.Status, p.LastPositionUpdate));
        return Ok(dtos);
    }

    [HttpPost("forklift/{id:guid}")]
    public async Task<IActionResult> UpdateForkliftPosition(Guid id, [FromBody] UpdateForkliftPositionRequest request)
    {
        await _positionService.RecordForkliftPositionAsync(id, request.PositionX, request.PositionY, request.Direction, request.Speed);
        return Ok();
    }

    [HttpPost("personnel/{id:guid}")]
    public async Task<IActionResult> UpdatePersonnelPosition(Guid id, [FromBody] UpdatePersonnelPositionRequest request)
    {
        await _positionService.RecordPersonnelPositionAsync(id, request.PositionX, request.PositionY);
        return Ok();
    }

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<PositionRecordDto>>> GetPositionHistory(
        [FromQuery] DateTime startTime,
        [FromQuery] DateTime endTime,
        [FromQuery] PositionEntityType? entityType = null,
        [FromQuery] Guid? entityId = null)
    {
        var records = await _positionService.GetPositionHistoryAsync(startTime, endTime, entityType, entityId);
        var dtos = records.Select(r => new PositionRecordDto(
            r.Id, r.EntityType.ToString(), r.EntityId,
            r.PositionX, r.PositionY, r.Direction, r.Speed, r.RecordedAt));
        return Ok(dtos);
    }
}
