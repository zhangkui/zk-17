namespace ColdStorageForklift.Api.DTOs;

using ColdStorageForklift.Core.Entities;

public record BlindSpotDto(
    Guid Id,
    Guid ForkliftId,
    double CenterX,
    double CenterY,
    double Radius,
    double Direction,
    RiskLevel RiskLevel,
    DateTime DetectedAt,
    bool IsActive,
    List<PersonnelPositionDto> PersonnelInBlindSpot);
