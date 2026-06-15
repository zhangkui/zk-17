namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/events")]
public class EventReplayController : ControllerBase
{
    private readonly IEventReplayService _eventReplayService;

    public EventReplayController(IEventReplayService eventReplayService)
    {
        _eventReplayService = eventReplayService;
    }

    [HttpGet("replay")]
    public async Task<ActionResult<EventReplayDto>> GetReplayData(
        [FromQuery] DateTime startTime,
        [FromQuery] DateTime endTime)
    {
        var data = await _eventReplayService.GetReplayDataAsync(startTime, endTime);
        var dto = new EventReplayDto(
            data.PositionRecords.Select(r => new PositionRecordDto(
                r.Id, r.EntityType.ToString(), r.EntityId,
                r.PositionX, r.PositionY, r.Direction, r.Speed, r.RecordedAt)).ToList(),
            data.CollisionWarnings.Select(w => new CollisionWarningDto(
                w.Id, w.ForkliftId, w.PersonnelId, w.ZoneId,
                w.WarningType, w.RiskLevel, w.Distance,
                w.ForkliftPositionX, w.ForkliftPositionY,
                w.PersonnelPositionX, w.PersonnelPositionY,
                w.Message, w.IsAcknowledged, w.AcknowledgedBy,
                w.AcknowledgedAt, w.CreatedAt)).ToList(),
            data.BlindSpotChanges.Select(b => new BlindSpotChangeDto(
                b.Id, b.ForkliftId, b.CenterX, b.CenterY,
                b.Radius, b.RiskLevel.ToString(), b.DetectedAt)).ToList()
        );
        return Ok(dto);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EventLogDto>>> GetEvents(
        [FromQuery] DateTime startTime,
        [FromQuery] DateTime endTime)
    {
        var events = await _eventReplayService.GetEventsAsync(startTime, endTime);
        var dtos = events.Select(e => new EventLogDto(
            e.Id, e.EventType, e.Description, e.Timestamp, e.Metadata));
        return Ok(dtos);
    }
}

public record EventLogDto(
    Guid Id,
    string EventType,
    string Description,
    DateTime Timestamp,
    Dictionary<string, object> Metadata);
