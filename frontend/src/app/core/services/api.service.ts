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
  PredictionWarning,
  HistoricalRiskAnalysis,
  ZoneType,
  ObstacleType,
  ForkliftStatus,
  PersonnelStatus,
  MemberType,
  ShiftType,
  RiskLevel,
  WarningType,
  EventType,
  PositionEntityType,
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
    return this.get<any[]>('/forklifts').pipe(
      map(dtos => dtos.map(dto => this.convertForkliftDto(dto)))
    );
  }

  getForkliftById(id: string): Observable<Forklift> {
    return this.get<any>(`/forklifts/${id}`).pipe(
      map(dto => this.convertForkliftDto(dto))
    );
  }

  getForkliftsByStatus(status: ForkliftStatus): Observable<Forklift[]> {
    return this.get<any[]>(`/forklifts/status/${status}`).pipe(
      map(dtos => dtos.map(dto => this.convertForkliftDto(dto)))
    );
  }

  getForkliftsByTeam(teamId: string): Observable<Forklift[]> {
    return this.get<any[]>(`/forklifts/team/${teamId}`).pipe(
      map(dtos => dtos.map(dto => this.convertForkliftDto(dto)))
    );
  }

  createForklift(forklift: { code: string; model: string; teamId?: string; blindSpotRadius: number }): Observable<Forklift> {
    return this.post<any>('/forklifts', forklift).pipe(
      map(dto => this.convertForkliftDto(dto))
    );
  }

  updateForklift(id: string, forklift: { code: string; model: string; teamId?: string; blindSpotRadius: number }): Observable<Forklift> {
    return this.put<any>(`/forklifts/${id}`, forklift).pipe(
      map(dto => this.convertForkliftDto(dto))
    );
  }

  updateForkliftStatus(id: string, status: ForkliftStatus): Observable<Forklift> {
    return this.put<any>(`/forklifts/${id}/status`, { status }).pipe(
      map(dto => this.convertForkliftDto(dto))
    );
  }

  deleteForklift(id: string): Observable<void> {
    return this.delete<void>(`/forklifts/${id}`);
  }

  getPersonnel(): Observable<Personnel[]> {
    return this.get<any[]>('/personnel').pipe(
      map(dtos => dtos.map(dto => this.convertPersonnelDto(dto)))
    );
  }

  getPersonnelById(id: string): Observable<Personnel> {
    return this.get<any>(`/personnel/${id}`).pipe(
      map(dto => this.convertPersonnelDto(dto))
    );
  }

  getPersonnelByStatus(status: PersonnelStatus): Observable<Personnel[]> {
    return this.get<any[]>(`/personnel/status/${status}`).pipe(
      map(dtos => dtos.map(dto => this.convertPersonnelDto(dto)))
    );
  }

  getPersonnelByTeam(teamId: string): Observable<Personnel[]> {
    return this.get<any[]>(`/personnel/team/${teamId}`).pipe(
      map(dtos => dtos.map(dto => this.convertPersonnelDto(dto)))
    );
  }

  createPersonnel(personnel: { name: string; badge: string; teamId?: string }): Observable<Personnel> {
    return this.post<any>('/personnel', personnel).pipe(
      map(dto => this.convertPersonnelDto(dto))
    );
  }

  updatePersonnel(id: string, personnel: { name: string; badge: string; teamId?: string }): Observable<Personnel> {
    return this.put<any>(`/personnel/${id}`, personnel).pipe(
      map(dto => this.convertPersonnelDto(dto))
    );
  }

  updatePersonnelStatus(id: string, status: PersonnelStatus): Observable<Personnel> {
    return this.put<any>(`/personnel/${id}/status`, { status }).pipe(
      map(dto => this.convertPersonnelDto(dto))
    );
  }

  assignPersonnelToTeam(id: string, teamId: string | null): Observable<Personnel> {
    return this.put<any>(`/personnel/${id}/team`, { teamId }).pipe(
      map(dto => this.convertPersonnelDto(dto))
    );
  }

  deletePersonnel(id: string): Observable<void> {
    return this.delete<void>(`/personnel/${id}`);
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

  getZoneById(id: string): Observable<Zone> {
    return this.get<any>(`/zones/${id}`).pipe(
      map(dto => this.convertZoneDto(dto))
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

  getZoneObstacles(zoneId: string): Observable<any[]> {
    return this.get<any[]>(`/zones/${zoneId}/obstacles`);
  }

  createObstacle(zoneId: string, obstacle: { name: string; positionX: number; positionY: number; width: number; height: number; type: ObstacleType }): Observable<any> {
    return this.post<any>(`/zones/${zoneId}/obstacles`, obstacle);
  }

  updateObstacle(obstacleId: string, obstacle: { name: string; positionX: number; positionY: number; width: number; height: number; type: ObstacleType }): Observable<any> {
    return this.put<any>(`/zones/obstacles/${obstacleId}`, obstacle);
  }

  deleteObstacle(obstacleId: string): Observable<void> {
    return this.delete<void>(`/zones/obstacles/${obstacleId}`);
  }

  associateObstacles(zoneId: string, obstacleIds: string[]): Observable<void> {
    return this.put<void>(`/zones/${zoneId}/obstacles/associate`, { obstacleIds });
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

  getTeamById(id: string): Observable<Team> {
    return this.get<any>(`/teams/${id}`).pipe(
      map(dto => this.convertTeamDetailDto(dto))
    );
  }

  createTeam(team: { name: string; shift: ShiftType; leader: string }): Observable<Team> {
    return this.post<any>('/teams', team).pipe(
      map(dto => this.convertTeamDto(dto, []))
    );
  }

  updateTeam(id: string, team: { name: string; shift: ShiftType; leader: string }): Observable<Team> {
    return this.put<any>(`/teams/${id}`, team).pipe(
      map(dto => this.convertTeamDto(dto, []))
    );
  }

  deleteTeam(id: string): Observable<void> {
    return this.delete<void>(`/teams/${id}`);
  }

  getTeamMembers(teamId: string): Observable<TeamMember[]> {
    return this.get<any[]>(`/teams/${teamId}/members`).pipe(
      map(dtos => dtos.map(dto => this.convertTeamMemberDto(dto)))
    );
  }

  addTeamMember(teamId: string, member: { type: MemberType; memberName: string; badge: string }): Observable<TeamMember> {
    return this.post<any>(`/teams/${teamId}/members`, member).pipe(
      map(dto => this.convertTeamMemberDto(dto))
    );
  }

  updateTeamMember(teamId: string, memberId: string, member: { memberType: MemberType; memberName: string; badge: string }): Observable<TeamMember> {
    return this.put<any>(`/teams/${teamId}/members/${memberId}`, member).pipe(
      map(dto => this.convertTeamMemberDto(dto))
    );
  }

  deleteTeamMember(teamId: string, memberId: string): Observable<void> {
    return this.delete<void>(`/teams/${teamId}/members/${memberId}`);
  }

  getTeamStatistics(teamId: string, startTime?: string, endTime?: string): Observable<any> {
    const params: Record<string, any> = {};
    if (startTime) params['startTime'] = startTime;
    if (endTime) params['endTime'] = endTime;
    return this.get<any>(`/teams/${teamId}/statistics`, params);
  }

  getTeamEvents(teamId: string, startTime?: string, endTime?: string): Observable<Warning[]> {
    const params: Record<string, any> = {};
    if (startTime) params['startTime'] = startTime;
    if (endTime) params['endTime'] = endTime;
    return forkJoin({
      events: this.get<any[]>(`/teams/${teamId}/events`, params),
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

  getActivePredictions(): Observable<PredictionWarning[]> {
    return forkJoin({
      predictions: this.get<any[]>('/predictions/active'),
      forklifts: this.getForklifts(),
      personnel: this.getPersonnel()
    }).pipe(
      map(({ predictions, forklifts, personnel }) => {
        const forkliftMap = new Map(forklifts.map(f => [f.id, f]));
        const personnelMap = new Map(personnel.map(p => [p.id, p]));
        return predictions.map(dto => this.convertPredictionDto(dto, forkliftMap, personnelMap));
      })
    );
  }

  getPredictionById(id: string): Observable<PredictionWarning> {
    return this.get<any>(`/predictions/${id}`).pipe(
      map(dto => this.convertPredictionDto(dto, new Map(), new Map()))
    );
  }

  getPredictionHistory(startTime?: string, endTime?: string): Observable<PredictionWarning[]> {
    const params: Record<string, any> = {};
    if (startTime) params['startTime'] = startTime;
    if (endTime) params['endTime'] = endTime;
    return forkJoin({
      predictions: this.get<any[]>('/predictions/history', params),
      forklifts: this.getForklifts(),
      personnel: this.getPersonnel()
    }).pipe(
      map(({ predictions, forklifts, personnel }) => {
        const forkliftMap = new Map(forklifts.map(f => [f.id, f]));
        const personnelMap = new Map(personnel.map(p => [p.id, p]));
        return predictions.map(dto => this.convertPredictionDto(dto, forkliftMap, personnelMap));
      })
    );
  }

  acknowledgePrediction(id: string, handledBy: string = 'operator', remark?: string): Observable<PredictionWarning> {
    return this.post<any>(`/predictions/${id}/acknowledge`, { handledBy, remark }).pipe(
      map(dto => this.convertPredictionDto(dto, new Map(), new Map()))
    );
  }

  ignorePrediction(id: string, handledBy: string = 'operator', remark?: string): Observable<PredictionWarning> {
    return this.post<any>(`/predictions/${id}/ignore`, { handledBy, remark }).pipe(
      map(dto => this.convertPredictionDto(dto, new Map(), new Map()))
    );
  }

  escalatePrediction(id: string, handledBy: string = 'operator', remark?: string): Observable<PredictionWarning> {
    return this.post<any>(`/predictions/${id}/escalate`, { handledBy, remark }).pipe(
      map(dto => this.convertPredictionDto(dto, new Map(), new Map()))
    );
  }

  resolvePrediction(id: string, handledBy: string = 'operator', remark?: string): Observable<PredictionWarning> {
    return this.post<any>(`/predictions/${id}/resolve`, { handledBy, remark }).pipe(
      map(dto => this.convertPredictionDto(dto, new Map(), new Map()))
    );
  }

  getHistoricalRiskAnalysis(startTime?: string, endTime?: string): Observable<HistoricalRiskAnalysis> {
    const params: Record<string, any> = {};
    if (startTime) params['startTime'] = startTime;
    if (endTime) params['endTime'] = endTime;
    return this.get<HistoricalRiskAnalysis>('/predictions/historical-analysis', params);
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
      status: this.parseEnum<ForkliftStatus>(dto.status, 'ForkliftStatus', 'Offline'),
      teamId: dto.teamId,
      blindSpotRadius: dto.blindSpotRadius,
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
      status: this.parseEnum<PersonnelStatus>(dto.status, 'PersonnelStatus', 'Offline'),
      teamId: dto.teamId,
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
      riskLevel: this.parseEnum<RiskLevel>(dto.riskLevel, 'RiskLevel', 'Low'),
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

    const warningType = this.parseEnum<WarningType>(dto.warningType ?? dto.type, 'WarningType', 'PersonForkliftApproach');
    const riskLevel = this.parseEnum<RiskLevel>(dto.riskLevel, 'RiskLevel', 'Low');

    let message = dto.message || '预警';
    if (!dto.message) {
      if (warningType === 'PersonForkliftApproach') message = '人车接近预警';
      else if (warningType === 'VehicleCollision') message = '车辆碰撞预警';
      else if (warningType === 'BlindSpotIntrusion') message = '盲区入侵预警';
    }

    return {
      id: dto.id,
      type: warningType,
      level: riskLevel,
      forkliftId: dto.forkliftId,
      forkliftName: forklift?.name || `叉车-${dto.forkliftId?.substring(0, 4)}`,
      personnelId: dto.personnelId,
      personnelName: personnel?.name,
      zoneId: dto.zoneId,
      position: { x: posX, y: posY },
      distance: dto.distance,
      message,
      timestamp: new Date(dto.createdAt || dto.timestamp || Date.now()),
      status: dto.isAcknowledged ? 'acknowledged' : 'active',
      isAcknowledged: dto.isAcknowledged,
      acknowledgedBy: dto.acknowledgedBy,
      acknowledgedAt: dto.acknowledgedAt ? new Date(dto.acknowledgedAt) : undefined
    };
  }

  private convertZoneDto(dto: any): Zone {
    const zoneType = this.parseEnum<ZoneType>(dto.type, 'ZoneType', 'ColdStorage');
    return {
      id: dto.id,
      name: dto.name,
      type: zoneType,
      x: dto.positionX || 0,
      y: dto.positionY || 0,
      width: dto.width || 100,
      height: dto.height || 100,
      temperature: dto.temperature,
      color: zoneTypeColors[zoneType] || '#1e90ff',
      isHighRisk: dto.isHighRisk,
      obstacles: Array.isArray(dto.obstacles)
        ? dto.obstacles.map((o: any) => ({
            id: o.id,
            name: o.name,
            x: o.positionX || 0,
            y: o.positionY || 0,
            width: o.width || 10,
            height: o.height || 10,
            type: this.parseEnum<ObstacleType>(o.type, 'ObstacleType', 'Shelf')
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
      shift: this.parseEnum<ShiftType>(dto.shift, 'ShiftType', 'Morning'),
      members: members.map(m => this.convertTeamMemberDto(m)),
      eventCount: 0,
      safetyScore: 100,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined
    };
  }

  private convertTeamDetailDto(dto: any): Team {
    return {
      id: dto.id,
      name: dto.name,
      leader: dto.leader || '',
      shift: this.parseEnum<ShiftType>(dto.shift, 'ShiftType', 'Morning'),
      members: Array.isArray(dto.members) ? dto.members.map((m: any) => this.convertTeamMemberDto(m)) : [],
      eventCount: 0,
      safetyScore: 100,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined
    };
  }

  private convertTeamMemberDto(dto: any): TeamMember {
    const memberType = this.parseEnum<MemberType>(dto.memberType ?? dto.type, 'MemberType', 'Worker');
    return {
      id: dto.id,
      name: dto.memberName || dto.name || '',
      type: memberType,
      badge: dto.badge,
      eventCount: 0,
      joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined
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
      type: this.parseEnum<EventType>(dto.eventType ?? warning.type, 'EventType', 'Warning'),
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

  private convertPredictionDto(
    dto: any,
    forkliftMap: Map<string, Forklift>,
    personnelMap: Map<string, Personnel>
  ): PredictionWarning {
    const forklift = forkliftMap.get(dto.forkliftId);
    const personnel = dto.personnelId ? personnelMap.get(dto.personnelId) : undefined;

    const warningType = this.parseEnum<WarningType>(dto.warningType ?? dto.type, 'WarningType', 'PersonForkliftApproach');
    const riskLevel = this.parseEnum<RiskLevel>(dto.predictedRiskLevel, 'RiskLevel', 'Low');
    const status = this.parseEnum<any>(dto.status, 'PredictionStatus', 'Active') as any;

    return {
      id: dto.id,
      forkliftId: dto.forkliftId,
      forkliftName: forklift?.name || dto.forkliftName || `叉车-${dto.forkliftId?.substring(0, 4)}`,
      personnelId: dto.personnelId,
      personnelName: personnel?.name || dto.personnelName,
      zoneId: dto.zoneId,
      zoneName: dto.zoneName,
      type: warningType,
      predictedRiskLevel: riskLevel,
      predictedDistance: dto.predictedDistance,
      forkliftPositionX: dto.forkliftPositionX ?? 0,
      forkliftPositionY: dto.forkliftPositionY ?? 0,
      forkliftSpeed: dto.forkliftSpeed ?? 0,
      forkliftDirection: dto.forkliftDirection ?? 0,
      personnelPositionX: dto.personnelPositionX,
      personnelPositionY: dto.personnelPositionY,
      personnelSpeed: dto.personnelSpeed,
      personnelDirection: dto.personnelDirection,
      predictedCollisionTime: dto.predictedCollisionTime ?? 0,
      message: dto.message || '预测预警',
      status: status,
      handledBy: dto.handledBy,
      handledAt: dto.handledAt ? new Date(dto.handledAt) : undefined,
      handleRemark: dto.handleRemark,
      becameActualWarning: dto.becameActualWarning,
      createdAt: new Date(dto.createdAt || Date.now()),
      expiresAt: new Date(dto.expiresAt || Date.now())
    };
  }

  private parseEnum<T>(value: any, enumName: string, defaultValue: T): T {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'string') {
      const validValues: Record<string, string[]> = {
        ZoneType: ['ColdStorage', 'Corridor', 'Loading', 'Charging', 'Restricted'],
        ObstacleType: ['Shelf', 'Column', 'Wall', 'Machine'],
        ForkliftStatus: ['Online', 'Offline', 'Charging', 'Maintenance'],
        PersonnelStatus: ['Online', 'Offline'],
        MemberType: ['Operator', 'Worker', 'Supervisor'],
        ShiftType: ['Morning', 'Afternoon', 'Night'],
        RiskLevel: ['Low', 'Medium', 'High', 'Critical'],
        WarningType: ['PersonForkliftApproach', 'VehicleCollision', 'BlindSpotIntrusion'],
        EventType: ['Warning', 'Collision', 'BlindSpotIntrusion', 'ZoneViolation'],
        PositionEntityType: ['Forklift', 'Personnel']
      };
      const valid = validValues[enumName];
      if (valid && valid.includes(value)) return value as T;
      const matched = valid?.find(v => v.toLowerCase() === String(value).toLowerCase());
      if (matched) return matched as T;
    }
    if (typeof value === 'number') {
      const enumMaps: Record<string, string[]> = {
        ZoneType: ['ColdStorage', 'Corridor', 'Loading', 'Charging', 'Restricted'],
        ObstacleType: ['Shelf', 'Column', 'Wall', 'Machine'],
        ForkliftStatus: ['Online', 'Offline', 'Charging', 'Maintenance'],
        PersonnelStatus: ['Online', 'Offline'],
        MemberType: ['Operator', 'Worker', 'Supervisor'],
        ShiftType: ['Morning', 'Afternoon', 'Night'],
        RiskLevel: ['Low', 'Medium', 'High', 'Critical'],
        WarningType: ['PersonForkliftApproach', 'VehicleCollision', 'BlindSpotIntrusion'],
        EventType: ['Warning', 'Collision', 'BlindSpotIntrusion', 'ZoneViolation'],
        PositionEntityType: ['Forklift', 'Personnel']
      };
      const map = enumMaps[enumName];
      if (map && value >= 0 && value < map.length) return map[value] as T;
    }
    return defaultValue;
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
