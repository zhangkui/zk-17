import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { Warning, PredictionWarning, riskLevelText, warningTypeText, predictionStatusText } from '../../core/models';
import { SignalRService } from '../../core/services/signalr.service';
import { Subscription } from 'rxjs';

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
        <div class="stat-value red">{{ countByLevel('Critical') + countPredictionsByLevel('Critical') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">高级预警</div>
        <div class="stat-value orange">{{ countByLevel('High') + countPredictionsByLevel('High') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">中级预警</div>
        <div class="stat-value" style="color:#ffd32a;">{{ countByLevel('Medium') + countPredictionsByLevel('Medium') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">低级预警</div>
        <div class="stat-value green">{{ countByLevel('Low') + countPredictionsByLevel('Low') }}</div>
      </div>
    </div>

    <div class="content-grid" style="grid-template-columns:1fr 380px;">
      <div class="card">
        <div class="card-header">
          <h3>预警位置图</h3>
          <div style="display:flex;gap:16px;font-size:12px;">
            <span style="color:#ff4757;">● 已发生</span>
            <span style="color:#9b59b6;">◯ 预测预警</span>
          </div>
        </div>
        <div class="card-body">
          <canvas #warningCanvas width="700" height="420"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="padding:0;">
          <div style="display:flex;">
            <button class="tab-btn" [class.active]="activeTab === 'actual'" (click)="activeTab = 'actual'">
              已发生预警
              <span class="tab-count" style="background:#ff4757;">{{ warnings.length }}</span>
            </button>
            <button class="tab-btn" [class.active]="activeTab === 'prediction'" (click)="activeTab = 'prediction'">
              预测预警
              <span class="tab-count" style="background:#9b59b6;">{{ activePredictionsCount }}</span>
            </button>
          </div>
        </div>
        <div class="warning-list-scroll" style="max-height:460px;">
          @if (activeTab === 'actual') {
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
          }

          @if (activeTab === 'prediction') {
            @for (p of predictions; track p.id) {
              <div class="warning-item prediction-item" style="cursor:pointer;flex-direction:column;align-items:flex-start;gap:4px;" (click)="showPredictionDetail(p)">
                <div style="display:flex;align-items:center;gap:8px;width:100%;">
                  <span class="warning-dot prediction-dot" [class]="p.predictedRiskLevel"></span>
                  <span style="color:#e8f0fe;font-weight:500;flex:1;">
                    {{ p.forkliftName }}
                    <span class="prediction-label">预测</span>
                  </span>
                  <span class="risk-badge prediction-badge" [class]="p.predictedRiskLevel">{{ riskLevelText(p.predictedRiskLevel) }}</span>
                </div>
                <div style="font-size:12px;color:#5a7a9a;padding-left:16px;">{{ p.message }}</div>
                <div style="display:flex;justify-content:space-between;width:100%;padding-left:16px;margin-top:4px;">
                  <span style="font-size:11px;color:#9b59b6;">预计 {{ p.predictedCollisionTime | number:'1.0' }} 秒后接近</span>
                  <span style="font-size:11px;color:#5a7a9a;">{{ p.createdAt | date:'HH:mm:ss' }}</span>
                </div>
                @if (p.status !== 'Active') {
                  <div style="padding-left:16px;margin-top:4px;">
                    <span class="status-tag" [class]="p.status">{{ predictionStatusText(p.status) }}</span>
                  </div>
                }
              </div>
            } @empty {
              <div style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">暂无预测预警</div>
            }
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

    @if (detailPrediction) {
      <div class="modal-overlay" (click)="detailPrediction = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              预测预警详情
              <span class="prediction-label">预测</span>
            </h3>
            <button class="modal-close" (click)="detailPrediction = null">&times;</button>
          </div>
          <div style="font-size:13px;">
            <div class="form-group">
              <label>预警类型</label>
              <div style="color:#e8f0fe;">{{ warningTypeText(detailPrediction.type) }}</div>
            </div>
            <div class="form-group">
              <label>预测风险等级</label>
              <span class="risk-badge prediction-badge" [class]="detailPrediction.predictedRiskLevel">{{ riskLevelText(detailPrediction.predictedRiskLevel) }}</span>
            </div>
            <div class="form-group">
              <label>叉车</label>
              <div style="color:#e8f0fe;">{{ detailPrediction.forkliftName }}</div>
            </div>
            @if (detailPrediction.personnelName) {
              <div class="form-group">
                <label>关联人员</label>
                <div style="color:#e8f0fe;">{{ detailPrediction.personnelName }}</div>
              </div>
            }
            <div class="form-group">
              <label>叉车速度</label>
              <div style="color:#e8f0fe;">{{ detailPrediction.forkliftSpeed | number:'1.1' }} m/s</div>
            </div>
            <div class="form-group">
              <label>预测距离</label>
              <div style="color:#e8f0fe;">{{ detailPrediction.predictedDistance | number:'1.1' }} m</div>
            </div>
            <div class="form-group">
              <label>预计碰撞时间</label>
              <div style="color:#e8f0fe;">{{ detailPrediction.predictedCollisionTime | number:'1.1' }} 秒</div>
            </div>
            <div class="form-group">
              <label>预测信息</label>
              <div style="color:#e8f0fe;">{{ detailPrediction.message }}</div>
            </div>
            <div class="form-group">
              <label>生成时间</label>
              <div style="color:#e8f0fe;">{{ detailPrediction.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
            </div>
            <div class="form-group">
              <label>状态</label>
              <span class="status-tag" [class]="detailPrediction.status">{{ predictionStatusText(detailPrediction.status) }}</span>
            </div>
            @if (detailPrediction.status === 'Active') {
              <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
                <button class="btn btn-success" (click)="acknowledgePrediction(detailPrediction!)">确认</button>
                <button class="btn btn-outline" (click)="ignorePrediction(detailPrediction!)">忽略</button>
                <button class="btn btn-warning" (click)="escalatePrediction(detailPrediction!)">升级处理</button>
                <button class="btn btn-outline" (click)="detailPrediction = null">关闭</button>
              </div>
            } @else {
              <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn btn-outline" (click)="detailPrediction = null">关闭</button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .tab-btn {
      flex: 1;
      padding: 12px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #5a7a9a;
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: #a0c0e0;
    }
    .tab-btn.active {
      color: #00d4ff;
      border-bottom-color: #00d4ff;
      background: rgba(0, 212, 255, 0.05);
    }
    .tab-count {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      color: white;
    }
    .prediction-item {
      border-left: 3px solid #9b59b6;
      background: rgba(155, 89, 182, 0.03);
    }
    .prediction-dot {
      border-style: dashed;
      border-width: 2px;
      background: transparent !important;
    }
    .prediction-label {
      font-size: 10px;
      padding: 1px 6px;
      border: 1px dashed #9b59b6;
      border-radius: 3px;
      color: #9b59b6;
      margin-left: 6px;
      font-weight: normal;
    }
    .prediction-badge {
      border: 1px dashed;
      background: transparent;
    }
    .status-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
    }
    .status-tag.Acknowledged { background: rgba(46, 213, 115, 0.15); color: #2ed573; }
    .status-tag.Ignored { background: rgba(90, 122, 154, 0.15); color: #5a7a9a; }
    .status-tag.Escalated { background: rgba(255, 165, 2, 0.15); color: #ffa502; }
    .status-tag.Resolved { background: rgba(0, 212, 255, 0.15); color: #00d4ff; }
    .status-tag.Expired { background: rgba(128, 128, 128, 0.15); color: #808080; }
    .btn-warning {
      background: rgba(255, 165, 2, 0.15);
      color: #ffa502;
      border: 1px solid #ffa502;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-warning:hover {
      background: rgba(255, 165, 2, 0.25);
    }
  `]
})
export class CollisionWarningComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('warningCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  warnings: Warning[] = [];
  predictions: PredictionWarning[] = [];
  detailWarning: Warning | null = null;
  detailPrediction: PredictionWarning | null = null;

  activeTab: 'actual' | 'prediction' = 'actual';

  get activePredictionsCount(): number {
    return this.predictions.filter(p => p.status === 'Active').length;
  }

  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;
  private sub!: Subscription;

  riskLevelText = riskLevelText;
  warningTypeText = warningTypeText;
  predictionStatusText = predictionStatusText;

  constructor(
    private api: ApiService,
    private signalr: SignalRService
  ) {}

  ngOnInit(): void {
    this.signalr.startConnection();
    this.loadWarnings();
    this.loadPredictions();

    this.sub = this.signalr.message$.subscribe(msg => {
      switch (msg.type) {
        case 'WarningTriggered':
          this.handleWarningTriggered(msg.payload);
          break;
        case 'WarningResolved':
          this.warnings = this.warnings.filter(w => w.id !== msg.payload.id);
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
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    if (this.sub) this.sub.unsubscribe();
  }

  private handleWarningTriggered(payload: any): void {
    const warning = {
      id: payload.id,
      type: payload.warningType || payload.type || 'PersonForkliftApproach',
      level: payload.riskLevel || payload.level || 'Low',
      forkliftId: payload.forkliftId,
      forkliftName: payload.forkliftName || `叉车-${payload.forkliftId?.substring(0, 4)}`,
      personnelId: payload.personnelId,
      personnelName: payload.personnelName,
      zoneId: payload.zoneId,
      position: { x: payload.forkliftPositionX ?? payload.positionX ?? 0, y: payload.forkliftPositionY ?? payload.positionY ?? 0 },
      distance: payload.distance,
      message: payload.message || '预警',
      timestamp: new Date(payload.createdAt || payload.timestamp || Date.now()),
      status: payload.isAcknowledged ? 'acknowledged' : 'active',
      isAcknowledged: payload.isAcknowledged,
      acknowledgedBy: payload.acknowledgedBy,
      acknowledgedAt: payload.acknowledgedAt ? new Date(payload.acknowledgedAt) : undefined
    } as Warning;
    this.warnings.unshift(warning);
    if (this.warnings.length > 100) this.warnings.pop();
  }

  private handlePredictionGenerated(payload: any): void {
    const idx = this.predictions.findIndex(p => p.id === payload.id);
    const prediction = this.convertPredictionPayload(payload);
    if (idx >= 0) {
      this.predictions[idx] = prediction;
    } else {
      this.predictions.unshift(prediction);
      if (this.predictions.length > 50) this.predictions.pop();
    }
  }

  private handlePredictionUpdated(payload: any): void {
    const idx = this.predictions.findIndex(p => p.id === payload.id);
    if (idx >= 0) {
      if (payload.status && payload.status !== 'Active') {
        this.predictions[idx] = { ...this.predictions[idx], status: payload.status };
      } else {
        this.predictions[idx] = this.convertPredictionPayload(payload);
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
      type: payload.warningType || payload.type || 'PersonForkliftApproach',
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

  countByLevel(level: string): number {
    return this.warnings.filter(w => w.level === level).length;
  }

  countPredictionsByLevel(level: string): number {
    return this.predictions.filter(p => p.predictedRiskLevel === level && p.status === 'Active').length;
  }

  showDetail(w: Warning): void {
    this.detailWarning = w;
  }

  showPredictionDetail(p: PredictionWarning): void {
    this.detailPrediction = p;
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

  acknowledgePrediction(p: PredictionWarning): void {
    this.api.acknowledgePrediction(p.id, 'operator').subscribe({
      next: (updated) => {
        const idx = this.predictions.findIndex(x => x.id === p.id);
        if (idx >= 0) this.predictions[idx] = updated;
        this.detailPrediction = null;
      }
    });
  }

  ignorePrediction(p: PredictionWarning): void {
    this.api.ignorePrediction(p.id, 'operator').subscribe({
      next: (updated) => {
        const idx = this.predictions.findIndex(x => x.id === p.id);
        if (idx >= 0) this.predictions[idx] = updated;
        this.detailPrediction = null;
      }
    });
  }

  escalatePrediction(p: PredictionWarning): void {
    this.api.escalatePrediction(p.id, 'operator').subscribe({
      next: (updated) => {
        const idx = this.predictions.findIndex(x => x.id === p.id);
        if (idx >= 0) this.predictions[idx] = updated;
        this.detailPrediction = null;
      }
    });
  }

  private loadWarnings(): void {
    this.api.getWarnings().subscribe(d => {
      this.warnings = d.filter(w => w.status === 'active');
    });
  }

  private loadPredictions(): void {
    this.api.getActivePredictions().subscribe(d => {
      this.predictions = d;
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

    for (const p of this.predictions) {
      if (p.status !== 'Active') continue;
      const color = '#9b59b6';
      const pulse = Math.sin(Date.now() / 400) * 0.5 + 0.5;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.globalAlpha = 0.3 + pulse * 0.4;
      ctx.beginPath();
      ctx.arc(p.forkliftPositionX, p.forkliftPositionY, 25 + pulse * 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.forkliftPositionX, p.forkliftPositionY, 38 + pulse * 12, 0, Math.PI * 2);
      ctx.globalAlpha = 0.15 + pulse * 0.2;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('预测预警', p.forkliftPositionX + 14, p.forkliftPositionY - 14);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c8d6e5';
      ctx.font = '10px sans-serif';
      ctx.fillText(p.message, p.forkliftPositionX + 14, p.forkliftPositionY + 4);
      ctx.fillStyle = '#9b59b6';
      ctx.font = '9px sans-serif';
      ctx.fillText(`预计 ${p.predictedCollisionTime.toFixed(0)}s`, p.forkliftPositionX + 14, p.forkliftPositionY + 18);
    }
  }
}
