namespace ColdStorageForklift.Services;

using ColdStorageForklift.Core.Entities;
using ColdStorageForklift.Infrastructure.Repositories;

public interface IPersonnelService
{
    Task<Personnel> CreatePersonnelAsync(Personnel personnel);
    Task<Personnel> UpdatePersonnelAsync(Personnel personnel);
    Task DeletePersonnelAsync(Guid id);
    Task<Personnel?> GetPersonnelByIdAsync(Guid id);
    Task<IEnumerable<Personnel>> GetAllPersonnelAsync();
    Task<IEnumerable<Personnel>> GetPersonnelByStatusAsync(PersonnelStatus status);
    Task<IEnumerable<Personnel>> GetPersonnelByTeamIdAsync(Guid teamId);
    Task SetPersonnelStatusAsync(Guid id, PersonnelStatus status);
    Task UpdatePersonnelPositionAsync(Guid id, double x, double y);
    Task AssignToTeamAsync(Guid id, Guid? teamId);
}

public class PersonnelService : IPersonnelService
{
    private readonly IRepository<Personnel> _personnelRepository;

    public PersonnelService(IRepository<Personnel> personnelRepository)
    {
        _personnelRepository = personnelRepository;
    }

    public async Task<Personnel> CreatePersonnelAsync(Personnel personnel)
    {
        personnel.Id = Guid.NewGuid();
        personnel.CreatedAt = DateTime.UtcNow;
        return await _personnelRepository.AddAsync(personnel);
    }

    public async Task<Personnel> UpdatePersonnelAsync(Personnel personnel)
    {
        await _personnelRepository.UpdateAsync(personnel);
        return personnel;
    }

    public async Task DeletePersonnelAsync(Guid id)
    {
        var personnel = await _personnelRepository.GetByIdAsync(id);
        if (personnel != null) await _personnelRepository.DeleteAsync(personnel);
    }

    public async Task<Personnel?> GetPersonnelByIdAsync(Guid id)
    {
        return await _personnelRepository.GetByIdAsync(id);
    }

    public async Task<IEnumerable<Personnel>> GetAllPersonnelAsync()
    {
        return await _personnelRepository.GetAllAsync();
    }

    public async Task<IEnumerable<Personnel>> GetPersonnelByStatusAsync(PersonnelStatus status)
    {
        return await Task.FromResult(_personnelRepository.Query().Where(p => p.Status == status).ToList());
    }

    public async Task<IEnumerable<Personnel>> GetPersonnelByTeamIdAsync(Guid teamId)
    {
        return await Task.FromResult(_personnelRepository.Query().Where(p => p.TeamId == teamId).ToList());
    }

    public async Task SetPersonnelStatusAsync(Guid id, PersonnelStatus status)
    {
        var personnel = await _personnelRepository.GetByIdAsync(id);
        if (personnel != null)
        {
            personnel.Status = status;
            await _personnelRepository.UpdateAsync(personnel);
        }
    }

    public async Task UpdatePersonnelPositionAsync(Guid id, double x, double y)
    {
        var personnel = await _personnelRepository.GetByIdAsync(id);
        if (personnel != null)
        {
            personnel.CurrentPositionX = x;
            personnel.CurrentPositionY = y;
            personnel.LastPositionUpdate = DateTime.UtcNow;
            await _personnelRepository.UpdateAsync(personnel);
        }
    }

    public async Task AssignToTeamAsync(Guid id, Guid? teamId)
    {
        var personnel = await _personnelRepository.GetByIdAsync(id);
        if (personnel != null)
        {
            personnel.TeamId = teamId;
            await _personnelRepository.UpdateAsync(personnel);
        }
    }
}
