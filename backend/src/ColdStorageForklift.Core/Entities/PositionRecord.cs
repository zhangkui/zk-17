namespace ColdStorageForklift.Core.Entities;

public class PositionRecord
{
    public Guid Id { get; set; }
    public PositionEntityType EntityType { get; set; }
    public Guid EntityId { get; set; }
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public double Direction { get; set; }
    public double Speed { get; set; }
    public DateTime RecordedAt { get; set; }
}

public enum PositionEntityType
{
    Forklift = 0,
    Personnel = 1
}
