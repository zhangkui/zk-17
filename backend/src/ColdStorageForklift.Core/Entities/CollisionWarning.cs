namespace ColdStorageForklift.Core.Entities;

public class CollisionWarning
{
    public Guid Id { get; set; }
    public Guid ForkliftId { get; set; }
    public Guid? PersonnelId { get; set; }
    public Guid? ZoneId { get; set; }
    public WarningType WarningType { get; set; }
    public RiskLevel RiskLevel { get; set; }
    public double Distance { get; set; }
    public double ForkliftPositionX { get; set; }
    public double ForkliftPositionY { get; set; }
    public double? PersonnelPositionX { get; set; }
    public double? PersonnelPositionY { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsAcknowledged { get; set; }
    public string? AcknowledgedBy { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public Forklift? Forklift { get; set; }
    public Personnel? Personnel { get; set; }
    public Zone? Zone { get; set; }
}

public enum WarningType
{
    PersonForkliftApproach = 0,
    VehicleCollision = 1,
    BlindSpotIntrusion = 2
}
