namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record TeamMemberDto(
    Guid Id,
    Guid TeamId,
    MemberType Type,
    string MemberName,
    string Badge);

public record AddTeamMemberRequest(
    MemberType Type,
    string MemberName,
    string Badge);
