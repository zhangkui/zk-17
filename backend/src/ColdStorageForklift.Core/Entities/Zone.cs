namespace ColdStorageForklift.Core.Entities;

public class Zone
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ZoneType Type { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public double? Temperature { get; set; }
    public bool IsHighRisk { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ZoneObstacle> ZoneObstacles { get; set; } = [];
    public List<BlindSpotZone> BlindSpotZones { get; set; } = [];
    public List<CollisionWarning> CollisionWarnings { get; set; } = [];
}

public enum ZoneType
{
    ColdStorage = 0,
    Aisle = 1,
    LoadingArea = 2,
    ChargingArea = 3
}
