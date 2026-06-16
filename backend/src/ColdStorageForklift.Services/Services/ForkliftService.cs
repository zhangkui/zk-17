namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface IForkliftService
{
    Task<Forklift> CreateForkliftAsync(Forklift forklift);
    Task<Forklift> UpdateForkliftAsync(Forklift forklift);
    Task DeleteForkliftAsync(Guid id);
    Task<Forklift?> GetForkliftByIdAsync(Guid id);
    Task<IEnumerable<Forklift>> GetAllForkliftsAsync();
    Task<IEnumerable<Forklift>> GetForkliftsByStatusAsync(ForkliftStatus status);
    Task<IEnumerable<Forklift>> GetForkliftsByTeamAsync(Guid teamId);
    Task<Forklift?> UpdateForkliftStatusAsync(Guid id, ForkliftStatus status);
}

public class ForkliftService : IForkliftService
{
    private readonly IRepository<Forklift> _forkliftRepository;
    private readonly IRepository<Team> _teamRepository;

    public ForkliftService(IRepository<Forklift> forkliftRepository, IRepository<Team> teamRepository)
    {
        _forkliftRepository = forkliftRepository;
        _teamRepository = teamRepository;
    }

    public async Task<Forklift> CreateForkliftAsync(Forklift forklift)
    {
        forklift.Id = Guid.NewGuid();
        forklift.CreatedAt = DateTime.UtcNow;
        forklift.LastPositionUpdate = DateTime.UtcNow;
        forklift.Status = ForkliftStatus.Offline;
        return await _forkliftRepository.AddAsync(forklift);
    }

    public async Task<Forklift> UpdateForkliftAsync(Forklift forklift)
    {
        await _forkliftRepository.UpdateAsync(forklift);
        return forklift;
    }

    public async Task DeleteForkliftAsync(Guid id)
    {
        var forklift = await _forkliftRepository.GetByIdAsync(id);
        if (forklift != null) await _forkliftRepository.DeleteAsync(forklift);
    }

    public async Task<Forklift?> GetForkliftByIdAsync(Guid id)
    {
        return await _forkliftRepository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<Forklift>> GetAllForkliftsAsync()
    {
        return await _forkliftRepository.GetAllAsync();
    }

    public async Task<IEnumerable<Forklift>> GetForkliftsByStatusAsync(ForkliftStatus status)
    {
        return await Task.FromResult(_forkliftRepository.Query().Where(f => f.Status == status).ToList());
    }

    public async Task<IEnumerable<Forklift>> GetForkliftsByTeamAsync(Guid teamId)
    {
        return await Task.FromResult(_forkliftRepository.Query().Where(f => f.TeamId == teamId).ToList());
    }

    public async Task<Forklift?> UpdateForkliftStatusAsync(Guid id, ForkliftStatus status)
    {
        var forklift = await _forkliftRepository.GetByIdAsync(id);
        if (forklift == null) return null;

        forklift.Status = status;
        forklift.UpdatedAt = DateTime.UtcNow;
        await _forkliftRepository.UpdateAsync(forklift);
        return forklift;
    }

    public async Task UpdateForkliftPositionAsync(Guid id, double x, double y, double direction, double speed)
    {
        var forklift = await _forkliftRepository.GetByIdAsync(id);
        if (forklift != null)
        {
            forklift.CurrentPositionX = x;
            forklift.CurrentPositionY = y;
            forklift.Direction = direction;
            forklift.Speed = speed;
            forklift.LastPositionUpdate = DateTime.UtcNow;
            forklift.UpdatedAt = DateTime.UtcNow;
            await _forkliftRepository.UpdateAsync(forklift);
        }
    }
}
