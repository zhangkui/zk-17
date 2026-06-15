namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record PersonnelPositionDto(
    Guid Id,
    string Name,
    string Badge,
    double CurrentPositionX,
    double CurrentPositionY,
    PersonnelStatus Status,
    DateTime? LastPositionUpdate);

public record UpdatePersonnelPositionRequest(
    double PositionX,
    double PositionY);
