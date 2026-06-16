import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import {
  Forklift,
  Personnel,
  BlindSpot,
  Warning,
  Zone,
  Team,
  TeamMember,
  Statistics,
  EventRecord,
  EventReplayDto,
  zoneTypeColors,
  headingToStartEndAngle,
  riskLevelValue
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`);
  }

  getForklifts(): Observable<Forklift[]> {
    return this.get<any[]>('/positions/forklifts').pipe(
      map(dtos => dtos.map(dto => this.convertForkliftDto(dto)))
    );
  }

  getPersonnel(): Observable<Personnel[]> {
    return this.get<any[]>('/positions/personnel').pipe(
      map(dtos => dtos.map(dto => this.convertPersonnelDto(dto)))
    );
  }

  getBlindSpots(): Observable<BlindSpot[]> {
    return forkJoin({
      blindSpots: this.get<any[]>('/blindspots'),
      forklifts: this.getForklifts()
    }).pipe(
      map(({ blindSpots, forklifts }) => {
        const forkliftMap = new Map(forklifts.map(f => [f.id, f]));
        return blindSpots.map(dto => this.convertBlindSpotDto(dto, forkliftMap));
      })
    );
  }

  getWarnings(): Observable<Warning[]> {
    return forkJoin({
      warnings: this.get<any[]>('/warnings'),
      forklifts: this.getForklifts(),
      personnel: this.getPersonnel()
    }).pipe(
      map(({ warnings, forklifts, personnel }) => {
        const forkliftMap = new Map(forklifts.map(f => [f.id, f]));
        const personnelMap = new Map(personnel.map(p => [p.id, p]));
        return warnings.map(dto => this.convertWarningDto(dto, forkliftMap, personnelMap));
      })
    );
  }

  acknowledgeWarning(id: string, acknowledgedBy: string = 'system'): Observable<Warning> {
    return this.post<any>(`/warnings/${id}/acknowledge`, { acknowledgedBy }).pipe(
      map(dto => this.convertWarningDto(dto, new Map(), new Map()))
    );
  }

  getZones(): Observable<Zone[]> {
    return this.get<any[]>('/zones').pipe(
      map(dtos => dtos.map(dto => this.convertZoneDto(dto)))
    );
  }

  createZone(zone: Zone): Observable<Zone> {
    const body = {
      name: zone.name,
      type: zone.type,
      width: zone.width,
      height: zone.height,
      positionX: zone.x,
      positionY: zone.y,
      temperature: zone.temperature,
      isHighRisk: zone.isHighRisk
    };
    return this.post<any>('/zones', body).pipe(
      map(dto => this.convertZoneDto(dto))
    );
  }

  updateZone(zone: Zone): Observable<Zone> {
    const body = {
      name: zone.name,
      type: zone.type,
      width: zone.width,
      height: zone.height,
      positionX: zone.x,
      positionY: zone.y,
      temperature: zone.temperature,
      isHighRisk: zone.isHighRisk
    };
    return this.put<any>(`/zones/${zone.id}`, body).pipe(
      map(dto => this.convertZoneDto(dto))
    );
  }

  deleteZone(id: string): Observable<void> {
    return this.delete<void>(`/zones/${id}`);
  }

  getStatistics(): Observable<Statistics> {
    return forkJoin({
      highRiskPeriods: this.get<any[]>('/statistics/high-risk-periods'),
      warningTrend: this.get<any[]>('/statistics/warning-trend', {
        startTime: this.getDateDaysAgo(30),
        endTime: this.getToday(),
        interval: 'day'
      }),
      zoneRiskRanking: this.get<any[]>('/statistics/zone-risk-ranking'),
      teamSafetyScores: this.get<any[]>('/statistics/team-safety-scores')
    }).pipe(
      map(({ highRiskPeriods, warningTrend, zoneRiskRanking, teamSafetyScores }) => ({
        hourlyWarnings: highRiskPeriods,
        warningTrend: warningTrend,
        zoneRiskRanking: zoneRiskRanking,
        teamSafetyScores: teamSafetyScores
      }))
    );
  }

  getTeams(): Observable<Team[]> {
    return this.get<any[]>('/teams').pipe(
      switchMap(teamDtos => {
        if (teamDtos.length === 0) return forkJoin([]);
        return forkJoin(
          teamDtos.map((dto: any) =>
            this.get<any[]>(`/teams/${dto.id}/members`).pipe(
              map(members => this.convertTeamDto(dto, members))
            )
          )
        );
      })
    );
  }

  getTeamMembers(teamId: string): Observable<TeamMember[]> {
    return this.get<any[]>(`/teams/${teamId}/members`).pipe(
      map(dtos => dtos.map(dto => this.convertTeamMemberDto(dto)))
    );
  }

  getTeamEvents(teamId: string): Observable<Warning[]> {
    return forkJoin({
      events: this.get<any[]>(`/teams/${teamId}/events`),
      forklifts: this.getForklifts(),
      personnel: this.getPersonnel()
    }).pipe(
      map(({ events, forklifts, personnel }) => {
        const forkliftMap = new Map(forklifts.map(f => [f.id, f]));
        const personnelMap = new Map(personnel.map(p => [p.id, p]));
        return events.map((dto: any) => this.convertWarningDto(dto, forkliftMap, personnelMap));
      })
    );
  }

  getEvents(startTime?: string, endTime?: string): Observable<EventRecord[]> {
    const params: Record<string, any> = {};
    if (startTime) params['startTime'] = startTime;
    if (endTime) params['endTime'] = endTime;
    return forkJoin({
      events: this.get<any[]>('/events', params),
      forklifts: this.getForklifts(),
      personnel: this.getPersonnel()
    }).pipe(
      map(({ events, forklifts, personnel }) => {
        const forkliftMap = new Map(forklifts.map(f => [f.id, f]));
        const personnelMap = new Map(personnel.map(p => [p.id, p]));
        return events.map((dto: any) => this.convertEventRecordDto(dto, forkliftMap, personnelMap));
      })
    );
  }

  getReplayData(startTime: string, endTime: string): Observable<EventReplayDto> {
    return this.get<EventReplayDto>('/events/replay', { startTime, endTime });
  }

  private convertForkliftDto(dto: any): Forklift {
    return {
      id: dto.id,
      name: dto.code || dto.model || '叉车',
      code: dto.code,
      model: dto.model,
      position: { x: dto.currentPositionX || 0, y: dto.currentPositionY || 0 },
      heading: dto.direction || 0,
      speed: dto.speed || 0,
      status: (dto.status as any) || 'offline',
      lastUpdate: new Date(dto.lastPositionUpdate || Date.now())
    };
  }

  private convertPersonnelDto(dto: any): Personnel {
    return {
      id: dto.id,
      name: dto.name,
      code: dto.badge || dto.id.substring(0, 4).toUpperCase(),
      badge: dto.badge,
      position: { x: dto.currentPositionX || 0, y: dto.currentPositionY || 0 },
      status: (dto.status as any) || 'offline',
      lastUpdate: new Date(dto.lastPositionUpdate || Date.now())
    };
  }

  private convertBlindSpotDto(dto: any, forkliftMap: Map<string, Forklift>): BlindSpot {
    const forklift = forkliftMap.get(dto.forkliftId);
    const heading = forklift?.heading || 0;
    const angles = headingToStartEndAngle(heading, 120);

    const overlappingPersonnel: Personnel[] = Array.isArray(dto.personnel)
      ? dto.personnel.map((p: any) => this.convertPersonnelDto(p))
      : [];

    return {
      id: dto.id,
      forkliftId: dto.forkliftId,
      forkliftName: forklift?.name || `叉车-${dto.forkliftId?.substring(0, 4)}`,
      cx: dto.centerX || 0,
      cy: dto.centerY || 0,
      startAngle: angles.startAngle,
      endAngle: angles.endAngle,
      radius: dto.radius || 80,
      riskLevel: (dto.riskLevel as any) || 'low',
      overlappingPersonnel: overlappingPersonnel,
      detectedAt: new Date(dto.detectedAt || Date.now()),
      isActive: dto.isActive
    };
  }

  private convertWarningDto(
    dto: any,
    forkliftMap: Map<string, Forklift>,
    personnelMap: Map<string, Personnel>
  ): Warning {
    const forklift = forkliftMap.get(dto.forkliftId);
    const personnel = dto.personnelId ? personnelMap.get(dto.personnelId) : undefined;

    const posX = dto.forkliftPositionX ?? dto.positionX ?? 0;
    const posY = dto.forkliftPositionY ?? dto.positionY ?? 0;

    let type: Warning['type'] = 'collision';
    if (dto.warningType) {
      const wt = dto.warningType.toLowerCase();
      if (wt.includes('blind')) type = 'blindspot_intrusion';
      else if (wt.includes('zone')) type = 'zone_violation';
      else if (wt.includes('speed')) type = 'speed_violation';
    }

    let level: Warning['level'] = 'low';
    if (dto.riskLevel) {
      const rl = dto.riskLevel.toLowerCase();
      if (rl === 'critical' || rl === 'high' || rl === 'medium' || rl === 'low') {
        level = rl;
      }
    }

    let message = dto.message || '预警';
    if (!dto.message) {
      if (type === 'collision') message = '人员进入碰撞风险区';
      else if (type === 'blindspot_intrusion') message = '人员进入盲区范围';
      else if (type === 'zone_violation') message = '驶入限制区域';
      else if (type === 'speed_violation') message = `超速行驶 ${dto.speed || ''}`;
    }

    return {
      id: dto.id,
      type,
      level,
      forkliftId: dto.forkliftId,
      forkliftName: forklift?.name || `叉车-${dto.forkliftId?.substring(0, 4)}`,
      personnelId: dto.personnelId,
      personnelName: personnel?.name,
      zoneId: dto.zoneId,
      position: { x: posX, y: posY },
      distance: dto.distance,
      message,
      timestamp: new Date(dto.createdAt || Date.now()),
      status: dto.isAcknowledged ? 'acknowledged' : 'active',
      isAcknowledged: dto.isAcknowledged,
      acknowledgedBy: dto.acknowledgedBy,
      acknowledgedAt: dto.acknowledgedAt ? new Date(dto.acknowledgedAt) : undefined
    };
  }

  private convertZoneDto(dto: any): Zone {
    return {
      id: dto.id,
      name: dto.name,
      type: dto.type as Zone['type'],
      x: dto.positionX || 0,
      y: dto.positionY || 0,
      width: dto.width || 100,
      height: dto.height || 100,
      temperature: dto.temperature,
      color: zoneTypeColors[dto.type] || '#1e90ff',
      isHighRisk: dto.isHighRisk,
      obstacles: Array.isArray(dto.obstacles)
        ? dto.obstacles.map((o: any) => ({
            id: o.id,
            name: o.name,
            x: o.positionX || 0,
            y: o.positionY || 0,
            width: o.width || 10,
            height: o.height || 10,
            type: o.type
          }))
        : [],
      createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined
    };
  }

  private convertTeamDto(dto: any, members: any[]): Team {
    return {
      id: dto.id,
      name: dto.name,
      leader: dto.leader || '',
      shift: (dto.shift as any) || 'morning',
      members: members.map(m => this.convertTeamMemberDto(m)),
      eventCount: 0,
      safetyScore: 100,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined
    };
  }

  private convertTeamMemberDto(dto: any): TeamMember {
    let role: TeamMember['role'] = 'worker';
    if (dto.memberType) {
      const mt = dto.memberType.toLowerCase();
      if (mt.includes('operator')) role = 'operator';
      else if (mt.includes('supervisor')) role = 'supervisor';
    }
    return {
      id: dto.id,
      name: dto.memberName || dto.name || '',
      role,
      badge: dto.badge,
      eventCount: 0
    };
  }

  private convertEventRecordDto(
    dto: any,
    forkliftMap: Map<string, Forklift>,
    personnelMap: Map<string, Personnel>
  ): EventRecord {
    const warning = this.convertWarningDto(dto, forkliftMap, personnelMap);
    return {
      id: warning.id,
      type: warning.type,
      level: warning.level,
      forkliftId: warning.forkliftId,
      forkliftName: warning.forkliftName,
      personnelId: warning.personnelId,
      personnelName: warning.personnelName,
      position: warning.position,
      description: warning.message,
      timestamp: warning.timestamp,
      duration: 0,
      teamId: dto.teamId || ''
    };
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  private getToday(): string {
    return new Date().toISOString();
  }
}
