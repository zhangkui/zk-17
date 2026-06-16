namespace ColdStorageForklift.Api.Controllers;

using ColdStorageForklift.Api.DTOs;
using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;
using ColdStorageForklift.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/zones")]
public class ZonesController : ControllerBase
{
    private readonly IZoneService _zoneService;
    private readonly IRepository<ZoneObstacle> _obstacleRepository;

    public ZonesController(IZoneService zoneService, IRepository<ZoneObstacle> obstacleRepository)
    {
        _zoneService = zoneService;
        _obstacleRepository = obstacleRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ZoneDto>>> GetZones()
    {
        var zones = await _zoneService.GetAllZonesAsync();
        var dtos = zones.Select(z => new ZoneDto(
            z.Id, z.Name, z.Type, z.Width, z.Height,
            z.PositionX, z.PositionY, z.Temperature, z.IsHighRisk,
            z.CreatedAt, z.UpdatedAt,
            _obstacleRepository.Query().Where(o => o.ZoneId == z.Id)
                .Select(o => new ZoneObstacleDto(o.Id, o.Name, o.PositionX, o.PositionY, o.Width, o.Height, o.Type))
                .ToList()
        ));
        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ZoneDto>> GetZone(Guid id)
    {
        var zone = await _zoneService.GetZoneWithObstaclesAsync(id);
        if (zone == null) return NotFound();

        var obstacles = _obstacleRepository.Query().Where(o => o.ZoneId == id)
            .Select(o => new ZoneObstacleDto(o.Id, o.Name, o.PositionX, o.PositionY, o.Width, o.Height, o.Type))
            .ToList();

        return Ok(new ZoneDto(zone.Id, zone.Name, zone.Type, zone.Width, zone.Height,
            zone.PositionX, zone.PositionY, zone.Temperature, zone.IsHighRisk,
            zone.CreatedAt, zone.UpdatedAt, obstacles));
    }

    [HttpPost]
    public async Task<ActionResult<ZoneDto>> CreateZone([FromBody] CreateZoneRequest request)
    {
        var zone = new Zone
        {
            Name = request.Name,
            Type = request.Type,
            Width = request.Width,
            Height = request.Height,
            PositionX = request.PositionX,
            PositionY = request.PositionY,
            Temperature = request.Temperature,
            IsHighRisk = request.IsHighRisk
        };
        var created = await _zoneService.CreateZoneAsync(zone);
        return CreatedAtAction(nameof(GetZone), new { id = created.Id },
            new ZoneDto(created.Id, created.Name, created.Type, created.Width, created.Height,
                created.PositionX, created.PositionY, created.Temperature, created.IsHighRisk,
                created.CreatedAt, created.UpdatedAt, new List<ZoneObstacleDto>()));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ZoneDto>> UpdateZone(Guid id, [FromBody] UpdateZoneRequest request)
    {
        var zone = await _zoneService.GetZoneByIdAsync(id);
        if (zone == null) return NotFound();

        zone.Name = request.Name;
        zone.Type = request.Type;
        zone.Width = request.Width;
        zone.Height = request.Height;
        zone.PositionX = request.PositionX;
        zone.PositionY = request.PositionY;
        zone.Temperature = request.Temperature;
        zone.IsHighRisk = request.IsHighRisk;

        var updated = await _zoneService.UpdateZoneAsync(zone);
        var obstacles = _obstacleRepository.Query().Where(o => o.ZoneId == id)
            .Select(o => new ZoneObstacleDto(o.Id, o.Name, o.PositionX, o.PositionY, o.Width, o.Height, o.Type))
            .ToList();

        return Ok(new ZoneDto(updated.Id, updated.Name, updated.Type, updated.Width, updated.Height,
            updated.PositionX, updated.PositionY, updated.Temperature, updated.IsHighRisk,
            updated.CreatedAt, updated.UpdatedAt, obstacles));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteZone(Guid id)
    {
        await _zoneService.DeleteZoneAsync(id);
        return NoContent();
    }

    [HttpGet("{zoneId:guid}/obstacles")]
    public async Task<ActionResult<IEnumerable<ZoneObstacleDto>>> GetObstaclesByZone(Guid zoneId)
    {
        var zone = await _zoneService.GetZoneByIdAsync(zoneId);
        if (zone == null) return NotFound();

        var obstacles = _obstacleRepository.Query()
            .Where(o => o.ZoneId == zoneId)
            .Select(o => new ZoneObstacleDto(o.Id, o.Name, o.PositionX, o.PositionY, o.Width, o.Height, o.Type))
            .ToList();

        return Ok(obstacles);
    }

    [HttpPost("{zoneId:guid}/obstacles")]
    public async Task<ActionResult<ZoneObstacleDto>> CreateObstacle(Guid zoneId, [FromBody] CreateObstacleRequest request)
    {
        var zone = await _zoneService.GetZoneByIdAsync(zoneId);
        if (zone == null) return NotFound();

        var obstacle = new ZoneObstacle
        {
            ZoneId = zoneId,
            Name = request.Name,
            PositionX = request.PositionX,
            PositionY = request.PositionY,
            Width = request.Width,
            Height = request.Height,
            Type = request.Type
        };

        var created = await _obstacleRepository.AddAsync(obstacle);

        return CreatedAtAction(nameof(GetObstaclesByZone), new { zoneId = zoneId },
            new ZoneObstacleDto(created.Id, created.Name, created.PositionX, created.PositionY, created.Width, created.Height, created.Type));
    }

    [HttpPut("obstacles/{obstacleId:guid}")]
    public async Task<ActionResult<ZoneObstacleDto>> UpdateObstacle(Guid obstacleId, [FromBody] UpdateObstacleRequest request)
    {
        var obstacle = await _obstacleRepository.GetByIdAsync(obstacleId);
        if (obstacle == null) return NotFound();

        obstacle.Name = request.Name;
        obstacle.PositionX = request.PositionX;
        obstacle.PositionY = request.PositionY;
        obstacle.Width = request.Width;
        obstacle.Height = request.Height;
        obstacle.Type = request.Type;

        await _obstacleRepository.UpdateAsync(obstacle);

        return Ok(new ZoneObstacleDto(obstacle.Id, obstacle.Name, obstacle.PositionX, obstacle.PositionY, obstacle.Width, obstacle.Height, obstacle.Type));
    }

    [HttpDelete("obstacles/{obstacleId:guid}")]
    public async Task<IActionResult> DeleteObstacle(Guid obstacleId)
    {
        var obstacle = await _obstacleRepository.GetByIdAsync(obstacleId);
        if (obstacle == null) return NotFound();

        await _obstacleRepository.DeleteAsync(obstacle);
        return NoContent();
    }

    [HttpPut("{zoneId:guid}/obstacles/associate")]
    public async Task<IActionResult> AssociateObstacles(Guid zoneId, [FromBody] AssociateObstaclesRequest request)
    {
        var zone = await _zoneService.GetZoneByIdAsync(zoneId);
        if (zone == null) return NotFound();

        foreach (var obstacleId in request.ObstacleIds)
        {
            var obstacle = await _obstacleRepository.GetByIdAsync(obstacleId);
            if (obstacle != null)
            {
                obstacle.ZoneId = zoneId;
                await _obstacleRepository.UpdateAsync(obstacle);
            }
        }

        return NoContent();
    }
}
