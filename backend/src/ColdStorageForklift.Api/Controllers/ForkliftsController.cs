namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/forklifts")]
public class ForkliftsController : ControllerBase
{
    private readonly IForkliftService _forkliftService;
    private readonly IRepository<Team> _teamRepository;

    public ForkliftsController(IForkliftService forkliftService, IRepository<Team> teamRepository)
    {
        _forkliftService = forkliftService;
        _teamRepository = teamRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ForkliftDto>>> GetForklifts()
    {
        var forklifts = await _forkliftService.GetAllForkliftsAsync();
        var teams = _teamRepository.Query().ToDictionary(t => t.Id, t => t.Name);
        var dtos = forklifts.Select(f => new ForkliftDto(
            f.Id, f.Code, f.Model, f.Status, f.TeamId,
            f.TeamId.HasValue && teams.TryGetValue(f.TeamId.Value, out var teamName) ? teamName : null,
            f.CurrentPositionX, f.CurrentPositionY, f.Direction, f.Speed,
            f.BlindSpotRadius, f.LastPositionUpdate, f.CreatedAt));
        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ForkliftDto>> GetForklift(Guid id)
    {
        var forklift = await _forkliftService.GetForkliftByIdAsync(id);
        if (forklift == null) return NotFound();

        var teamName = forklift.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == forklift.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return Ok(new ForkliftDto(
            forklift.Id, forklift.Code, forklift.Model, forklift.Status, forklift.TeamId, teamName,
            forklift.CurrentPositionX, forklift.CurrentPositionY, forklift.Direction, forklift.Speed,
            forklift.BlindSpotRadius, forklift.LastPositionUpdate, forklift.CreatedAt));
    }

    [HttpGet("status/{status}")]
    public async Task<ActionResult<IEnumerable<ForkliftDto>>> GetForkliftsByStatus(ForkliftStatus status)
    {
        var forklifts = await _forkliftService.GetForkliftsByStatusAsync(status);
        var teams = _teamRepository.Query().ToDictionary(t => t.Id, t => t.Name);
        var dtos = forklifts.Select(f => new ForkliftDto(
            f.Id, f.Code, f.Model, f.Status, f.TeamId,
            f.TeamId.HasValue && teams.TryGetValue(f.TeamId.Value, out var teamName) ? teamName : null,
            f.CurrentPositionX, f.CurrentPositionY, f.Direction, f.Speed,
            f.BlindSpotRadius, f.LastPositionUpdate, f.CreatedAt));
        return Ok(dtos);
    }

    [HttpGet("team/{teamId:guid}")]
    public async Task<ActionResult<IEnumerable<ForkliftDto>>> GetForkliftsByTeam(Guid teamId)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null) return NotFound();

        var forklifts = await _forkliftService.GetForkliftsByTeamAsync(teamId);
        var dtos = forklifts.Select(f => new ForkliftDto(
            f.Id, f.Code, f.Model, f.Status, f.TeamId, team.Name,
            f.CurrentPositionX, f.CurrentPositionY, f.Direction, f.Speed,
            f.BlindSpotRadius, f.LastPositionUpdate, f.CreatedAt));
        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<ForkliftDto>> CreateForklift([FromBody] CreateForkliftRequest request)
    {
        var forklift = new Forklift
        {
            Code = request.Code,
            Model = request.Model,
            TeamId = request.TeamId,
            BlindSpotRadius = request.BlindSpotRadius
        };
        var created = await _forkliftService.CreateForkliftAsync(forklift);

        var teamName = created.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == created.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return CreatedAtAction(nameof(GetForklift), new { id = created.Id },
            new ForkliftDto(created.Id, created.Code, created.Model, created.Status, created.TeamId, teamName,
                created.CurrentPositionX, created.CurrentPositionY, created.Direction, created.Speed,
                created.BlindSpotRadius, created.LastPositionUpdate, created.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ForkliftDto>> UpdateForklift(Guid id, [FromBody] UpdateForkliftRequest request)
    {
        var forklift = await _forkliftService.GetForkliftByIdAsync(id);
        if (forklift == null) return NotFound();

        forklift.Code = request.Code;
        forklift.Model = request.Model;
        forklift.TeamId = request.TeamId;
        forklift.BlindSpotRadius = request.BlindSpotRadius;

        var updated = await _forkliftService.UpdateForkliftAsync(forklift);

        var teamName = updated.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == updated.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return Ok(new ForkliftDto(updated.Id, updated.Code, updated.Model, updated.Status, updated.TeamId, teamName,
            updated.CurrentPositionX, updated.CurrentPositionY, updated.Direction, updated.Speed,
            updated.BlindSpotRadius, updated.LastPositionUpdate, updated.CreatedAt));
    }

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<ForkliftDto>> UpdateForkliftStatus(Guid id, [FromBody] UpdateForkliftStatusRequest request)
    {
        var updated = await _forkliftService.UpdateForkliftStatusAsync(id, request.Status);
        if (updated == null) return NotFound();

        var teamName = updated.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == updated.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return Ok(new ForkliftDto(updated.Id, updated.Code, updated.Model, updated.Status, updated.TeamId, teamName,
            updated.CurrentPositionX, updated.CurrentPositionY, updated.Direction, updated.Speed,
            updated.BlindSpotRadius, updated.LastPositionUpdate, updated.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteForklift(Guid id)
    {
        await _forkliftService.DeleteForkliftAsync(id);
        return NoContent();
    }
}
