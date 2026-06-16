namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record PersonnelDto(
    Guid Id,
    string Name,
    string Badge,
    PersonnelStatus Status,
    Guid? TeamId,
    string? TeamName,
    double CurrentPositionX,
    double CurrentPositionY,
    DateTime LastPositionUpdate,
    DateTime CreatedAt);

public record CreatePersonnelRequest(
    string Name,
    string Badge,
    Guid? TeamId);

public record UpdatePersonnelRequest(
    string Name,
    string Badge,
    Guid? TeamId);

public record UpdatePersonnelStatusRequest(
    PersonnelStatus Status);

public record AssignTeamRequest(
    Guid? TeamId);
