namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record TeamDto(
    Guid Id,
    string Name,
    ShiftType Shift,
    string Leader,
    DateTime CreatedAt);

public record TeamDetailDto(
    Guid Id,
    string Name,
    ShiftType Shift,
    string Leader,
    DateTime CreatedAt,
    IEnumerable<TeamMemberDto> Members);

public record CreateTeamRequest(
    string Name,
    ShiftType Shift,
    string Leader);

public record UpdateTeamRequest(
    string Name,
    ShiftType Shift,
    string Leader);

public record UpdateTeamMemberRequest(
    MemberType MemberType,
    string MemberName,
    string Badge);

public record TeamStatisticsDto(
    Guid TeamId,
    string TeamName,
    int TotalMembers,
    int TotalEvents,
    int HighRiskEvents,
    int MediumRiskEvents,
    int LowRiskEvents,
    double SafetyScore,
    DateTime? StartTime,
    DateTime? EndTime);
