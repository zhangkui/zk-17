export interface Zone {
  id: string;
  name: string;
  type: 'cold_storage' | 'corridor' | 'loading' | 'charging' | 'restricted';
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
  type: 'shelf' | 'column' | 'wall' | 'machine';
}

export interface Forklift {
  id: string;
  name: string;
  code: string;
  model?: string;
  position: Position;
  heading: number;
  speed: number;
  status: 'online' | 'offline' | 'charging' | 'maintenance';
  teamId?: string;
  blindSpotAngle?: number;
  blindSpotRange?: number;
  lastUpdate: Date;
}

export interface Personnel {
  id: string;
  name: string;
  code: string;
  badge?: string;
  position: Position;
  status: 'online' | 'offline';
  teamId?: string;
  role?: 'operator' | 'worker' | 'supervisor';
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
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  overlappingPersonnel: Personnel[];
  detectedAt?: Date;
  isActive?: boolean;
}

export interface Warning {
  id: string;
  type: 'collision' | 'blindspot_intrusion' | 'zone_violation' | 'speed_violation';
  level: 'critical' | 'high' | 'medium' | 'low';
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
  type: string;
  level: 'critical' | 'high' | 'medium' | 'low';
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
  shift: 'morning' | 'afternoon' | 'night';
  eventCount: number;
  safetyScore: number;
  createdAt?: Date;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'operator' | 'worker' | 'supervisor';
  forkliftId?: string;
  eventCount: number;
  badge?: string;
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
  collisionWarnings: any[];
  blindSpotChanges: BlindSpotChangeDto[];
}

export interface PositionRecordDto {
  id: string;
  entityType: string;
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
  riskLevel: string;
  detectedAt: Date;
}

export const zoneTypeColors: Record<string, string> = {
  cold_storage: '#1e90ff',
  corridor: '#2ed573',
  loading: '#ffa502',
  charging: '#9b59b6',
  restricted: '#ff4757'
};

export function warningTypeText(type: string): string {
  const map: Record<string, string> = {
    collision: '碰撞风险',
    blindspot_intrusion: '盲区入侵',
    zone_violation: '区域违规',
    speed_violation: '超速违规'
  };
  return map[type] || type;
}

export function riskLevelText(level: string): string {
  const map: Record<string, string> = { critical: '极高', high: '高', medium: '中', low: '低' };
  return map[level] || level;
}

export function shiftText(shift: string): string {
  const map: Record<string, string> = { morning: '早班', afternoon: '中班', night: '晚班' };
  return map[shift] || shift;
}

export function roleText(role: string): string {
  const map: Record<string, string> = { operator: '操作员', worker: '工人', supervisor: '主管' };
  return map[role] || role;
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

export function riskLevelValue(level: string): number {
  const map: Record<string, number> = { critical: 90, high: 70, medium: 50, low: 30 };
  return map[level] || 30;
}
