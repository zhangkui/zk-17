namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Core.Entities;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/teams")]
public class TeamsController : ControllerBase
{
    private readonly ITeamService _teamService;

    public TeamsController(ITeamService teamService)
    {
        _teamService = teamService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TeamDto>>> GetTeams()
    {
        var teams = await _teamService.GetAllTeamsAsync();
        var dtos = teams.Select(t => new TeamDto(t.Id, t.Name, t.Shift, t.Leader, t.CreatedAt));
        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<TeamDto>> CreateTeam([FromBody] CreateTeamRequest request)
    {
        var team = new Team
        {
            Name = request.Name,
            Shift = request.Shift,
            Leader = request.Leader
        };
        var created = await _teamService.CreateTeamAsync(team);
        return CreatedAtAction(nameof(GetTeams), new { id = created.Id },
            new TeamDto(created.Id, created.Name, created.Shift, created.Leader, created.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TeamDto>> UpdateTeam(Guid id, [FromBody] UpdateTeamRequest request)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

        team.Name = request.Name;
        team.Shift = request.Shift;
        team.Leader = request.Leader;

        var updated = await _teamService.UpdateTeamAsync(team);
        return Ok(new TeamDto(updated.Id, updated.Name, updated.Shift, updated.Leader, updated.CreatedAt));
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<IEnumerable<TeamMemberDto>>> GetMembers(Guid id)
    {
        var members = await _teamService.GetMembersAsync(id);
        var dtos = members.Select(m => new TeamMemberDto(m.Id, m.TeamId, m.Type, m.MemberName, m.Badge));
        return Ok(dtos);
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<TeamMemberDto>> AddMember(Guid id, [FromBody] AddTeamMemberRequest request)
    {
        var member = new TeamMember
        {
            MemberType = request.Type,
            MemberName = request.MemberName,
            Badge = request.Badge
        };
        var created = await _teamService.AddMemberAsync(id, member);
        return Ok(new TeamMemberDto(created.Id, created.TeamId, created.MemberType, created.MemberName, created.Badge));
    }

    [HttpGet("{id:guid}/events")]
    public async Task<ActionResult<IEnumerable<CollisionWarningDto>>> GetTeamEvents(
        Guid id,
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var events = await _teamService.GetTeamEventsAsync(id, startTime, endTime);
        var dtos = events.Select(w => new CollisionWarningDto(
            w.Id, w.ForkliftId, w.PersonnelId, w.ZoneId,
            w.WarningType, w.RiskLevel, w.Distance,
            w.ForkliftPositionX, w.ForkliftPositionY,
            w.PersonnelPositionX, w.PersonnelPositionY,
            w.Message, w.IsAcknowledged, w.AcknowledgedBy,
            w.AcknowledgedAt, w.CreatedAt));
        return Ok(dtos);
    }
}
