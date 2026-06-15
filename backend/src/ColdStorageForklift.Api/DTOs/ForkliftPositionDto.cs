namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record ForkliftPositionDto(
    Guid Id,
    string Code,
    string Model,
    double CurrentPositionX,
    double CurrentPositionY,
    double Direction,
    double Speed,
    ForkliftStatus Status,
    DateTime? LastPositionUpdate);

public record UpdateForkliftPositionRequest(
    double PositionX,
    double PositionY,
    double Direction,
    double Speed);
