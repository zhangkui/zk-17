namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/blindspots")]
public class BlindSpotsController : ControllerBase
{
    private readonly IBlindSpotService _blindSpotService;

    public BlindSpotsController(IBlindSpotService blindSpotService)
    {
        _blindSpotService = blindSpotService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BlindSpotDto>>> GetActiveBlindSpots()
    {
        var blindSpots = await _blindSpotService.GetActiveBlindSpotsAsync();
        var dtos = blindSpots.Select(bs => new BlindSpotDto(
            bs.Id, bs.ForkliftId, bs.CenterX, bs.CenterY, bs.Radius,
            bs.Direction, bs.RiskLevel, bs.DetectedAt, bs.IsActive,
            new List<PersonnelPositionDto>()));
        return Ok(dtos);
    }

    [HttpGet("forklift/{id:guid}")]
    public async Task<ActionResult<BlindSpotDto>> GetForkliftBlindSpot(Guid id)
    {
        var blindSpot = await _blindSpotService.GetForkliftBlindSpotAsync(id);
        if (blindSpot == null) return NotFound();

        var personnel = await _blindSpotService.IdentifyPersonnelInBlindSpotAsync(id);
        var personnelDtos = personnel.Select(p => new PersonnelPositionDto(
            p.Id, p.Name, p.Badge, p.CurrentPositionX, p.CurrentPositionY,
            p.Status, p.LastPositionUpdate)).ToList();

        return Ok(new BlindSpotDto(
            blindSpot.Id, blindSpot.ForkliftId, blindSpot.CenterX, blindSpot.CenterY,
            blindSpot.Radius, blindSpot.Direction, blindSpot.RiskLevel,
            blindSpot.DetectedAt, blindSpot.IsActive, personnelDtos));
    }

    [HttpPost("calculate")]
    public async Task<ActionResult<BlindSpotDto>> CalculateBlindSpots()
    {
        await _blindSpotService.RecalculateAllBlindSpotsAsync();
        var blindSpots = await _blindSpotService.GetActiveBlindSpotsAsync();
        var dtos = blindSpots.Select(bs => new BlindSpotDto(
            bs.Id, bs.ForkliftId, bs.CenterX, bs.CenterY, bs.Radius,
            bs.Direction, bs.RiskLevel, bs.DetectedAt, bs.IsActive,
            new List<PersonnelPositionDto>()));
        return Ok(dtos);
    }
}
