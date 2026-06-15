import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalRService } from '../../core/services/signalr.service';
import { ApiService } from '../../core/services/api.service';
import { Forklift, Personnel, BlindSpot, Warning, Zone } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h2>实时监控</h2>
      <p>冷库叉车作业实时态势感知</p>
    </div>

    <div class="stats-grid">
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
          <span style="font-size:12px;color:#ff4757;">{{ activeWarnings.length }} 条活跃</span>
        </div>
        <div class="warning-list-scroll">
          @for (w of activeWarnings; track w.id) {
            <div class="warning-item">
              <span class="warning-dot" [class]="w.level"></span>
              <div style="flex:1;">
                <div style="color:#e8f0fe;">{{ w.forkliftName }}</div>
                <div style="color:#5a7a9a;font-size:12px;">{{ w.message }}</div>
              </div>
              <span class="risk-badge" [class]="w.level">{{ levelText(w.level) }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('monitorCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  forklifts: Forklift[] = [];
  personnel: Personnel[] = [];
  blindSpots: BlindSpot[] = [];
  activeWarnings: Warning[] = [];
  zones: Zone[] = [];

  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;
  private sub!: Subscription;

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

  levelText(level: string): string {
    const map: Record<string, string> = { critical: '极高', high: '高', medium: '中', low: '低' };
    return map[level] || level;
  }

  private loadData(): void {
    this.api.get<Forklift[]>('/forklifts').subscribe({
      next: d => { this.forklifts = d; },
      error: () => { this.forklifts = this.mockForklifts(); }
    });
    this.api.get<Personnel[]>('/personnel').subscribe({
      next: d => { this.personnel = d; },
      error: () => { this.personnel = this.mockPersonnel(); }
    });
    this.api.get<BlindSpot[]>('/blindspots').subscribe({
      next: d => { this.blindSpots = d; },
      error: () => { this.blindSpots = this.mockBlindSpots(); }
    });
    this.api.get<Warning[]>('/warnings/active').subscribe({
      next: d => { this.activeWarnings = d; },
      error: () => { this.activeWarnings = this.mockWarnings(); }
    });
    this.api.get<Zone[]>('/zones').subscribe({
      next: d => { this.zones = d; },
      error: () => { this.zones = this.mockZones(); }
    });
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
  }

  private blindSpotColor(level: string): string {
    const map: Record<string, string> = {
      critical: 'rgba(255,71,87,0.25)',
      high: 'rgba(255,165,2,0.2)',
      medium: 'rgba(255,211,42,0.15)',
      low: 'rgba(46,213,115,0.1)'
    };
    return map[level] || map.low;
  }

  private mockForklifts(): Forklift[] {
    return [
      { id: 'f1', name: '叉车A01', code: 'A01', position: { x: 200, y: 200 }, heading: 45, speed: 2.5, status: 'online', teamId: 't1', blindSpotAngle: 120, blindSpotRange: 80, lastUpdate: new Date() },
      { id: 'f2', name: '叉车A02', code: 'A02', position: { x: 500, y: 300 }, heading: 180, speed: 1.8, status: 'online', teamId: 't1', blindSpotAngle: 120, blindSpotRange: 80, lastUpdate: new Date() },
      { id: 'f3', name: '叉车B01', code: 'B01', position: { x: 350, y: 150 }, heading: 270, speed: 3.0, status: 'online', teamId: 't2', blindSpotAngle: 140, blindSpotRange: 90, lastUpdate: new Date() }
    ];
  }

  private mockPersonnel(): Personnel[] {
    return [
      { id: 'p1', name: '张三', code: 'P001', position: { x: 280, y: 220 }, status: 'online', teamId: 't1', role: 'worker', lastUpdate: new Date() },
      { id: 'p2', name: '李四', code: 'P002', position: { x: 450, y: 350 }, status: 'online', teamId: 't2', role: 'operator', lastUpdate: new Date() },
      { id: 'p3', name: '王五', code: 'P003', position: { x: 600, y: 180 }, status: 'online', teamId: 't1', role: 'supervisor', lastUpdate: new Date() },
      { id: 'p4', name: '赵六', code: 'P004', position: { x: 150, y: 380 }, status: 'online', teamId: 't2', role: 'worker', lastUpdate: new Date() }
    ];
  }

  private mockBlindSpots(): BlindSpot[] {
    return [
      { id: 'bs1', forkliftId: 'f1', forkliftName: '叉车A01', cx: 200, cy: 200, startAngle: -Math.PI / 6, endAngle: Math.PI / 6, radius: 80, riskLevel: 'high', overlappingPersonnel: ['p1'] },
      { id: 'bs2', forkliftId: 'f2', forkliftName: '叉车A02', cx: 500, cy: 300, startAngle: Math.PI * 0.6, endAngle: Math.PI * 1.2, radius: 80, riskLevel: 'critical', overlappingPersonnel: ['p2'] },
      { id: 'bs3', forkliftId: 'f3', forkliftName: '叉车B01', cx: 350, cy: 150, startAngle: Math.PI * 1.2, endAngle: Math.PI * 1.8, radius: 90, riskLevel: 'medium', overlappingPersonnel: [] }
    ];
  }

  private mockWarnings(): Warning[] {
    return [
      { id: 'w1', type: 'collision', level: 'critical', forkliftId: 'f2', forkliftName: '叉车A02', personnelId: 'p2', personnelName: '李四', position: { x: 480, y: 320 }, message: '人员进入碰撞风险区', timestamp: new Date(), status: 'active' },
      { id: 'w2', type: 'blindspot_intrusion', level: 'high', forkliftId: 'f1', forkliftName: '叉车A01', personnelId: 'p1', personnelName: '张三', position: { x: 250, y: 210 }, message: '人员进入盲区范围', timestamp: new Date(), status: 'active' },
      { id: 'w3', type: 'speed_violation', level: 'medium', forkliftId: 'f3', forkliftName: '叉车B01', position: { x: 350, y: 150 }, message: '超速行驶 3.0m/s', timestamp: new Date(), status: 'active' }
    ];
  }

  private mockZones(): Zone[] {
    return [
      { id: 'z1', name: '冷藏区A', type: 'cold_storage', x: 40, y: 40, width: 200, height: 160, temperature: -18, color: '#1e90ff' },
      { id: 'z2', name: '冷藏区B', type: 'cold_storage', x: 260, y: 40, width: 200, height: 160, temperature: -25, color: '#1e90ff' },
      { id: 'z3', name: '主通道', type: 'corridor', x: 40, y: 220, width: 420, height: 80, color: '#2ed573' },
      { id: 'z4', name: '装卸区', type: 'loading', x: 480, y: 40, width: 280, height: 260, color: '#ffa502' },
      { id: 'z5', name: '充电区', type: 'charging', x: 40, y: 320, width: 140, height: 140, color: '#9b59b6' },
      { id: 'z6', name: '限制区', type: 'restricted', x: 200, y: 320, width: 260, height: 140, color: '#ff4757' }
    ];
  }
}
