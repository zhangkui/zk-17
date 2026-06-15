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
  position: Position;
  heading: number;
  speed: number;
  status: 'online' | 'offline' | 'charging' | 'maintenance';
  teamId: string;
  blindSpotAngle: number;
  blindSpotRange: number;
  lastUpdate: Date;
}

export interface Personnel {
  id: string;
  name: string;
  code: string;
  position: Position;
  status: 'online' | 'offline';
  teamId: string;
  role: 'operator' | 'worker' | 'supervisor';
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
  overlappingPersonnel: string[];
}

export interface Warning {
  id: string;
  type: 'collision' | 'blindspot_intrusion' | 'zone_violation' | 'speed_violation';
  level: 'critical' | 'high' | 'medium' | 'low';
  forkliftId: string;
  forkliftName: string;
  personnelId?: string;
  personnelName?: string;
  position: Position;
  message: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
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
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'operator' | 'worker' | 'supervisor';
  forkliftId?: string;
  eventCount: number;
}

export interface Statistics {
  hourlyWarnings: number[];
  warningTrend: { date: string; count: number }[];
  zoneRiskRanking: { zoneId: string; zoneName: string; riskScore: number; eventCount: number }[];
  teamSafetyScores: { teamId: string; teamName: string; compliance: number; awareness: number; response: number; training: number; equipment: number }[];
}
