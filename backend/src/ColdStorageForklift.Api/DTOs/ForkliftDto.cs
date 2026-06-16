namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record ForkliftDto(
    Guid Id,
    string Code,
    string Model,
    ForkliftStatus Status,
    Guid? TeamId,
    string? TeamName,
    double CurrentPositionX,
    double CurrentPositionY,
    double Direction,
    double Speed,
    double BlindSpotRadius,
    DateTime LastPositionUpdate,
    DateTime CreatedAt);

public record CreateForkliftRequest(
    string Code,
    string Model,
    Guid? TeamId,
    double BlindSpotRadius);

public record UpdateForkliftRequest(
    string Code,
    string Model,
    Guid? TeamId,
    double BlindSpotRadius);

public record UpdateForkliftStatusRequest(
    ForkliftStatus Status);
