import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  EventRecord,
  EventReplayDto,
  PositionRecordDto,
  warningTypeText,
  riskLevelText
} from '../../core/models';

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
        <input type="date" class="form-control" [(ngModel)]="selectedDate" style="width:180px;" (change)="loadEvents()" />
      </div>
      <select class="form-control" [(ngModel)]="selectedEventId" style="width:300px;" (change)="selectEvent()">
        <option value="">选择事件</option>
        @for (e of events; track e.id) {
          <option [value]="e.id">{{ warningTypeText(e.type) }} - {{ e.forkliftName }} ({{ e.timestamp | date:'HH:mm:ss' }})</option>
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
  totalFrames = 0;

  warningTypeText = warningTypeText;
  riskLevelText = riskLevelText;

  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;
  private lastFrameTime = 0;
  private frameInterval = 100;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.drawFrame();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }

  loadEvents(): void {
    const date = new Date(this.selectedDate);
    const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
    const endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();

    const startTimeStr = startTime;
    const endTimeStr = endTime;

    this.api.getEvents(startTimeStr, endTimeStr).subscribe({
      next: d => {
        this.events = d;
      }
    });
  }

  selectEvent(): void {
    if (!this.selectedEventId) return;

    const event = this.events.find(e => e.id === this.selectedEventId);
    if (!event) return;

    const startTime = new Date(event.timestamp);
    startTime.setMinutes(startTime.getMinutes() - 2);
    const endTime = new Date(event.timestamp);
    endTime.setMinutes(endTime.getMinutes() + 2);

    this.api.getReplayData(startTime.toISOString(), endTime.toISOString()).subscribe({
      next: replayData => {
        this.generateFramesFromReplayData(replayData, event);
        this.currentFrameIndex = 0;
        this.progress = 0;
        this.isPlaying = false;
        this.currentTime = startTime;
        this.drawFrame();
      }
    });
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

  private generateFramesFromReplayData(replayData: EventReplayDto, event: EventRecord): void {
    this.frames = [];
    this.totalFrames = 120;

    const positions = replayData.positionRecords || [];
    const warnings = replayData.collisionWarnings || [];

    const forkliftMap = new Map<string, { name: string; positions: PositionRecordDto[] }>();
    const personnelMap = new Map<string, { name: string; positions: PositionRecordDto[] }>();

    for (const pos of positions) {
      if (pos.entityType === 'Forklift' || pos.entityType === '0') {
        if (!forkliftMap.has(pos.entityId)) {
          forkliftMap.set(pos.entityId, { name: `叉车-${pos.entityId.substring(0, 4)}`, positions: [] });
        }
        forkliftMap.get(pos.entityId)!.positions.push(pos);
      } else if (pos.entityType === 'Personnel' || pos.entityType === '1') {
        if (!personnelMap.has(pos.entityId)) {
          personnelMap.set(pos.entityId, { name: `人员-${pos.entityId.substring(0, 4)}`, positions: [] });
        }
        personnelMap.get(pos.entityId)!.positions.push(pos);
      }
    }

    for (const [fId, data] of forkliftMap) {
      data.positions.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    }
    for (const [pId, data] of personnelMap) {
      data.positions.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    }

    for (let i = 0; i < this.totalFrames; i++) {
      const t = i / this.totalFrames;
      const frame: ReplayFrame = {
        timestamp: Date.now() + i * 500,
        forklifts: [],
        personnel: [],
        warnings: []
      };

      for (const [fId, data] of forkliftMap) {
        const pos = this.interpolatePosition(data.positions, t);
        frame.forklifts.push({
          id: fId,
          name: data.name,
          x: pos.x,
          y: pos.y,
          heading: pos.heading
        });
      }

      for (const [pId, data] of personnelMap) {
        const pos = this.interpolatePosition(data.positions, t);
        frame.personnel.push({
          id: pId,
          name: data.name,
          x: pos.x,
          y: pos.y
        });
      }

      if (t > 0.3 && t < 0.7) {
        frame.warnings.push({
          id: event.id,
          x: event.position.x,
          y: event.position.y,
          level: event.level,
          message: event.description
        });
      }

      this.frames.push(frame);
    }

    if (this.frames.length === 0) {
      this.generateDefaultFrames(event);
    }
  }

  private interpolatePosition(positions: PositionRecordDto[], t: number): { x: number; y: number; heading: number } {
    if (positions.length === 0) {
      return { x: 100 + Math.random() * 700, y: 100 + Math.random() * 300, heading: 0 };
    }
    if (positions.length === 1) {
      return { x: positions[0].positionX, y: positions[0].positionY, heading: positions[0].direction || 0 };
    }

    const idx = Math.min(Math.floor(t * (positions.length - 1)), positions.length - 2);
    const localT = (t * (positions.length - 1)) - idx;
    const a = positions[idx];
    const b = positions[idx + 1];

    return {
      x: a.positionX + (b.positionX - a.positionX) * localT,
      y: a.positionY + (b.positionY - a.positionY) * localT,
      heading: (a.direction || 0) + ((b.direction || 0) - (a.direction || 0)) * localT
    };
  }

  private generateDefaultFrames(event: EventRecord): void {
    this.frames = [];
    this.totalFrames = 120;
    const fStartX = event.position.x - 200;
    const fStartY = event.position.y;
    const pStartX = event.position.x + 200;
    const pStartY = event.position.y + 50;

    for (let i = 0; i < this.totalFrames; i++) {
      const t = i / this.totalFrames;
      const frame: ReplayFrame = {
        timestamp: Date.now() + i * 500,
        forklifts: [
          { id: event.forkliftId, name: event.forkliftName, x: fStartX + t * 350, y: fStartY + Math.sin(t * Math.PI * 4) * 30, heading: t < 0.5 ? 0 : 180 }
        ],
        personnel: event.personnelId ? [
          { id: event.personnelId, name: event.personnelName || '人员', x: pStartX - t * 300, y: pStartY + Math.cos(t * Math.PI * 3) * 25 }
        ] : [],
        warnings: t > 0.3 && t < 0.7 ? [
          { id: event.id, x: event.position.x, y: event.position.y, level: event.level, message: event.description }
        ] : []
      };
      this.frames.push(frame);
    }
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

    const zones = [
      { x: 40, y: 40, w: 200, h: 160, color: '#1e90ff', name: '冷藏区A' },
      { x: 260, y: 40, w: 200, h: 160, color: '#2ed573', name: '主通道' },
      { x: 480, y: 40, w: 200, h: 160, color: '#ffa502', name: '装卸区' },
      { x: 40, y: 220, w: 300, h: 180, color: '#9b59b6', name: '充电区' },
      { x: 360, y: 220, w: 320, h: 180, color: '#ff4757', name: '限制区' }
    ];

    for (const z of zones) {
      ctx.fillStyle = z.color + '22';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = z.color + 'aa';
      ctx.font = '12px sans-serif';
      ctx.fillText(z.name, z.x + 6, z.y + 18);
    }

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
}
