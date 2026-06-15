namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record TeamDto(
    Guid Id,
    string Name,
    ShiftType Shift,
    string Leader,
    DateTime CreatedAt);

public record CreateTeamRequest(
    string Name,
    ShiftType Shift,
    string Leader);

public record UpdateTeamRequest(
    string Name,
    ShiftType Shift,
    string Leader);
