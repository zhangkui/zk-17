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
    Task<Personnel> AddMemberAsync(Guid teamId, Personnel member);
    Task<Personnel?> UpdateMemberAsync(Guid teamId, Guid memberId, Personnel member);
    Task<bool> DeleteMemberAsync(Guid teamId, Guid memberId);
    Task<IEnumerable<Personnel>> GetMembersAsync(Guid teamId);
    Task<IEnumerable<CollisionWarning>> GetTeamEventsAsync(Guid teamId, DateTime? startTime = null, DateTime? endTime = null);
    Task<(int TotalMembers, int TotalEvents, int HighRiskEvents, int MediumRiskEvents, int LowRiskEvents, double SafetyScore)> 
        GetTeamStatisticsAsync(Guid teamId, DateTime? startTime = null, DateTime? endTime = null);
}

public class TeamService : ITeamService
{
    private readonly IRepository<Team> _teamRepository;
    private readonly IRepository<CollisionWarning> _warningRepository;
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Personnel> _personnelRepository;

    public TeamService(
        IRepository<Team> teamRepository,
        IRepository<CollisionWarning> warningRepository,
        IRepository<Forklift> forkliftRepository,
        IRepository<Personnel> personnelRepository)
    {
        _teamRepository = teamRepository;
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
        if (team == null) return;

        var forklifts = _forkliftRepository.Query().Where(f => f.TeamId == id).ToList();
        foreach (var forklift in forklifts)
        {
            forklift.TeamId = null;
            await _forkliftRepository.UpdateAsync(forklift);
        }

        var personnel = _personnelRepository.Query().Where(p => p.TeamId == id).ToList();
        foreach (var person in personnel)
        {
            person.TeamId = null;
            await _personnelRepository.UpdateAsync(person);
        }

        await _teamRepository.DeleteAsync(team);
    }

    public async Task<Personnel?> UpdateMemberAsync(Guid teamId, Guid memberId, Personnel member)
    {
        var existingMember = await _personnelRepository.GetByIdAsync(memberId);
        if (existingMember == null || existingMember.TeamId != teamId)
            return null;

        existingMember.Name = member.Name;
        existingMember.Badge = member.Badge;

        await _personnelRepository.UpdateAsync(existingMember);
        return existingMember;
    }

    public async Task<bool> DeleteMemberAsync(Guid teamId, Guid memberId)
    {
        var member = await _personnelRepository.GetByIdAsync(memberId);
        if (member == null || member.TeamId != teamId)
            return false;

        member.TeamId = null;
        await _personnelRepository.UpdateAsync(member);
        return true;
    }

    public async Task<(int TotalMembers, int TotalEvents, int HighRiskEvents, int MediumRiskEvents, int LowRiskEvents, double SafetyScore)> 
        GetTeamStatisticsAsync(Guid teamId, DateTime? startTime = null, DateTime? endTime = null)
    {
        var team = await _teamRepository.GetByIdAsync(teamId);
        if (team == null)
            return (0, 0, 0, 0, 0, 0);

        var totalMembers = _personnelRepository.Query().Count(p => p.TeamId == teamId);

        var events = (await GetTeamEventsAsync(teamId, startTime, endTime)).ToList();
        var totalEvents = events.Count;
        var criticalRiskEvents = events.Count(e => e.RiskLevel == RiskLevel.Critical);
        var highRiskEvents = events.Count(e => e.RiskLevel == RiskLevel.High);
        var mediumRiskEvents = events.Count(e => e.RiskLevel == RiskLevel.Medium);
        var lowRiskEvents = events.Count(e => e.RiskLevel == RiskLevel.Low);

        double safetyScore = 100.0;
        if (totalEvents > 0)
        {
            var weightedScore = criticalRiskEvents * 20 + highRiskEvents * 10 + mediumRiskEvents * 5 + lowRiskEvents * 2;
            safetyScore = Math.Max(0, 100 - weightedScore);
        }

        return (totalMembers, totalEvents, highRiskEvents, mediumRiskEvents, lowRiskEvents, safetyScore);
    }

    public async Task<Team?> GetTeamByIdAsync(Guid id)
    {
        return await _teamRepository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<Team>> GetAllTeamsAsync()
    {
        return await _teamRepository.GetAllAsync();
    }

    public async Task<Personnel> AddMemberAsync(Guid teamId, Personnel member)
    {
        member.Id = Guid.NewGuid();
        member.TeamId = teamId;
        member.CreatedAt = DateTime.UtcNow;
        member.Status = PersonnelStatus.Offline;
        return await _personnelRepository.AddAsync(member);
    }

    public async Task<IEnumerable<Personnel>> GetMembersAsync(Guid teamId)
    {
        return await Task.FromResult(_personnelRepository.Query().Where(p => p.TeamId == teamId).ToList());
    }

    public async Task<IEnumerable<CollisionWarning>> GetTeamEventsAsync(Guid teamId, DateTime? startTime = null, DateTime? endTime = null)
    {
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
