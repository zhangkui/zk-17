namespace ColdStorageForklift.Core.Entities;

public class EventLog
{
    public Guid Id { get; set; }
    public EventType EventType { get; set; }
    public RiskLevel Severity { get; set; }
    public Guid? ZoneId { get; set; }
    public Guid? ForkliftId { get; set; }
    public Guid? PersonnelId { get; set; }
    public Guid? TeamId { get; set; }
    public string Description { get; set; } = string.Empty;
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public string? SnapshotData { get; set; }
    public DateTime OccurredAt { get; set; }
}

public enum EventType
{
    Warning = 0,
    Collision = 1,
    BlindSpotIntrusion = 2,
    ZoneViolation = 3
}
