namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface ITeamService
{
    Task<Team> CreateTeamAsync(Team team);
    Task<Team> UpdateTeamAsync(Team team);
    Task DeleteTeamAsync(Guid id);
    Task<Team?> GetTeamByIdAsync(Guid id);
    Task<IEnumerable<Team>> GetAllTeamsAsync();
    Task<TeamMember> AddMemberAsync(Guid teamId, TeamMember member);
    Task<IEnumerable<TeamMember>> GetMembersAsync(Guid teamId);
    Task<IEnumerable<CollisionWarning>> GetTeamEventsAsync(Guid teamId, DateTime? startTime = null, DateTime? endTime = null);
}

public class TeamService : ITeamService
{
    private readonly IRepository<Team> _teamRepository;
    private readonly IRepository<TeamMember> _memberRepository;
    private readonly IRepository<CollisionWarning> _warningRepository;
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Personnel> _personnelRepository;

    public TeamService(
        IRepository<Team> teamRepository,
        IRepository<TeamMember> memberRepository,
        IRepository<CollisionWarning> warningRepository,
        IRepository<Forklift> forkliftRepository,
        IRepository<Personnel> personnelRepository)
    {
        _teamRepository = teamRepository;
        _memberRepository = memberRepository;
        _warningRepository = warningRepository;
        _forkliftRepository = forkliftRepository;
        _personnelRepository = personnelRepository;
    }

    public async Task<Team> CreateTeamAsync(Team team)
    {
        team.Id = Guid.NewGuid();
        team.CreatedAt = DateTime.UtcNow;
        return await _teamRepository.AddAsync(team);
    }

    public async Task<Team> UpdateTeamAsync(Team team)
    {
        await _teamRepository.UpdateAsync(team);
        return team;
    }

    public async Task DeleteTeamAsync(Guid id)
    {
        var team = await _teamRepository.GetByIdAsync(id);
        if (team != null) await _teamRepository.DeleteAsync(team);
    }

    public async Task<Team?> GetTeamByIdAsync(Guid id)
    {
        return await _teamRepository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<Team>> GetAllTeamsAsync()
    {
        return await _teamRepository.GetAllAsync();
    }

    public async Task<TeamMember> AddMemberAsync(Guid teamId, TeamMember member)
    {
        member.Id = Guid.NewGuid();
        member.TeamId = teamId;
        return await _memberRepository.AddAsync(member);
    }

    public async Task<IEnumerable<TeamMember>> GetMembersAsync(Guid teamId)
    {
        return await Task.FromResult(_memberRepository.Query().Where(m => m.TeamId == teamId).ToList());
    }

    public async Task<IEnumerable<CollisionWarning>> GetTeamEventsAsync(Guid teamId, DateTime? startTime = null, DateTime? endTime = null)
    {
        var memberBadges = _memberRepository.Query()
            .Where(m => m.TeamId == teamId)
            .Select(m => m.Badge)
            .ToHashSet();

        var forkliftIds = _forkliftRepository.Query()
            .Where(f => f.TeamId == teamId)
            .Select(f => f.Id)
            .ToHashSet();

        var personnelIds = _personnelRepository.Query()
            .Where(p => p.TeamId == teamId)
            .Select(p => p.Id)
            .ToHashSet();

        var query = _warningRepository.Query()
            .Where(w => forkliftIds.Contains(w.ForkliftId) ||
                        (w.PersonnelId.HasValue && personnelIds.Contains(w.PersonnelId.Value)));

        if (startTime.HasValue)
            query = query.Where(w => w.CreatedAt >= startTime.Value);

        if (endTime.HasValue)
            query = query.Where(w => w.CreatedAt <= endTime.Value);

        return await Task.FromResult(query.OrderByDescending(w => w.CreatedAt).ToList());
    }
}
