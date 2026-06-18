namespace ColdStorageForklift.Core.Entities;

public class PredictionWarning
{
    public Guid Id { get; set; }
    public Guid ForkliftId { get; set; }
    public Guid? PersonnelId { get; set; }
    public Guid? ZoneId { get; set; }
    public WarningType WarningType { get; set; }
    public RiskLevel PredictedRiskLevel { get; set; }
    public double PredictedDistance { get; set; }
    public double ForkliftPositionX { get; set; }
    public double ForkliftPositionY { get; set; }
    public double ForkliftSpeed { get; set; }
    public double ForkliftDirection { get; set; }
    public double? PersonnelPositionX { get; set; }
    public double? PersonnelPositionY { get; set; }
    public double? PersonnelSpeed { get; set; }
    public double? PersonnelDirection { get; set; }
    public double PredictedCollisionTime { get; set; }
    public string Message { get; set; } = string.Empty;
    public PredictionStatus Status { get; set; }
    public string? HandledBy { get; set; }
    public DateTime? HandledAt { get; set; }
    public string? HandleRemark { get; set; }
    public bool? BecameActualWarning { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public Forklift? Forklift { get; set; }
    public Personnel? Personnel { get; set; }
    public Zone? Zone { get; set; }
}

public enum PredictionStatus
{
    Active = 0,
    Acknowledged = 1,
    Ignored = 2,
    Escalated = 3,
    Resolved = 4,
    Expired = 5
}
