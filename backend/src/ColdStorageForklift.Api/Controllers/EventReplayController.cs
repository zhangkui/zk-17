namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Core.Entities;
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
            e.Id, e.EventType, e.Severity, e.ZoneId, e.ForkliftId, e.PersonnelId,
            e.TeamId, e.Description, e.PositionX, e.PositionY, e.OccurredAt));
        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<EventLogDto>> CreateEventLog([FromBody] CreateEventLogRequest request)
    {
        var eventLog = new EventLog
        {
            EventType = request.EventType,
            Severity = request.Severity,
            ZoneId = request.ZoneId,
            ForkliftId = request.ForkliftId,
            PersonnelId = request.PersonnelId,
            TeamId = request.TeamId,
            Description = request.Description,
            PositionX = request.PositionX,
            PositionY = request.PositionY,
            SnapshotData = request.SnapshotData
        };
        var created = await _eventReplayService.CreateEventLogAsync(eventLog);
        return CreatedAtAction(nameof(GetEvents), new { startTime = created.OccurredAt.AddHours(-1), endTime = created.OccurredAt.AddHours(1) },
            new EventLogDto(created.Id, created.EventType, created.Severity, created.ZoneId,
                created.ForkliftId, created.PersonnelId, created.TeamId, created.Description,
                created.PositionX, created.PositionY, created.OccurredAt));
    }

    [HttpGet("forklift/{forkliftId:guid}")]
    public async Task<ActionResult<IEnumerable<EventLogDto>>> GetEventsByForklift(Guid forkliftId)
    {
        var events = await _eventReplayService.GetEventLogsByForkliftAsync(forkliftId);
        var dtos = events.Select(e => new EventLogDto(
            e.Id, e.EventType, e.Severity, e.ZoneId, e.ForkliftId, e.PersonnelId,
            e.TeamId, e.Description, e.PositionX, e.PositionY, e.OccurredAt));
        return Ok(dtos);
    }

    [HttpGet("personnel/{personnelId:guid}")]
    public async Task<ActionResult<IEnumerable<EventLogDto>>> GetEventsByPersonnel(Guid personnelId)
    {
        var events = await _eventReplayService.GetEventLogsByPersonnelAsync(personnelId);
        var dtos = events.Select(e => new EventLogDto(
            e.Id, e.EventType, e.Severity, e.ZoneId, e.ForkliftId, e.PersonnelId,
            e.TeamId, e.Description, e.PositionX, e.PositionY, e.OccurredAt));
        return Ok(dtos);
    }

    [HttpGet("team/{teamId:guid}")]
    public async Task<ActionResult<IEnumerable<EventLogDto>>> GetEventsByTeam(
        Guid teamId,
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var events = await _eventReplayService.GetEventLogsByTeamAsync(teamId, startTime, endTime);
        var dtos = events.Select(e => new EventLogDto(
            e.Id, e.EventType, e.Severity, e.ZoneId, e.ForkliftId, e.PersonnelId,
            e.TeamId, e.Description, e.PositionX, e.PositionY, e.OccurredAt));
        return Ok(dtos);
    }
}

public record EventLogDto(
    Guid Id,
    EventType EventType,
    RiskLevel Severity,
    Guid? ZoneId,
    Guid? ForkliftId,
    Guid? PersonnelId,
    Guid? TeamId,
    string Description,
    double PositionX,
    double PositionY,
    DateTime OccurredAt);

public record CreateEventLogRequest(
    EventType EventType,
    RiskLevel Severity,
    Guid? ZoneId,
    Guid? ForkliftId,
    Guid? PersonnelId,
    Guid? TeamId,
    string Description,
    double PositionX,
    double PositionY,
    string? SnapshotData);
