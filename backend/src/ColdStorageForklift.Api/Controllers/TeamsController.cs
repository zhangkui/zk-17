namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Services;
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

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TeamDetailDto>> GetTeamById(Guid id)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

        var members = await _teamService.GetMembersAsync(id);
        var memberDtos = members.Select(m => new TeamMemberDto(m.Id, m.TeamId!.Value, MemberType.Worker, m.Name, m.Badge));

        return Ok(new TeamDetailDto(
            team.Id,
            team.Name,
            team.Shift,
            team.Leader,
            team.CreatedAt,
            memberDtos));
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
        return CreatedAtAction(nameof(GetTeamById), new { id = created.Id },
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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTeam(Guid id)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

        await _teamService.DeleteTeamAsync(id);
        return NoContent();
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<IEnumerable<TeamMemberDto>>> GetMembers(Guid id)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

        var members = await _teamService.GetMembersAsync(id);
        var dtos = members.Select(m => new TeamMemberDto(m.Id, m.TeamId!.Value, MemberType.Worker, m.Name, m.Badge));
        return Ok(dtos);
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<TeamMemberDto>> AddMember(Guid id, [FromBody] AddTeamMemberRequest request)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

        var member = new Personnel
        {
            Name = request.MemberName,
            Badge = request.Badge
        };
        var created = await _teamService.AddMemberAsync(id, member);
        return Ok(new TeamMemberDto(created.Id, created.TeamId!.Value, MemberType.Worker, created.Name, created.Badge));
    }

    [HttpPut("{id:guid}/members/{memberId:guid}")]
    public async Task<ActionResult<TeamMemberDto>> UpdateMember(Guid id, Guid memberId, [FromBody] UpdateTeamMemberRequest request)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

        var member = new Personnel
        {
            Name = request.MemberName,
            Badge = request.Badge
        };

        var updated = await _teamService.UpdateMemberAsync(id, memberId, member);
        if (updated == null) return NotFound();

        return Ok(new TeamMemberDto(updated.Id, updated.TeamId!.Value, MemberType.Worker, updated.Name, updated.Badge));
    }

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> DeleteMember(Guid id, Guid memberId)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

        var result = await _teamService.DeleteMemberAsync(id, memberId);
        if (!result) return NotFound();

        return NoContent();
    }

    [HttpGet("{id:guid}/events")]
    public async Task<ActionResult<IEnumerable<CollisionWarningDto>>> GetTeamEvents(
        Guid id,
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

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

    [HttpGet("{id:guid}/statistics")]
    public async Task<ActionResult<TeamStatisticsDto>> GetTeamStatistics(
        Guid id,
        [FromQuery] DateTime? startTime = null,
        [FromQuery] DateTime? endTime = null)
    {
        var team = await _teamService.GetTeamByIdAsync(id);
        if (team == null) return NotFound();

        var stats = await _teamService.GetTeamStatisticsAsync(id, startTime, endTime);

        return Ok(new TeamStatisticsDto(
            id,
            team.Name,
            stats.TotalMembers,
            stats.TotalEvents,
            stats.HighRiskEvents,
            stats.MediumRiskEvents,
            stats.LowRiskEvents,
            stats.SafetyScore,
            startTime,
            endTime));
    }
}
