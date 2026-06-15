import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Warning } from '../../core/models';

@Component({
  selector: 'app-collision-warning',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h2>碰撞预警</h2>
      <p>实时碰撞风险预警与处理</p>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="stat-card">
        <div class="stat-label">极高预警</div>
        <div class="stat-value red">{{ warnings.filter(w => w.level === 'critical').length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">高级预警</div>
        <div class="stat-value orange">{{ warnings.filter(w => w.level === 'high').length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">中级预警</div>
        <div class="stat-value" style="color:#ffd32a;">{{ warnings.filter(w => w.level === 'medium').length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">低级预警</div>
        <div class="stat-value green">{{ warnings.filter(w => w.level === 'low').length }}</div>
      </div>
    </div>

    <div class="content-grid" style="grid-template-columns:1fr 380px;">
      <div class="card">
        <div class="card-header">
          <h3>预警位置图</h3>
        </div>
        <div class="card-body">
          <canvas #warningCanvas width="700" height="420"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>活跃预警列表</h3>
          <span style="font-size:12px;color:#ff4757;">{{ warnings.length }} 条未处理</span>
        </div>
        <div class="warning-list-scroll" style="max-height:460px;">
          @for (w of warnings; track w.id) {
            <div class="warning-item" [style.animation]="w.level === 'critical' ? 'blink 1s infinite' : 'none'" style="cursor:pointer;flex-direction:column;align-items:flex-start;gap:4px;" (click)="showDetail(w)">
              <div style="display:flex;align-items:center;gap:8px;width:100%;">
                <span class="warning-dot" [class]="w.level"></span>
                <span style="color:#e8f0fe;font-weight:500;flex:1;">{{ w.forkliftName }}</span>
                <span class="risk-badge" [class]="w.level">{{ levelText(w.level) }}</span>
              </div>
              <div style="font-size:12px;color:#5a7a9a;padding-left:16px;">{{ w.message }}</div>
              <div style="display:flex;justify-content:space-between;width:100%;padding-left:16px;margin-top:4px;">
                <span style="font-size:11px;color:#5a7a9a;">{{ w.timestamp | date:'HH:mm:ss' }}</span>
                <button class="btn btn-success" style="padding:2px 10px;font-size:11px;" (click)="acknowledge(w); $event.stopPropagation()">确认</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    @if (detailWarning) {
      <div class="modal-overlay" (click)="detailWarning = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>预警详情</h3>
            <button class="modal-close" (click)="detailWarning = null">&times;</button>
          </div>
          <div style="font-size:13px;">
            <div class="form-group">
              <label>预警类型</label>
              <div style="color:#e8f0fe;">{{ typeText(detailWarning.type) }}</div>
            </div>
            <div class="form-group">
              <label>风险等级</label>
              <span class="risk-badge" [class]="detailWarning.level">{{ levelText(detailWarning.level) }}</span>
            </div>
            <div class="form-group">
              <label>叉车</label>
              <div style="color:#e8f0fe;">{{ detailWarning.forkliftName }}</div>
            </div>
            @if (detailWarning.personnelName) {
              <div class="form-group">
                <label>关联人员</label>
                <div style="color:#e8f0fe;">{{ detailWarning.personnelName }}</div>
              </div>
            }
            <div class="form-group">
              <label>位置</label>
              <div style="color:#e8f0fe;">X: {{ detailWarning.position.x }}, Y: {{ detailWarning.position.y }}</div>
            </div>
            <div class="form-group">
              <label>预警信息</label>
              <div style="color:#e8f0fe;">{{ detailWarning.message }}</div>
            </div>
            <div class="form-group">
              <label>时间</label>
              <div style="color:#e8f0fe;">{{ detailWarning.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</div>
            </div>
            <div style="display:flex;gap:8px;margin-top:16px;">
              <button class="btn btn-success" (click)="acknowledge(detailWarning!); detailWarning = null;">确认预警</button>
              <button class="btn btn-outline" (click)="detailWarning = null">关闭</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`:host { display: block; }`]
})
export class CollisionWarningComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('warningCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  warnings: Warning[] = [];
  detailWarning: Warning | null = null;

  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<Warning[]>('/warnings/active').subscribe({
      next: d => { this.warnings = d; },
      error: () => { this.warnings = this.mockWarnings(); }
    });
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }

  levelText(level: string): string {
    const map: Record<string, string> = { critical: '极高', high: '高', medium: '中', low: '低' };
    return map[level] || level;
  }

  typeText(type: string): string {
    const map: Record<string, string> = {
      collision: '碰撞风险',
      blindspot_intrusion: '盲区入侵',
      zone_violation: '区域违规',
      speed_violation: '超速违规'
    };
    return map[type] || type;
  }

  showDetail(w: Warning): void {
    this.detailWarning = w;
  }

  acknowledge(w: Warning): void {
    w.status = 'acknowledged';
    this.warnings = this.warnings.filter(x => x.id !== w.id);
    this.api.post('/warnings/' + w.id + '/acknowledge', {}).subscribe();
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

    const levelColors: Record<string, string> = {
      critical: '#ff4757',
      high: '#ffa502',
      medium: '#ffd32a',
      low: '#2ed573'
    };

    for (const w of this.warnings) {
      const color = levelColors[w.level] || '#2ed573';
      const pulse = Math.sin(Date.now() / (w.level === 'critical' ? 150 : 300)) * 0.5 + 0.5;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + pulse * 0.6;
      ctx.beginPath();
      ctx.arc(w.position.x, w.position.y, 20 + pulse * 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w.position.x, w.position.y, 30 + pulse * 15, 0, Math.PI * 2);
      ctx.globalAlpha = 0.2 + pulse * 0.3;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(w.position.x, w.position.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.font = '11px sans-serif';
      ctx.fillText(w.forkliftName, w.position.x + 14, w.position.y - 8);
      ctx.fillStyle = '#c8d6e5';
      ctx.font = '10px sans-serif';
      ctx.fillText(w.message, w.position.x + 14, w.position.y + 6);
    }
  }

  private mockWarnings(): Warning[] {
    return [
      { id: 'w1', type: 'collision', level: 'critical', forkliftId: 'f1', forkliftName: '叉车A01', personnelId: 'p1', personnelName: '张三', position: { x: 200, y: 180 }, message: '人员进入碰撞风险区', timestamp: new Date(), status: 'active' },
      { id: 'w2', type: 'blindspot_intrusion', level: 'high', forkliftId: 'f2', forkliftName: '叉车A02', personnelId: 'p2', personnelName: '李四', position: { x: 400, y: 250 }, message: '人员进入叉车盲区', timestamp: new Date(), status: 'active' },
      { id: 'w3', type: 'zone_violation', level: 'medium', forkliftId: 'f3', forkliftName: '叉车B01', position: { x: 550, y: 120 }, message: '叉车驶入限制区域', timestamp: new Date(), status: 'active' },
      { id: 'w4', type: 'speed_violation', level: 'low', forkliftId: 'f4', forkliftName: '叉车B02', position: { x: 300, y: 350 }, message: '超速行驶 3.2m/s', timestamp: new Date(), status: 'active' },
      { id: 'w5', type: 'collision', level: 'critical', forkliftId: 'f5', forkliftName: '叉车C01', personnelId: 'p3', personnelName: '王五', position: { x: 150, y: 320 }, message: '碰撞风险极高', timestamp: new Date(), status: 'active' }
    ];
  }
}
