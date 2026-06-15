namespace ColdStorageForklift.Api.DTOs;

public record EventReplayDto(
    List<PositionRecordDto> PositionRecords,
    List<CollisionWarningDto> Warnings,
    List<BlindSpotChangeDto> BlindSpotChanges);

public record PositionRecordDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    double PositionX,
    double PositionY,
    double? Direction,
    double? Speed,
    DateTime RecordedAt);

public record BlindSpotChangeDto(
    Guid Id,
    Guid ForkliftId,
    double CenterX,
    double CenterY,
    double Radius,
    string RiskLevel,
    DateTime DetectedAt);
