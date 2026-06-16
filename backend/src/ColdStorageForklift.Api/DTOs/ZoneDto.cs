namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record ZoneDto(
    Guid Id,
    string Name,
    ZoneType Type,
    double Width,
    double Height,
    double PositionX,
    double PositionY,
    double? Temperature,
    bool IsHighRisk,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<ZoneObstacleDto> Obstacles);

public record ZoneObstacleDto(
    Guid Id,
    string Name,
    double PositionX,
    double PositionY,
    double Width,
    double Height,
    ObstacleType Type);

public record CreateZoneRequest(
    string Name,
    ZoneType Type,
    double Width,
    double Height,
    double PositionX,
    double PositionY,
    double? Temperature,
    bool IsHighRisk);

public record UpdateZoneRequest(
    string Name,
    ZoneType Type,
    double Width,
    double Height,
    double PositionX,
    double PositionY,
    double? Temperature,
    bool IsHighRisk);

public record CreateObstacleRequest(
    string Name,
    double PositionX,
    double PositionY,
    double Width,
    double Height,
    ObstacleType Type);

public record UpdateObstacleRequest(
    string Name,
    double PositionX,
    double PositionY,
    double Width,
    double Height,
    ObstacleType Type);

public record AssociateObstaclesRequest(
    List<Guid> ObstacleIds);
