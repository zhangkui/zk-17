import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import {
  Statistics,
  HighRiskPeriodDto,
  WarningTrendDto,
  ZoneRiskDto,
  TeamSafetyDto,
  riskLevelText,
  riskLevelValue
} from '../../core/models';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h2>统计分析</h2>
      <p>碰撞风险数据分析与安全态势评估</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="card">
        <div class="card-header">
          <h3>24小时高风险时段</h3>
        </div>
        <div class="card-body">
          <canvas #hourlyCanvas width="500" height="260"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>预警趋势</h3>
        </div>
        <div class="card-body">
          <canvas #trendCanvas width="500" height="260"></canvas>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card">
        <div class="card-header">
          <h3>区域风险排名</h3>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>区域</th>
                  <th>风险评分</th>
                  <th>事件数</th>
                  <th>风险等级</th>
                </tr>
              </thead>
              <tbody>
                @for (z of stats.zoneRiskRanking; track z.zoneId; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td>{{ z.zoneName }}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:6px;background:#1b3a5c;border-radius:3px;">
                          <div [style.width.%]="riskLevelValue(z.riskLevel)" style="height:100%;border-radius:3px;" [style.background]="riskColor(riskLevelValue(z.riskLevel))"></div>
                        </div>
                        <span style="min-width:30px;text-align:right;">{{ riskLevelValue(z.riskLevel) }}</span>
                      </div>
                    </td>
                    <td>{{ z.warningCount }}</td>
                    <td><span class="risk-badge" [class]="riskLevel(riskLevelValue(z.riskLevel))">{{ riskLevelText(riskLevel(riskLevelValue(z.riskLevel))) }}</span></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" style="padding:24px;text-align:center;color:#5a7a9a;">暂无区域风险数据</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>班组安全评分</h3>
        </div>
        <div class="card-body">
          <canvas #radarCanvas width="400" height="300"></canvas>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class StatisticsComponent implements OnInit, AfterViewInit {
  @ViewChild('hourlyCanvas', { static: true }) hourlyCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendCanvas', { static: true }) trendCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('radarCanvas', { static: true }) radarCanvasRef!: ElementRef<HTMLCanvasElement>;

  stats: Statistics = {
    hourlyWarnings: [],
    warningTrend: [],
    zoneRiskRanking: [],
    teamSafetyScores: []
  };

  riskColor = (score: number) => {
    if (score >= 80) return '#ff4757';
    if (score >= 60) return '#ffa502';
    if (score >= 40) return '#ffd32a';
    return '#2ed573';
  };

  riskLevel = (score: number): 'critical' | 'high' | 'medium' | 'low' => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  riskLevelText = (level: string): string => {
    const map: Record<string, string> = { critical: '极高', high: '高', medium: '中', low: '低' };
    return map[level] || level;
  };

  riskLevelValue = riskLevelValue;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getStatistics().subscribe({
      next: d => {
        this.stats = d;
        setTimeout(() => this.drawAll(), 50);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.stats.hourlyWarnings.length > 0) {
      this.drawAll();
    }
  }

  private drawAll(): void {
    this.drawHourlyChart();
    this.drawTrendChart();
    this.drawRadarChart();
  }

  private drawHourlyChart(): void {
    const canvas = this.hourlyCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const data = new Array(24).fill(0);

    for (const item of this.stats.hourlyWarnings) {
      if (item.hour >= 0 && item.hour < 24) {
        data[item.hour] = item.eventCount;
      }
    }

    const w = canvas.width, h = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#081220';
    ctx.fillRect(0, 0, w, h);

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data, 1);
    const barW = chartW / 24;

    ctx.strokeStyle = '#1b3a5c';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartH / 5) * i;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
      ctx.fillStyle = '#5a7a9a';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 5) * i).toString(), padding.left - 8, y + 4);
    }

    for (let i = 0; i < 24; i++) {
      const x = padding.left + i * barW;
      const barH = (data[i] / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      if (data[i] > maxVal * 0.7) {
        gradient.addColorStop(0, '#ff4757');
        gradient.addColorStop(1, 'rgba(255,71,87,0.3)');
      } else if (data[i] > maxVal * 0.4) {
        gradient.addColorStop(0, '#ffa502');
        gradient.addColorStop(1, 'rgba(255,165,2,0.3)');
      } else {
        gradient.addColorStop(0, '#00d4ff');
        gradient.addColorStop(1, 'rgba(0,212,255,0.3)');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 2, y, barW - 4, barH);

      ctx.fillStyle = '#5a7a9a';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i.toString(), x + barW / 2, h - padding.bottom + 16);
    }
  }

  private drawTrendChart(): void {
    const canvas = this.trendCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const data = this.stats.warningTrend;
    const w = canvas.width, h = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#081220';
    ctx.fillRect(0, 0, w, h);

    if (data.length === 0) return;

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map(d => d.totalCount), 1);

    ctx.strokeStyle = '#1b3a5c';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartH / 5) * i;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
      ctx.fillStyle = '#5a7a9a';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 5) * i).toString(), padding.left - 8, y + 4);
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, 'rgba(0,212,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,212,255,0)');

    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);
    for (let i = 0; i < data.length; i++) {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padding.top + chartH - (data[i].totalCount / maxVal) * chartH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padding.top + chartH - (data[i].totalCount / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < data.length; i += Math.max(1, Math.floor(data.length / 7))) {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
      ctx.fillStyle = '#5a7a9a';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      const dateLabel = typeof data[i].date === 'string'
        ? data[i].date.substring(5)
        : new Date(data[i].date).toLocaleDateString().substring(5);
      ctx.fillText(dateLabel, x, h - padding.bottom + 16);
    }
  }

  private drawRadarChart(): void {
    const canvas = this.radarCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const data = this.stats.teamSafetyScores;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2 + 10;
    const r = Math.min(w, h) / 2 - 50;
    const labels = ['安全评分', '预警总数', '极高预警', '确认率', '综合评估'];
    const sides = 5;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#081220';
    ctx.fillRect(0, 0, w, h);

    for (let ring = 5; ring >= 1; ring--) {
      const ringR = (r / 5) * ring;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * ringR;
        const y = cy + Math.sin(angle) * ringR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#1b3a5c';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = '#1b3a5c';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      const labelR = r + 20;
      ctx.fillStyle = '#5a7a9a';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR + 4);
    }

    const teamColors = ['#00d4ff', '#ffa502', '#2ed573', '#ff4757', '#9b59b6'];

    for (let t = 0; t < data.length; t++) {
      const team = data[t];
      const values = [
        team.safetyScore,
        Math.min((team.totalWarnings / 50) * 100, 100),
        Math.min((team.criticalWarnings / 20) * 100, 100),
        team.acknowledgedRate * 100,
        Math.min((team.safetyScore + team.acknowledgedRate * 100) / 2, 100)
      ];
      const color = teamColors[t % teamColors.length];

      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
        const vr = (values[i] / 100) * r;
        const x = cx + Math.cos(angle) * vr;
        const y = cy + Math.sin(angle) * vr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = color + '22';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
        const vr = (values[i] / 100) * r;
        const x = cx + Math.cos(angle) * vr;
        const y = cy + Math.sin(angle) * vr;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let t = 0; t < data.length; t++) {
      const color = teamColors[t % teamColors.length];
      ctx.fillStyle = color;
      ctx.fillRect(20, 20 + t * 20, 12, 12);
      ctx.fillStyle = '#c8d6e5';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(data[t].teamName, 38, 31 + t * 20);
    }
  }
}
