namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record CollisionWarningDto(
    Guid Id,
    Guid ForkliftId,
    Guid? PersonnelId,
    Guid? ZoneId,
    WarningType WarningType,
    RiskLevel RiskLevel,
    double Distance,
    double ForkliftPositionX,
    double ForkliftPositionY,
    double? PersonnelPositionX,
    double? PersonnelPositionY,
    string Message,
    bool IsAcknowledged,
    string? AcknowledgedBy,
    DateTime? AcknowledgedAt,
    DateTime CreatedAt);

public record AcknowledgeWarningRequest(
    string AcknowledgedBy);
