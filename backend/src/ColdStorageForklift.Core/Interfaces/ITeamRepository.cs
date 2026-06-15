using ColdStorageForklift.Core.Entities;

namespace ColdStorageForklift.Core.Interfaces;

public interface ITeamRepository
{
    Task<Team?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Team>> GetAllAsync();
    Task<Team> AddAsync(Team team);
    Task UpdateAsync(Team team);
    Task DeleteAsync(Guid id);
    Task<IReadOnlyList<TeamMember>> GetMembersByTeamIdAsync(Guid teamId);
    Task<TeamMember> AddMemberAsync(TeamMember member);
    Task RemoveMemberAsync(Guid memberId);
    Task<IReadOnlyList<EventLog>> GetTeamEventsAsync(Guid teamId, DateTime? from = null, DateTime? to = null);
}
