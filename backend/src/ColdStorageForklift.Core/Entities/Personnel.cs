namespace ColdStorageForklift.Core.Entities;

public class Personnel
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Badge { get; set; } = string.Empty;
    public Guid? TeamId { get; set; }
    public double CurrentPositionX { get; set; }
    public double CurrentPositionY { get; set; }
    public PersonnelStatus Status { get; set; }
    public DateTime LastPositionUpdate { get; set; }
    public DateTime CreatedAt { get; set; }
    public Team? Team { get; set; }
}

public enum PersonnelStatus
{
    Online = 0,
    Offline = 1
}
