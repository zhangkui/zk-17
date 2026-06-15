using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Core.Interfaces;
using ColdStorageForklift.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ColdStorageForklift.Infrastructure.Repositories;

public class TeamRepository : ITeamRepository
{
    private readonly AppDbContext _context;

    public TeamRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Team?> GetByIdAsync(Guid id)
    {
        return await _context.Teams.FindAsync(id);
    }

    public async Task<IReadOnlyList<Team>> GetAllAsync()
    {
        return await _context.Teams.ToListAsync();
    }

    public async Task<Team> AddAsync(Team team)
    {
        _context.Teams.Add(team);
        await _context.SaveChangesAsync();
        return team;
    }

    public async Task UpdateAsync(Team team)
    {
        _context.Teams.Update(team);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var team = await _context.Teams.FindAsync(id);
        if (team is not null)
        {
            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IReadOnlyList<TeamMember>> GetMembersByTeamIdAsync(Guid teamId)
    {
        return await _context.TeamMembers.Where(m => m.TeamId == teamId).ToListAsync();
    }

    public async Task<TeamMember> AddMemberAsync(TeamMember member)
    {
        _context.TeamMembers.Add(member);
        await _context.SaveChangesAsync();
        return member;
    }

    public async Task RemoveMemberAsync(Guid memberId)
    {
        var member = await _context.TeamMembers.FindAsync(memberId);
        if (member is not null)
        {
            _context.TeamMembers.Remove(member);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IReadOnlyList<EventLog>> GetTeamEventsAsync(Guid teamId, DateTime? from = null, DateTime? to = null)
    {
        var query = _context.EventLogs.Where(e => e.TeamId == teamId);

        if (from.HasValue)
            query = query.Where(e => e.OccurredAt >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.OccurredAt <= to.Value);

        return await query.OrderByDescending(e => e.OccurredAt).ToListAsync();
    }
}
