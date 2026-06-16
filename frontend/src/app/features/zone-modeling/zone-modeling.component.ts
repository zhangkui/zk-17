import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Zone, Obstacle, zoneTypeColors } from '../../core/models';

@Component({
  selector: 'app-zone-modeling',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>区域建模</h2>
      <p>定义冷库区域布局与障碍物位置</p>
    </div>

    <div class="content-grid" style="grid-template-columns: 280px 1fr;">
      <div class="card">
        <div class="card-header">
          <h3>区域列表</h3>
          <button class="btn btn-primary" (click)="addZone()">+ 新增</button>
        </div>
        <div class="card-body" style="padding:0;">
          <ul class="zone-list">
            @for (z of zones; track z.id) {
              <li [class.selected]="selectedZone?.id === z.id" (click)="selectZone(z)">
                <span>{{ z.name }}</span>
                <div>
                  <button class="btn btn-outline" style="padding:2px 8px;font-size:11px;" (click)="editZone(z); $event.stopPropagation()">编辑</button>
                  <button class="btn btn-danger" style="padding:2px 8px;font-size:11px;margin-left:4px;" (click)="deleteZone(z.id); $event.stopPropagation()">删除</button>
                </div>
              </li>
            } @empty {
              <li style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">暂无区域数据</li>
            }
          </ul>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card">
          <div class="card-header">
            <h3>区域布局画布</h3>
            <span style="font-size:12px;color:#5a7a9a;">拖拽绘制区域</span>
          </div>
          <div class="card-body">
            <canvas #zoneCanvas width="700" height="400"
              (mousedown)="onCanvasMouseDown($event)"
              (mousemove)="onCanvasMouseMove($event)"
              (mouseup)="onCanvasMouseUp($event)"></canvas>
          </div>
        </div>

        @if (editingZone) {
          <div class="card">
            <div class="card-header">
              <h3>区域属性</h3>
              <button class="btn btn-success" (click)="saveZone()">保存</button>
            </div>
            <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>名称</label>
                <input class="form-control" [(ngModel)]="editingZone.name" />
              </div>
              <div class="form-group">
                <label>类型</label>
                <select class="form-control" [(ngModel)]="editingZone.type">
                  <option value="cold_storage">冷藏区</option>
                  <option value="corridor">通道</option>
                  <option value="loading">装卸区</option>
                  <option value="charging">充电区</option>
                  <option value="restricted">限制区</option>
                </select>
              </div>
              <div class="form-group">
                <label>X</label>
                <input class="form-control" type="number" [(ngModel)]="editingZone.x" />
              </div>
              <div class="form-group">
                <label>Y</label>
                <input class="form-control" type="number" [(ngModel)]="editingZone.y" />
              </div>
              <div class="form-group">
                <label>宽度</label>
                <input class="form-control" type="number" [(ngModel)]="editingZone.width" />
              </div>
              <div class="form-group">
                <label>高度</label>
                <input class="form-control" type="number" [(ngModel)]="editingZone.height" />
              </div>
              <div class="form-group">
                <label>温度(℃)</label>
                <input class="form-control" type="number" [(ngModel)]="editingZone.temperature" />
              </div>
              <div class="form-group">
                <label>高风险区</label>
                <select class="form-control" [(ngModel)]="editingZone.isHighRisk">
                  <option [ngValue]="false">否</option>
                  <option [ngValue]="true">是</option>
                </select>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class ZoneModelingComponent implements OnInit, AfterViewInit {
  @ViewChild('zoneCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  zones: Zone[] = [];
  obstacles: Obstacle[] = [];
  selectedZone: Zone | null = null;
  editingZone: Zone | null = null;

  private ctx!: CanvasRenderingContext2D;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragCurrent = { x: 0, y: 0 };

  zoneTypeColors = zoneTypeColors;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadZones();
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.drawCanvas();
  }

  private loadZones(): void {
    this.api.getZones().subscribe({
      next: d => {
        this.zones = d;
        this.drawCanvas();
      }
    });
  }

  addZone(): void {
    const newZone: Zone = {
      id: crypto.randomUUID(),
      name: '新区域',
      type: 'cold_storage',
      x: 100, y: 100, width: 120, height: 80,
      color: '#1e90ff',
      obstacles: [],
      isHighRisk: false
    };
    this.api.createZone(newZone).subscribe(created => {
      this.zones.push(created);
      this.editingZone = { ...created };
      this.drawCanvas();
    });
  }

  selectZone(zone: Zone): void {
    this.selectedZone = zone;
  }

  editZone(zone: Zone): void {
    this.editingZone = { ...zone };
    this.selectedZone = zone;
  }

  deleteZone(id: string): void {
    this.api.deleteZone(id).subscribe({
      next: () => {
        this.zones = this.zones.filter(z => z.id !== id);
        if (this.selectedZone?.id === id) this.selectedZone = null;
        if (this.editingZone?.id === id) this.editingZone = null;
        this.drawCanvas();
      }
    });
  }

  saveZone(): void {
    if (!this.editingZone) return;
    this.editingZone.color = this.typeColor(this.editingZone.type);

    const existing = this.zones.find(z => z.id === this.editingZone!.id);
    if (existing) {
      this.api.updateZone(this.editingZone).subscribe(updated => {
        const idx = this.zones.findIndex(z => z.id === updated.id);
        if (idx >= 0) this.zones[idx] = updated;
        this.drawCanvas();
      });
    }
  }

  private typeColor(type: string): string {
    return zoneTypeColors[type] || '#1e90ff';
  }

  onCanvasMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.dragCurrent = { ...this.dragStart };
  }

  onCanvasMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.dragCurrent = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.drawCanvas();
  }

  onCanvasMouseUp(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.dragCurrent = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const x = Math.min(this.dragStart.x, this.dragCurrent.x);
    const y = Math.min(this.dragStart.y, this.dragCurrent.y);
    const w = Math.abs(this.dragCurrent.x - this.dragStart.x);
    const h = Math.abs(this.dragCurrent.y - this.dragStart.y);
    if (w > 20 && h > 20) {
      const newZone: Zone = {
        id: crypto.randomUUID(),
        name: '新区域',
        type: 'cold_storage',
        x, y, width: w, height: h,
        color: '#1e90ff',
        obstacles: [],
        isHighRisk: false
      };
      this.api.createZone(newZone).subscribe(created => {
        this.zones.push(created);
        this.editingZone = { ...created };
        this.drawCanvas();
      });
    }
    this.drawCanvas();
  }

  private drawCanvas(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const canvas = this.canvasRef.nativeElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#081220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1b3a5c';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    for (const z of this.zones) {
      ctx.fillStyle = z.color + '33';
      ctx.fillRect(z.x, z.y, z.width, z.height);
      ctx.strokeStyle = this.selectedZone?.id === z.id ? '#00d4ff' : z.color;
      ctx.lineWidth = this.selectedZone?.id === z.id ? 2 : 1.5;
      ctx.strokeRect(z.x, z.y, z.width, z.height);
      ctx.fillStyle = z.color;
      ctx.font = '12px sans-serif';
      ctx.fillText(z.name, z.x + 6, z.y + 16);
      if (z.temperature !== undefined && z.temperature !== null) {
        ctx.fillStyle = z.color + 'aa';
        ctx.font = '10px sans-serif';
        ctx.fillText(z.temperature + '℃', z.x + 6, z.y + 30);
      }
    }

    if (this.isDragging) {
      const x = Math.min(this.dragStart.x, this.dragCurrent.x);
      const y = Math.min(this.dragStart.y, this.dragCurrent.y);
      const w = Math.abs(this.dragCurrent.x - this.dragStart.x);
      const h = Math.abs(this.dragCurrent.y - this.dragStart.y);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,212,255,0.08)';
      ctx.fillRect(x, y, w, h);
    }
  }
}
