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

    public async Task RemoveMemberAsync(Guid teamId, Guid personnelId)
    {
        var member = await _context.TeamMembers
            .FirstOrDefaultAsync(m => m.TeamId == teamId && m.PersonnelId == personnelId);
        if (member is not null)
        {
            _context.TeamMembers.Remove(member);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IReadOnlyList<Forklift>> GetForkliftsByTeamIdAsync(Guid teamId)
    {
        return await _context.Forklifts.Where(f => f.TeamId == teamId).ToListAsync();
    }

    public async Task<IReadOnlyList<Personnel>> GetPersonnelByTeamIdAsync(Guid teamId)
    {
        return await _context.Personnel.Where(p => p.TeamId == teamId).ToListAsync();
    }
}
