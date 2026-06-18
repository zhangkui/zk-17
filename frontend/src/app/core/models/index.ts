export type ZoneType = 'ColdStorage' | 'Corridor' | 'Loading' | 'Charging' | 'Restricted';
export type ObstacleType = 'Shelf' | 'Column' | 'Wall' | 'Machine';
export type ForkliftStatus = 'Online' | 'Offline' | 'Charging' | 'Maintenance';
export type PersonnelStatus = 'Online' | 'Offline';
export type MemberType = 'Operator' | 'Worker' | 'Supervisor';
export type ShiftType = 'Morning' | 'Afternoon' | 'Night';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type WarningType = 'PersonForkliftApproach' | 'VehicleCollision' | 'BlindSpotIntrusion';
export type EventType = 'Warning' | 'Collision' | 'BlindSpotIntrusion' | 'ZoneViolation';
export type PositionEntityType = 'Forklift' | 'Personnel';
export type PredictionStatus = 'Active' | 'Acknowledged' | 'Ignored' | 'Escalated' | 'Resolved' | 'Expired';

export function parseEnum<T extends string>(value: any, defaultValue: T, validValues?: T[]): T {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'string') {
    if (validValues && validValues.includes(value as T)) return value as T;
    const matched = validValues?.find(v => v.toLowerCase() === String(value).toLowerCase());
    if (matched) return matched;
  }
  if (typeof value === 'number' && validValues && value >= 0 && value < validValues.length) {
    return validValues[value];
  }
  return defaultValue;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  temperature?: number;
  capacity?: number;
  color: string;
  isHighRisk?: boolean;
  obstacles: Obstacle[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Obstacle {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
}

export interface Forklift {
  id: string;
  name: string;
  code: string;
  model?: string;
  position: Position;
  heading: number;
  speed: number;
  status: ForkliftStatus;
  teamId?: string;
  blindSpotRadius?: number;
  lastUpdate: Date;
}

export interface Personnel {
  id: string;
  name: string;
  code: string;
  badge?: string;
  position: Position;
  status: PersonnelStatus;
  teamId?: string;
  lastUpdate: Date;
}

export interface Position {
  x: number;
  y: number;
  zoneId?: string;
}

export interface BlindSpot {
  id: string;
  forkliftId: string;
  forkliftName: string;
  cx: number;
  cy: number;
  startAngle: number;
  endAngle: number;
  radius: number;
  riskLevel: RiskLevel;
  overlappingPersonnel: Personnel[];
  detectedAt?: Date;
  isActive?: boolean;
}

export interface Warning {
  id: string;
  type: WarningType;
  level: RiskLevel;
  forkliftId: string;
  forkliftName: string;
  personnelId?: string;
  personnelName?: string;
  zoneId?: string;
  position: Position;
  distance?: number;
  message: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  isAcknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface EventRecord {
  id: string;
  type: EventType;
  level: RiskLevel;
  forkliftId: string;
  forkliftName: string;
  personnelId?: string;
  personnelName?: string;
  position: Position;
  description: string;
  timestamp: Date;
  duration?: number;
  teamId: string;
}

export interface Team {
  id: string;
  name: string;
  leader: string;
  members: TeamMember[];
  shift: ShiftType;
  eventCount: number;
  safetyScore: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamMember {
  id: string;
  name: string;
  type: MemberType;
  forkliftId?: string;
  eventCount: number;
  badge?: string;
  joinedAt?: Date;
}

export interface Statistics {
  hourlyWarnings: HighRiskPeriodDto[];
  warningTrend: WarningTrendDto[];
  zoneRiskRanking: ZoneRiskDto[];
  teamSafetyScores: TeamSafetyDto[];
}

export interface HighRiskPeriodDto {
  hour: number;
  eventCount: number;
  averageRiskLevel: string;
}

export interface WarningTrendDto {
  date: string;
  totalCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface ZoneRiskDto {
  zoneId: string;
  zoneName: string;
  warningCount: number;
  averageDistance: number;
  riskLevel: string;
}

export interface TeamSafetyDto {
  teamId: string;
  teamName: string;
  safetyScore: number;
  totalWarnings: number;
  criticalWarnings: number;
  acknowledgedRate: number;
}

export interface EventReplayDto {
  positionRecords: PositionRecordDto[];
  collisionWarnings: CollisionWarningDto[];
  blindSpotChanges: BlindSpotChangeDto[];
}

export interface CollisionWarningDto {
  id: string;
  forkliftId: string;
  personnelId?: string;
  zoneId?: string;
  warningType: WarningType;
  riskLevel: RiskLevel;
  distance: number;
  forkliftPositionX: number;
  forkliftPositionY: number;
  personnelPositionX?: number;
  personnelPositionY?: number;
  message: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface PositionRecordDto {
  id: string;
  entityType: PositionEntityType;
  entityId: string;
  positionX: number;
  positionY: number;
  direction?: number;
  speed?: number;
  recordedAt: Date;
}

export interface BlindSpotChangeDto {
  id: string;
  forkliftId: string;
  centerX: number;
  centerY: number;
  radius: number;
  riskLevel: RiskLevel;
  detectedAt: Date;
  isActive?: boolean;
}

export const zoneTypeColors: Record<ZoneType, string> = {
  ColdStorage: '#1e90ff',
  Corridor: '#2ed573',
  Loading: '#ffa502',
  Charging: '#9b59b6',
  Restricted: '#ff4757'
};

export function zoneTypeText(type: ZoneType): string {
  const map: Record<ZoneType, string> = {
    ColdStorage: '冷藏区',
    Corridor: '通道',
    Loading: '装卸区',
    Charging: '充电区',
    Restricted: '限制区'
  };
  return map[type] || type;
}

export function obstacleTypeText(type: ObstacleType): string {
  const map: Record<ObstacleType, string> = {
    Shelf: '货架',
    Column: '立柱',
    Wall: '墙壁',
    Machine: '设备'
  };
  return map[type] || type;
}

export function forkliftStatusText(status: ForkliftStatus): string {
  const map: Record<ForkliftStatus, string> = {
    Online: '在线',
    Offline: '离线',
    Charging: '充电中',
    Maintenance: '维护中'
  };
  return map[status] || status;
}

export function personnelStatusText(status: PersonnelStatus): string {
  const map: Record<PersonnelStatus, string> = {
    Online: '在线',
    Offline: '离线'
  };
  return map[status] || status;
}

export function warningTypeText(type: WarningType): string {
  const map: Record<WarningType, string> = {
    PersonForkliftApproach: '人车接近',
    VehicleCollision: '车辆碰撞',
    BlindSpotIntrusion: '盲区入侵'
  };
  return map[type] || type;
}

export function eventTypeText(type: EventType): string {
  const map: Record<EventType, string> = {
    Warning: '预警事件',
    Collision: '碰撞事件',
    BlindSpotIntrusion: '盲区入侵',
    ZoneViolation: '区域违规'
  };
  return map[type] || type;
}

export function riskLevelText(level: RiskLevel | string): string {
  const l = typeof level === 'string' ? parseEnum<RiskLevel>(level, 'Low', ['Low', 'Medium', 'High', 'Critical']) : level;
  const map: Record<RiskLevel, string> = { Critical: '极高', High: '高', Medium: '中', Low: '低' };
  return map[l] || String(level);
}

export function shiftText(shift: ShiftType): string {
  const map: Record<ShiftType, string> = { Morning: '早班', Afternoon: '中班', Night: '晚班' };
  return map[shift] || shift;
}

export function memberTypeText(type: MemberType): string {
  const map: Record<MemberType, string> = { Operator: '操作员', Worker: '工人', Supervisor: '主管' };
  return map[type] || type;
}

export function directionToHeading(direction: number | undefined): number {
  if (direction === undefined || direction === null) return 0;
  return direction;
}

export function headingToStartEndAngle(heading: number, blindSpotAngle: number = 120): { startAngle: number; endAngle: number } {
  const centerRad = (heading * Math.PI) / 180;
  const halfAngle = ((blindSpotAngle / 2) * Math.PI) / 180;
  return {
    startAngle: centerRad - halfAngle,
    endAngle: centerRad + halfAngle
  };
}

export function riskLevelValue(level: RiskLevel | string): number {
  const l = typeof level === 'string' ? parseEnum<RiskLevel>(level, 'Low') : level;
  const map: Record<RiskLevel, number> = { Critical: 90, High: 70, Medium: 50, Low: 30 };
  return map[l] || 30;
}

export function riskLevel(value: number): RiskLevel {
  if (value >= 80) return 'Critical';
  if (value >= 60) return 'High';
  if (value >= 40) return 'Medium';
  return 'Low';
}

export interface PredictionWarning {
  id: string;
  forkliftId: string;
  forkliftName: string;
  personnelId?: string;
  personnelName?: string;
  zoneId?: string;
  zoneName?: string;
  type: WarningType;
  predictedRiskLevel: RiskLevel;
  predictedDistance: number;
  forkliftPositionX: number;
  forkliftPositionY: number;
  forkliftSpeed: number;
  forkliftDirection: number;
  personnelPositionX?: number;
  personnelPositionY?: number;
  personnelSpeed?: number;
  personnelDirection?: number;
  predictedCollisionTime: number;
  message: string;
  status: PredictionStatus;
  handledBy?: string;
  handledAt?: Date;
  handleRemark?: string;
  becameActualWarning?: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export interface HistoricalRiskAnalysis {
  highRiskPeriods: HighRiskPeriodDto[];
  highRiskZones: ZoneRiskDto[];
  highRiskTeams: TeamRiskDto[];
  warningTypeStats: WarningTypeStatDto[];
  zoneHeatRanking: ZoneHeatDto[];
  trailHeatPeriods: TrailHeatPeriodDto[];
  personnelTrailStats: TrailStatsDto;
  forkliftTrailStats: TrailStatsDto;
  summary: RiskSummaryDto;
}

export interface ZoneHeatDto {
  zoneId: string;
  zoneName: string;
  personnelVisitCount: number;
  forkliftVisitCount: number;
  totalVisitCount: number;
  heatScore: number;
}

export interface TrailHeatPeriodDto {
  hour: number;
  personnelCount: number;
  forkliftCount: number;
  totalCount: number;
}

export interface TrailStatsDto {
  totalRecords: number;
  activeEntities: number;
  averageSpeed: number;
  maxSpeed: number;
}

export interface TeamRiskDto {
  teamId: string;
  teamName: string;
  warningCount: number;
  criticalCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface WarningTypeStatDto {
  type: WarningType;
  count: number;
  percentage: number;
}

export interface RiskSummaryDto {
  totalWarnings: number;
  criticalWarnings: number;
  highWarnings: number;
  mediumWarnings: number;
  lowWarnings: number;
  averageResponseTime: number;
  acknowledgmentRate: number;
}

export function predictionStatusText(status: PredictionStatus): string {
  const map: Record<PredictionStatus, string> = {
    Active: '待处理',
    Acknowledged: '已确认',
    Ignored: '已忽略',
    Escalated: '已升级',
    Resolved: '已解决',
    Expired: '已过期'
  };
  return map[status] || status;
}
