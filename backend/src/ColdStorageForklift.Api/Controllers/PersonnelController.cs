namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/personnel")]
public class PersonnelController : ControllerBase
{
    private readonly IPersonnelService _personnelService;
    private readonly IRepository<Team> _teamRepository;

    public PersonnelController(IPersonnelService personnelService, IRepository<Team> teamRepository)
    {
        _personnelService = personnelService;
        _teamRepository = teamRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PersonnelDto>>> GetPersonnel()
    {
        var personnel = await _personnelService.GetAllPersonnelAsync();
        var teams = _teamRepository.Query().ToDictionary(t => t.Id, t => t.Name);
        var dtos = personnel.Select(p => new PersonnelDto(
            p.Id, p.Name, p.Badge, p.Status, p.TeamId,
            p.TeamId.HasValue && teams.TryGetValue(p.TeamId.Value, out var teamName) ? teamName : null,
            p.CurrentPositionX, p.CurrentPositionY, p.LastPositionUpdate, p.CreatedAt));
        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PersonnelDto>> GetPersonnel(Guid id)
    {
        var personnel = await _personnelService.GetPersonnelByIdAsync(id);
        if (personnel == null) return NotFound();

        var teamName = personnel.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == personnel.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return Ok(new PersonnelDto(
            personnel.Id, personnel.Name, personnel.Badge, personnel.Status, personnel.TeamId, teamName,
            personnel.CurrentPositionX, personnel.CurrentPositionY, personnel.LastPositionUpdate, personnel.CreatedAt));
    }

    [HttpGet("status/{status}")]
    public async Task<ActionResult<IEnumerable<PersonnelDto>>> GetPersonnelByStatus(PersonnelStatus status)
    {
        var personnel = await _personnelService.GetPersonnelByStatusAsync(status);
        var teams = _teamRepository.Query().ToDictionary(t => t.Id, t => t.Name);
        var dtos = personnel.Select(p => new PersonnelDto(
            p.Id, p.Name, p.Badge, p.Status, p.TeamId,
            p.TeamId.HasValue && teams.TryGetValue(p.TeamId.Value, out var teamName) ? teamName : null,
            p.CurrentPositionX, p.CurrentPositionY, p.LastPositionUpdate, p.CreatedAt));
        return Ok(dtos);
    }

    [HttpGet("team/{teamId:guid}")]
    public async Task<ActionResult<IEnumerable<PersonnelDto>>> GetPersonnelByTeam(Guid teamId)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null) return NotFound();

        var personnel = await _personnelService.GetPersonnelByTeamIdAsync(teamId);
        var dtos = personnel.Select(p => new PersonnelDto(
            p.Id, p.Name, p.Badge, p.Status, p.TeamId, team.Name,
            p.CurrentPositionX, p.CurrentPositionY, p.LastPositionUpdate, p.CreatedAt));
        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<PersonnelDto>> CreatePersonnel([FromBody] CreatePersonnelRequest request)
    {
        var personnel = new Personnel
        {
            Name = request.Name,
            Badge = request.Badge,
            TeamId = request.TeamId
        };
        var created = await _personnelService.CreatePersonnelAsync(personnel);

        var teamName = created.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == created.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return CreatedAtAction(nameof(GetPersonnel), new { id = created.Id },
            new PersonnelDto(created.Id, created.Name, created.Badge, created.Status, created.TeamId, teamName,
                created.CurrentPositionX, created.CurrentPositionY, created.LastPositionUpdate, created.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PersonnelDto>> UpdatePersonnel(Guid id, [FromBody] UpdatePersonnelRequest request)
    {
        var personnel = await _personnelService.GetPersonnelByIdAsync(id);
        if (personnel == null) return NotFound();

        personnel.Name = request.Name;
        personnel.Badge = request.Badge;
        personnel.TeamId = request.TeamId;

        var updated = await _personnelService.UpdatePersonnelAsync(personnel);

        var teamName = updated.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == updated.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return Ok(new PersonnelDto(updated.Id, updated.Name, updated.Badge, updated.Status, updated.TeamId, teamName,
            updated.CurrentPositionX, updated.CurrentPositionY, updated.LastPositionUpdate, updated.CreatedAt));
    }

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<PersonnelDto>> UpdatePersonnelStatus(Guid id, [FromBody] UpdatePersonnelStatusRequest request)
    {
        var personnel = await _personnelService.GetPersonnelByIdAsync(id);
        if (personnel == null) return NotFound();

        await _personnelService.SetPersonnelStatusAsync(id, request.Status);

        var updated = await _personnelService.GetPersonnelByIdAsync(id);

        var teamName = updated!.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == updated.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return Ok(new PersonnelDto(updated.Id, updated.Name, updated.Badge, updated.Status, updated.TeamId, teamName,
            updated.CurrentPositionX, updated.CurrentPositionY, updated.LastPositionUpdate, updated.CreatedAt));
    }

    [HttpPut("{id:guid}/team")]
    public async Task<ActionResult<PersonnelDto>> AssignTeam(Guid id, [FromBody] AssignTeamRequest request)
    {
        var personnel = await _personnelService.GetPersonnelByIdAsync(id);
        if (personnel == null) return NotFound();

        await _personnelService.AssignToTeamAsync(id, request.TeamId);

        var updated = await _personnelService.GetPersonnelByIdAsync(id);

        var teamName = updated!.TeamId.HasValue
            ? _teamRepository.Query().Where(t => t.Id == updated.TeamId.Value).Select(t => t.Name).FirstOrDefault()
            : null;

        return Ok(new PersonnelDto(updated.Id, updated.Name, updated.Badge, updated.Status, updated.TeamId, teamName,
            updated.CurrentPositionX, updated.CurrentPositionY, updated.LastPositionUpdate, updated.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePersonnel(Guid id)
    {
        await _personnelService.DeletePersonnelAsync(id);
        return NoContent();
    }
}
