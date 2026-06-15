import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { EventRecord } from '../../core/models';

interface ReplayFrame {
  timestamp: number;
  forklifts: { id: string; name: string; x: number; y: number; heading: number }[];
  personnel: { id: string; name: string; x: number; y: number }[];
  warnings: { id: string; x: number; y: number; level: string; message: string }[];
}

@Component({
  selector: 'app-event-replay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>事件回放</h2>
      <p>历史事件动画回放与轨迹分析</p>
    </div>

    <div class="toolbar">
      <div class="form-group" style="margin:0;">
        <input type="date" class="form-control" [(ngModel)]="selectedDate" style="width:180px;" />
      </div>
      <select class="form-control" [(ngModel)]="selectedEventId" style="width:200px;" (change)="loadEvent()">
        <option value="">选择事件</option>
        @for (e of events; track e.id) {
          <option [value]="e.id">{{ e.description }} ({{ e.timestamp | date:'HH:mm:ss' }})</option>
        }
      </select>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <h3>回放画面</h3>
        <span style="font-size:12px;color:#5a7a9a;">{{ currentTime | date:'HH:mm:ss' }}</span>
      </div>
      <div class="card-body">
        <canvas #replayCanvas width="900" height="450"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="playback-controls">
          <button class="btn btn-primary" (click)="togglePlayback()">{{ isPlaying ? '暂停' : '播放' }}</button>
          <button class="btn btn-outline" (click)="stopPlayback()">停止</button>
          <button class="btn btn-outline" (click)="changeSpeed()" style="min-width:50px;">{{ playbackSpeed }}x</button>
          <div class="progress-bar" (click)="seekTo($event)">
            <div class="progress-fill" [style.width.%]="progress"></div>
          </div>
          <span style="font-size:12px;color:#5a7a9a;min-width:80px;">{{ formatTime(currentFrameIndex) }} / {{ formatTime(totalFrames) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class EventReplayComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('replayCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  events: EventRecord[] = [];
  frames: ReplayFrame[] = [];
  selectedDate = new Date().toISOString().split('T')[0];
  selectedEventId = '';
  isPlaying = false;
  playbackSpeed = 1;
  progress = 0;
  currentTime = new Date();
  currentFrameIndex = 0;
  totalFrames = 100;

  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;
  private lastFrameTime = 0;
  private frameInterval = 100;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<EventRecord[]>('/events').subscribe({
      next: d => { this.events = d; },
      error: () => { this.events = this.mockEvents(); }
    });
    this.generateMockFrames();
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.drawFrame();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }

  loadEvent(): void {
    this.generateMockFrames();
    this.currentFrameIndex = 0;
    this.progress = 0;
    this.isPlaying = false;
    this.drawFrame();
  }

  togglePlayback(): void {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.lastFrameTime = performance.now();
      this.playLoop();
    }
  }

  stopPlayback(): void {
    this.isPlaying = false;
    this.currentFrameIndex = 0;
    this.progress = 0;
    this.drawFrame();
  }

  changeSpeed(): void {
    const speeds = [0.5, 1, 2, 4];
    const idx = speeds.indexOf(this.playbackSpeed);
    this.playbackSpeed = speeds[(idx + 1) % speeds.length];
    this.frameInterval = 100 / this.playbackSpeed;
  }

  seekTo(e: MouseEvent): void {
    const bar = (e.target as HTMLElement).closest('.progress-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    this.currentFrameIndex = Math.floor(ratio * this.totalFrames);
    this.progress = ratio * 100;
    this.drawFrame();
  }

  formatTime(frame: number): string {
    const seconds = Math.floor(frame * 0.5);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private playLoop(): void {
    if (!this.isPlaying) return;
    const now = performance.now();
    if (now - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = now;
      this.currentFrameIndex++;
      if (this.currentFrameIndex >= this.totalFrames) {
        this.isPlaying = false;
        this.currentFrameIndex = this.totalFrames - 1;
      }
      this.progress = (this.currentFrameIndex / this.totalFrames) * 100;
      this.currentTime = new Date(this.currentTime.getTime() + 500);
      this.drawFrame();
    }
    this.animFrameId = requestAnimationFrame(() => this.playLoop());
  }

  private drawFrame(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const canvas = this.canvasRef.nativeElement;
    const frame = this.frames[this.currentFrameIndex] || this.frames[this.frames.length - 1];
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

    ctx.fillStyle = '#1e90ff33';
    ctx.fillRect(40, 40, 200, 160);
    ctx.strokeStyle = '#1e90ff';
    ctx.strokeRect(40, 40, 200, 160);
    ctx.fillStyle = '#1e90ff';
    ctx.font = '12px sans-serif';
    ctx.fillText('冷藏区A', 50, 58);

    ctx.fillStyle = '#2ed57333';
    ctx.fillRect(260, 40, 200, 160);
    ctx.strokeStyle = '#2ed573';
    ctx.strokeRect(260, 40, 200, 160);
    ctx.fillStyle = '#2ed573';
    ctx.fillText('主通道', 270, 58);

    ctx.fillStyle = '#ffa50233';
    ctx.fillRect(480, 40, 200, 160);
    ctx.strokeStyle = '#ffa502';
    ctx.strokeRect(480, 40, 200, 160);
    ctx.fillStyle = '#ffa502';
    ctx.fillText('装卸区', 490, 58);

    if (frame) {
      for (const f of frame.forklifts) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate((f.heading * Math.PI) / 180);
        ctx.fillStyle = '#ffa502';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-8, -8);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#ffa502';
        ctx.font = '10px sans-serif';
        ctx.fillText(f.name, f.x + 18, f.y + 4);
      }

      for (const p of frame.personnel) {
        ctx.fillStyle = '#2ed573';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2ed573';
        ctx.font = '10px sans-serif';
        ctx.fillText(p.name, p.x + 10, p.y + 4);
      }

      for (const w of frame.warnings) {
        const color = w.level === 'critical' ? '#ff4757' : w.level === 'high' ? '#ffa502' : '#ffd32a';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w.x, w.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = '9px sans-serif';
        ctx.fillText(w.message, w.x + 20, w.y + 4);
      }
    }

    ctx.fillStyle = '#5a7a9a';
    ctx.font = '11px sans-serif';
    ctx.fillText('回放时间: ' + this.formatTime(this.currentFrameIndex), canvas.width - 140, canvas.height - 12);
  }

  private generateMockFrames(): void {
    this.frames = [];
    this.totalFrames = 120;
    const fStartX = 100, fStartY = 120;
    const pStartX = 500, pStartY = 200;

    for (let i = 0; i < this.totalFrames; i++) {
      const t = i / this.totalFrames;
      const frame: ReplayFrame = {
        timestamp: Date.now() + i * 500,
        forklifts: [
          { id: 'f1', name: '叉车A01', x: fStartX + t * 400, y: fStartY + Math.sin(t * Math.PI * 4) * 40, heading: t < 0.5 ? 0 : 180 }
        ],
        personnel: [
          { id: 'p1', name: '张三', x: pStartX - t * 200, y: pStartY + Math.cos(t * Math.PI * 3) * 30 }
        ],
        warnings: t > 0.3 && t < 0.6 ? [
          { id: 'w1', x: (fStartX + t * 400 + pStartX - t * 200) / 2, y: 180, level: 'critical', message: '接近碰撞' }
        ] : []
      };
      this.frames.push(frame);
    }
  }

  private mockEvents(): EventRecord[] {
    return [
      { id: 'e1', type: 'collision', level: 'critical', forkliftId: 'f1', forkliftName: '叉车A01', personnelId: 'p1', personnelName: '张三', position: { x: 300, y: 180 }, description: '叉车与人员接近碰撞', timestamp: new Date(), duration: 15, teamId: 't1' },
      { id: 'e2', type: 'blindspot_intrusion', level: 'high', forkliftId: 'f2', forkliftName: '叉车A02', personnelId: 'p2', personnelName: '李四', position: { x: 450, y: 250 }, description: '人员进入叉车盲区', timestamp: new Date(Date.now() - 3600000), duration: 8, teamId: 't2' },
      { id: 'e3', type: 'zone_violation', level: 'medium', forkliftId: 'f3', forkliftName: '叉车B01', position: { x: 550, y: 120 }, description: '叉车违规驶入限制区', timestamp: new Date(Date.now() - 7200000), duration: 25, teamId: 't1' }
    ];
  }
}
