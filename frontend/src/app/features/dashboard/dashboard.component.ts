import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalRService } from '../../core/services/signalr.service';
import { ApiService } from '../../core/services/api.service';
import { Forklift, Personnel, BlindSpot, Warning, Zone, PredictionWarning, riskLevelText } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h2>实时监控</h2>
      <p>冷库叉车作业实时态势感知</p>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);">
      <div class="stat-card">
        <div class="stat-label">在线叉车</div>
        <div class="stat-value orange">{{ forklifts.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">在线人员</div>
        <div class="stat-value green">{{ personnel.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">活跃预警</div>
        <div class="stat-value red">{{ activeWarnings.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">预测预警</div>
        <div class="stat-value purple">{{ activePredictions.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">盲区数量</div>
        <div class="stat-value cyan">{{ blindSpots.length }}</div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-header">
          <h3>2D 俯视监控</h3>
          <span style="font-size:12px;color:#5a7a9a;">实时更新中</span>
        </div>
        <div class="card-body">
          <canvas #monitorCanvas width="800" height="500"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>实时预警</h3>
          <div style="display:flex;gap:12px;font-size:12px;">
            <span style="color:#ff4757;">{{ activeWarnings.length }} 条活跃</span>
            <span style="color:#9b59b6;">{{ activePredictions.length }} 条预测</span>
          </div>
        </div>
        <div class="warning-list-scroll">
          @for (w of activeWarnings; track w.id) {
            <div class="warning-item">
              <span class="warning-dot" [class]="w.level"></span>
              <div style="flex:1;">
                <div style="color:#e8f0fe;">{{ w.forkliftName }}</div>
                <div style="color:#5a7a9a;font-size:12px;">{{ w.message }}</div>
              </div>
              <span class="risk-badge" [class]="w.level">{{ riskLevelText(w.level) }}</span>
            </div>
          }

          @for (p of activePredictions; track p.id) {
            <div class="warning-item prediction-item">
              <span class="warning-dot prediction-dot" [class]="p.predictedRiskLevel"></span>
              <div style="flex:1;">
                <div style="color:#e8f0fe;display:flex;align-items:center;gap:6px;">
                  {{ p.forkliftName }}
                  <span class="prediction-badge">预测</span>
                </div>
                <div style="color:#5a7a9a;font-size:12px;">{{ p.message }}</div>
                <div style="color:#9b59b6;font-size:11px;">
                  预计 {{ p.predictedCollisionTime | number:'1.0' }} 秒后接近
                </div>
              </div>
              <span class="risk-badge prediction-badge" [class]="p.predictedRiskLevel">{{ riskLevelText(p.predictedRiskLevel) }}</span>
            </div>
          }

          @if (activeWarnings.length === 0 && activePredictions.length === 0) {
            <div style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">暂无预警信息</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .stat-value.purple { color: #9b59b6; }
    .prediction-item {
      border-left: 3px solid #9b59b6;
      background: rgba(155, 89, 182, 0.05);
    }
    .prediction-dot {
      border-style: dashed;
      border-width: 2px;
      background: transparent !important;
    }
    .prediction-badge {
      border: 1px dashed #9b59b6;
      color: #9b59b6;
      background: transparent;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('monitorCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  forklifts: Forklift[] = [];
  personnel: Personnel[] = [];
  blindSpots: BlindSpot[] = [];
  activeWarnings: Warning[] = [];
  activePredictions: PredictionWarning[] = [];
  zones: Zone[] = [];

  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;
  private sub!: Subscription;

  riskLevelText = riskLevelText;

  constructor(
    private signalr: SignalRService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.signalr.startConnection();
    this.loadData();

    this.sub = this.signalr.message$.subscribe(msg => {
      switch (msg.type) {
        case 'ForkliftPositionUpdate':
          this.updateForklift(msg.payload);
          break;
        case 'PersonnelPositionUpdate':
          this.updatePersonnel(msg.payload);
          break;
        case 'BlindSpotUpdate':
          this.blindSpots = msg.payload;
          break;
        case 'WarningTriggered':
          this.activeWarnings.unshift(msg.payload);
          if (this.activeWarnings.length > 50) this.activeWarnings.pop();
          break;
        case 'WarningResolved':
          this.activeWarnings = this.activeWarnings.filter(w => w.id !== msg.payload.id);
          break;
        case 'PredictionWarningGenerated':
          this.handlePredictionGenerated(msg.payload);
          break;
        case 'PredictionWarningUpdated':
          this.handlePredictionUpdated(msg.payload);
          break;
      }
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    if (this.sub) this.sub.unsubscribe();
  }

  private loadData(): void {
    this.api.getForklifts().subscribe(d => { this.forklifts = d; });
    this.api.getPersonnel().subscribe(d => { this.personnel = d; });
    this.api.getBlindSpots().subscribe(d => { this.blindSpots = d; });
    this.api.getWarnings().subscribe(d => { this.activeWarnings = d.filter(w => w.status === 'active'); });
    this.api.getZones().subscribe(d => { this.zones = d; });
    this.api.getActivePredictions().subscribe(d => { this.activePredictions = d; });
  }

  private handlePredictionGenerated(payload: any): void {
    const idx = this.activePredictions.findIndex(p => p.id === payload.id);
    const prediction = this.convertPredictionPayload(payload);
    if (idx >= 0) {
      this.activePredictions[idx] = prediction;
    } else {
      this.activePredictions.unshift(prediction);
      if (this.activePredictions.length > 30) this.activePredictions.pop();
    }
  }

  private handlePredictionUpdated(payload: any): void {
    const idx = this.activePredictions.findIndex(p => p.id === payload.id);
    if (idx >= 0) {
      if (payload.status && payload.status !== 'Active') {
        this.activePredictions = this.activePredictions.filter(p => p.id !== payload.id);
      } else {
        this.activePredictions[idx] = this.convertPredictionPayload(payload);
      }
    }
  }

  private convertPredictionPayload(payload: any): PredictionWarning {
    return {
      id: payload.id,
      forkliftId: payload.forkliftId,
      forkliftName: payload.forkliftName || `叉车-${payload.forkliftId?.substring(0, 4)}`,
      personnelId: payload.personnelId,
      personnelName: payload.personnelName,
      zoneId: payload.zoneId,
      zoneName: payload.zoneName,
      type: payload.warningType || 'PersonForkliftApproach',
      predictedRiskLevel: payload.predictedRiskLevel || 'Low',
      predictedDistance: payload.predictedDistance || 0,
      forkliftPositionX: payload.forkliftPositionX ?? 0,
      forkliftPositionY: payload.forkliftPositionY ?? 0,
      forkliftSpeed: payload.forkliftSpeed ?? 0,
      forkliftDirection: payload.forkliftDirection ?? 0,
      personnelPositionX: payload.personnelPositionX,
      personnelPositionY: payload.personnelPositionY,
      personnelSpeed: payload.personnelSpeed,
      personnelDirection: payload.personnelDirection,
      predictedCollisionTime: payload.predictedCollisionTime ?? 0,
      message: payload.message || '预测预警',
      status: payload.status || 'Active',
      createdAt: new Date(payload.createdAt || Date.now()),
      expiresAt: new Date(payload.expiresAt || Date.now())
    };
  }

  private updateForklift(data: Forklift): void {
    const idx = this.forklifts.findIndex(f => f.id === data.id);
    if (idx >= 0) this.forklifts[idx] = data;
    else this.forklifts.push(data);
  }

  private updatePersonnel(data: Personnel): void {
    const idx = this.personnel.findIndex(p => p.id === data.id);
    if (idx >= 0) this.personnel[idx] = data;
    else this.personnel.push(data);
  }

  private animate(): void {
    this.draw();
    this.animFrameId = requestAnimationFrame(() => this.animate());
  }

  private draw(): void {
    const ctx = this.ctx;
    const canvas = this.canvasRef.nativeElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#081220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1b3a5c';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    for (const z of this.zones) {
      ctx.fillStyle = z.color + '33';
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 1.5;
      ctx.fillRect(z.x, z.y, z.width, z.height);
      ctx.strokeRect(z.x, z.y, z.width, z.height);
      ctx.fillStyle = z.color;
      ctx.font = '12px sans-serif';
      ctx.fillText(z.name, z.x + 6, z.y + 16);
    }

    for (const z of this.zones) {
      if (!z.obstacles) continue;
      for (const obs of z.obstacles) {
        const obsColor = this.obstacleColor(obs.type);
        ctx.fillStyle = obsColor.fill;
        ctx.strokeStyle = obsColor.stroke;
        ctx.lineWidth = 1.5;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = obsColor.stroke;
        ctx.font = '10px sans-serif';
        ctx.fillText(obs.name, obs.x + 3, obs.y + 12);
      }
    }

    for (const bs of this.blindSpots) {
      ctx.fillStyle = this.blindSpotColor(bs.riskLevel);
      ctx.beginPath();
      ctx.moveTo(bs.cx, bs.cy);
      ctx.arc(bs.cx, bs.cy, bs.radius, bs.startAngle, bs.endAngle);
      ctx.closePath();
      ctx.fill();
    }

    for (const p of this.personnel) {
      ctx.fillStyle = '#2ed573';
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2ed57366';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#2ed573';
      ctx.font = '10px sans-serif';
      ctx.fillText(p.name, p.position.x + 12, p.position.y + 4);
    }

    for (const f of this.forklifts) {
      ctx.save();
      ctx.translate(f.position.x, f.position.y);
      ctx.rotate((f.heading * Math.PI) / 180);
      ctx.fillStyle = '#ffa502';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffa50266';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ffa502';
      ctx.font = '10px sans-serif';
      ctx.fillText(f.name, f.position.x + 18, f.position.y + 4);
    }

    for (const w of this.activeWarnings) {
      ctx.strokeStyle = '#ff4757';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(w.position.x, w.position.y, 20 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const p of this.activePredictions) {
      const levelColors: Record<string, string> = {
        Critical: '#9b59b6',
        High: '#9b59b6',
        Medium: '#9b59b6',
        Low: '#9b59b6'
      };
      const color = levelColors[p.predictedRiskLevel] || '#9b59b6';
      const pulse = Math.sin(Date.now() / 400) * 0.5 + 0.5;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.globalAlpha = 0.3 + pulse * 0.4;
      ctx.beginPath();
      ctx.arc(p.forkliftPositionX, p.forkliftPositionY, 25 + pulse * 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.forkliftPositionX, p.forkliftPositionY, 35 + pulse * 12, 0, Math.PI * 2);
      ctx.globalAlpha = 0.15 + pulse * 0.2;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('预测预警', p.forkliftPositionX + 14, p.forkliftPositionY - 14);
      ctx.globalAlpha = 1;
    }
  }

  private blindSpotColor(level: string): string {
    const map: Record<string, string> = {
      critical: 'rgba(255,71,87,0.25)',
      high: 'rgba(255,165,2,0.2)',
      medium: 'rgba(255,211,42,0.15)',
      low: 'rgba(46,213,115,0.1)'
    };
    return map[level] || map['low'];
  }

  private obstacleColor(type: string): { fill: string; stroke: string } {
    const map: Record<string, { fill: string; stroke: string }> = {
      Shelf: { fill: 'rgba(139,90,43,0.4)', stroke: '#8b5a2b' },
      Column: { fill: 'rgba(128,128,128,0.5)', stroke: '#808080' },
      Machine: { fill: 'rgba(70,130,180,0.4)', stroke: '#4682b4' },
      Wall: { fill: 'rgba(105,105,105,0.6)', stroke: '#696969' }
    };
    return map[type] || { fill: 'rgba(128,128,128,0.3)', stroke: '#808080' };
  }
}
