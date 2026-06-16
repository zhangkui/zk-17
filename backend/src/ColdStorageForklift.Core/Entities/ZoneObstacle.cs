namespace ColdStorageForklift.Core.Entities;

public class ZoneObstacle
{
    public Guid Id { get; set; }
    public Guid ZoneId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public ObstacleType Type { get; set; }
    public Zone? Zone { get; set; }
}

public enum ObstacleType
{
    Shelf = 0,
    Column = 1,
    Machine = 2,
    Wall = 3
}
