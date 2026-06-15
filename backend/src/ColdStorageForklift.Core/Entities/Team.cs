namespace ColdStorageForklift.Core.Entities;

public class Team
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ShiftType Shift { get; set; }
    public string Leader { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<TeamMember> TeamMembers { get; set; } = [];
    public List<Forklift> Forklifts { get; set; } = [];
    public List<Personnel> Personnel { get; set; } = [];
}

public enum ShiftType
{
    Morning = 0,
    Afternoon = 1,
    Night = 2
}
