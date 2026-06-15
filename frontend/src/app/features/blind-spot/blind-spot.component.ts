import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { BlindSpot } from '../../core/models';

@Component({
  selector: 'app-blind-spot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h2>盲区识别</h2>
      <p>实时叉车盲区覆盖分析与风险评估</p>
    </div>

    <div class="content-grid" style="grid-template-columns:1fr 360px;">
      <div class="card">
        <div class="card-header">
          <h3>盲区覆盖图</h3>
          <div style="display:flex;gap:12px;font-size:12px;">
            <span style="color:#ff4757;">● 极高风险</span>
            <span style="color:#ffa502;">● 高风险</span>
            <span style="color:#ffd32a;">● 中风险</span>
            <span style="color:#2ed573;">● 低风险</span>
          </div>
        </div>
        <div class="card-body">
          <canvas #blindCanvas width="800" height="500"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>盲区详情</h3>
          <span style="font-size:12px;color:#5a7a9a;">{{ blindSpots.length }} 个盲区</span>
        </div>
        <div class="warning-list-scroll" style="max-height:540px;">
          @for (bs of blindSpots; track bs.id) {
            <div class="warning-item" style="flex-direction:column;align-items:flex-start;gap:6px;">
              <div style="display:flex;align-items:center;gap:8px;width:100%;">
                <span class="warning-dot" [class]="bs.riskLevel"></span>
                <span style="color:#e8f0fe;font-weight:500;">{{ bs.forkliftName }}</span>
                <span class="risk-badge" [class]="bs.riskLevel">{{ levelText(bs.riskLevel) }}</span>
              </div>
              <div style="display:flex;gap:16px;font-size:12px;color:#5a7a9a;padding-left:16px;">
                <span>角度: {{ (bs.endAngle - bs.startAngle) * 180 / Math.PI | number:'1.0-0' }}°</span>
                <span>半径: {{ bs.radius | number:'1.0-0' }}m</span>
              </div>
              @if (bs.overlappingPersonnel.length > 0) {
                <div style="font-size:12px;color:#ff4757;padding-left:16px;">
                  ⚠ 检测到 {{ bs.overlappingPersonnel.length }} 名人员在盲区内
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class BlindSpotComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('blindCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  Math = Math;

  blindSpots: BlindSpot[] = [];
  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<BlindSpot[]>('/blindspots').subscribe({
      next: d => { this.blindSpots = d; },
      error: () => { this.blindSpots = this.mockBlindSpots(); }
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

    const riskColors: Record<string, string> = {
      critical: 'rgba(255,71,87,0.3)',
      high: 'rgba(255,165,2,0.25)',
      medium: 'rgba(255,211,42,0.2)',
      low: 'rgba(46,213,115,0.12)'
    };

    const strokeColors: Record<string, string> = {
      critical: '#ff4757',
      high: '#ffa502',
      medium: '#ffd32a',
      low: '#2ed573'
    };

    for (const bs of this.blindSpots) {
      ctx.fillStyle = riskColors[bs.riskLevel] || riskColors['low'];
      ctx.strokeStyle = strokeColors[bs.riskLevel] || strokeColors['low'];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bs.cx, bs.cy);
      ctx.arc(bs.cx, bs.cy, bs.radius, bs.startAngle, bs.endAngle);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(bs.cx, bs.cy);
      const midAngle = (bs.startAngle + bs.endAngle) / 2;
      const labelR = bs.radius * 0.6;
      ctx.fillStyle = strokeColors[bs.riskLevel] || strokeColors['low'];
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bs.forkliftName, Math.cos(midAngle) * labelR, Math.sin(midAngle) * labelR);
      ctx.restore();

      ctx.fillStyle = '#ffa502';
      ctx.beginPath();
      ctx.arc(bs.cx, bs.cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffa50266';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bs.cx, bs.cy, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const bs of this.blindSpots) {
      if (bs.overlappingPersonnel.length > 0) {
        const midAngle = (bs.startAngle + bs.endAngle) / 2;
        const px = bs.cx + Math.cos(midAngle) * (bs.radius * 0.8);
        const py = bs.cy + Math.sin(midAngle) * (bs.radius * 0.8);
        ctx.fillStyle = '#2ed573';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(px, py, 12 + Math.sin(Date.now() / 300) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private mockBlindSpots(): BlindSpot[] {
    return [
      { id: 'bs1', forkliftId: 'f1', forkliftName: '叉车A01', cx: 200, cy: 200, startAngle: -Math.PI / 6, endAngle: Math.PI / 3, radius: 90, riskLevel: 'critical', overlappingPersonnel: ['p1'] },
      { id: 'bs2', forkliftId: 'f2', forkliftName: '叉车A02', cx: 450, cy: 150, startAngle: Math.PI * 0.3, endAngle: Math.PI * 0.9, radius: 100, riskLevel: 'high', overlappingPersonnel: [] },
      { id: 'bs3', forkliftId: 'f3', forkliftName: '叉车B01', cx: 600, cy: 300, startAngle: Math.PI * 1.1, endAngle: Math.PI * 1.7, radius: 85, riskLevel: 'medium', overlappingPersonnel: [] },
      { id: 'bs4', forkliftId: 'f4', forkliftName: '叉车B02', cx: 300, cy: 380, startAngle: -Math.PI / 3, endAngle: Math.PI / 6, radius: 70, riskLevel: 'low', overlappingPersonnel: [] },
      { id: 'bs5', forkliftId: 'f5', forkliftName: '叉车C01', cx: 150, cy: 400, startAngle: Math.PI * 0.5, endAngle: Math.PI, radius: 95, riskLevel: 'high', overlappingPersonnel: ['p2'] }
    ];
  }
}
