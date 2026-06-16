import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Warning, riskLevelText, warningTypeText } from '../../core/models';

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
        <div class="stat-value red">{{ countByLevel('critical') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">高级预警</div>
        <div class="stat-value orange">{{ countByLevel('high') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">中级预警</div>
        <div class="stat-value" style="color:#ffd32a;">{{ countByLevel('medium') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">低级预警</div>
        <div class="stat-value green">{{ countByLevel('low') }}</div>
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
            <div class="warning-item" [style.animation]="w.level === 'Critical' ? 'blink 1s infinite' : 'none'" style="cursor:pointer;flex-direction:column;align-items:flex-start;gap:4px;" (click)="showDetail(w)">
              <div style="display:flex;align-items:center;gap:8px;width:100%;">
                <span class="warning-dot" [class]="w.level"></span>
                <span style="color:#e8f0fe;font-weight:500;flex:1;">{{ w.forkliftName }}</span>
                <span class="risk-badge" [class]="w.level">{{ riskLevelText(w.level) }}</span>
              </div>
              <div style="font-size:12px;color:#5a7a9a;padding-left:16px;">{{ w.message }}</div>
              <div style="display:flex;justify-content:space-between;width:100%;padding-left:16px;margin-top:4px;">
                <span style="font-size:11px;color:#5a7a9a;">{{ w.timestamp | date:'HH:mm:ss' }}</span>
                <button class="btn btn-success" style="padding:2px 10px;font-size:11px;" (click)="acknowledge(w); $event.stopPropagation()">确认</button>
              </div>
            </div>
          } @empty {
            <div style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">暂无活跃预警</div>
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
              <div style="color:#e8f0fe;">{{ warningTypeText(detailWarning.type) }}</div>
            </div>
            <div class="form-group">
              <label>风险等级</label>
              <span class="risk-badge" [class]="detailWarning.level">{{ riskLevelText(detailWarning.level) }}</span>
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
            @if (detailWarning.distance !== undefined && detailWarning.distance !== null) {
              <div class="form-group">
                <label>距离</label>
                <div style="color:#e8f0fe;">{{ detailWarning.distance }} m</div>
              </div>
            }
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

  riskLevelText = riskLevelText;
  warningTypeText = warningTypeText;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadWarnings();
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }

  countByLevel(level: string): number {
    return this.warnings.filter(w => w.level === level).length;
  }

  showDetail(w: Warning): void {
    this.detailWarning = w;
  }

  acknowledge(w: Warning): void {
    this.api.acknowledgeWarning(w.id, 'operator').subscribe({
      next: () => {
        w.status = 'acknowledged';
        w.isAcknowledged = true;
        this.warnings = this.warnings.filter(x => x.id !== w.id);
      }
    });
  }

  private loadWarnings(): void {
    this.api.getWarnings().subscribe(d => {
      this.warnings = d.filter(w => w.status === 'active');
    });
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
      const pulse = Math.sin(Date.now() / (w.level === 'Critical' ? 150 : 300)) * 0.5 + 0.5;

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
}
