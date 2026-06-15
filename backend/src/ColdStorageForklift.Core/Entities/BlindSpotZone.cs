namespace ColdStorageForklift.Core.Entities;

public class BlindSpotZone
{
    public Guid Id { get; set; }
    public Guid ForkliftId { get; set; }
    public Guid ZoneId { get; set; }
    public double CenterX { get; set; }
    public double CenterY { get; set; }
    public double Radius { get; set; }
    public double Direction { get; set; }
    public RiskLevel RiskLevel { get; set; }
    public DateTime DetectedAt { get; set; }
    public bool IsActive { get; set; }
    public Forklift? Forklift { get; set; }
    public Zone? Zone { get; set; }
}
