import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Zone, Obstacle } from '../../core/models';

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
                <label>容量</label>
                <input class="form-control" type="number" [(ngModel)]="editingZone.capacity" />
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

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadZones();
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.drawCanvas();
  }

  private loadZones(): void {
    this.api.get<Zone[]>('/zones').subscribe({
      next: d => { this.zones = d; this.drawCanvas(); },
      error: () => {
        this.zones = [
          { id: 'z1', name: '冷藏区A', type: 'cold_storage', x: 40, y: 40, width: 180, height: 140, temperature: -18, color: '#1e90ff' },
          { id: 'z2', name: '主通道', type: 'corridor', x: 240, y: 40, width: 200, height: 140, color: '#2ed573' },
          { id: 'z3', name: '装卸区', type: 'loading', x: 460, y: 40, width: 200, height: 140, color: '#ffa502' },
          { id: 'z4', name: '限制区', type: 'restricted', x: 40, y: 200, width: 300, height: 160, color: '#ff4757' },
          { id: 'z5', name: '充电区', type: 'charging', x: 360, y: 200, width: 300, height: 160, color: '#9b59b6' }
        ];
        this.drawCanvas();
      }
    });
  }

  addZone(): void {
    const newZone: Zone = {
      id: 'z' + Date.now(),
      name: '新区域',
      type: 'cold_storage',
      x: 100, y: 100, width: 120, height: 80,
      color: '#1e90ff'
    };
    this.zones.push(newZone);
    this.editingZone = { ...newZone };
    this.drawCanvas();
  }

  selectZone(zone: Zone): void {
    this.selectedZone = zone;
  }

  editZone(zone: Zone): void {
    this.editingZone = { ...zone };
    this.selectedZone = zone;
  }

  deleteZone(id: string): void {
    this.zones = this.zones.filter(z => z.id !== id);
    if (this.selectedZone?.id === id) this.selectedZone = null;
    if (this.editingZone?.id === id) this.editingZone = null;
    this.api.delete('/zones/' + id).subscribe();
    this.drawCanvas();
  }

  saveZone(): void {
    if (!this.editingZone) return;
    const idx = this.zones.findIndex(z => z.id === this.editingZone!.id);
    if (idx >= 0) {
      this.editingZone.color = this.typeColor(this.editingZone.type);
      this.zones[idx] = { ...this.editingZone };
    }
    this.api.put('/zones/' + this.editingZone.id, this.editingZone).subscribe();
    this.drawCanvas();
  }

  private typeColor(type: string): string {
    const map: Record<string, string> = {
      cold_storage: '#1e90ff',
      corridor: '#2ed573',
      loading: '#ffa502',
      charging: '#9b59b6',
      restricted: '#ff4757'
    };
    return map[type] || '#1e90ff';
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
        id: 'z' + Date.now(),
        name: '新区域',
        type: 'cold_storage',
        x, y, width: w, height: h,
        color: '#1e90ff'
      };
      this.zones.push(newZone);
      this.editingZone = { ...newZone };
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
      if (z.temperature !== undefined) {
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
