namespace ColdStorageForklift.Core.Entities;

public class Forklift
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public Guid? TeamId { get; set; }
    public double CurrentPositionX { get; set; }
    public double CurrentPositionY { get; set; }
    public double Direction { get; set; }
    public double Speed { get; set; }
    public ForkliftStatus Status { get; set; }
    public double BlindSpotRadius { get; set; } = 8.0;
    public DateTime LastPositionUpdate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Team? Team { get; set; }
    public List<BlindSpotZone> BlindSpotZones { get; set; } = [];
}

public enum ForkliftStatus
{
    Online = 0,
    Offline = 1,
    Charging = 2,
    Maintenance = 3
}
