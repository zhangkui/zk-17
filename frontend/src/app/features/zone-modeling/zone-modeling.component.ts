import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Zone, Obstacle, ZoneType, ObstacleType, zoneTypeColors, zoneTypeText, obstacleTypeText } from '../../core/models';

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
      <div style="display:flex;flex-direction:column;gap:16px;">
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

        <div class="card">
          <div class="card-header">
            <h3>障碍物列表</h3>
            <button class="btn btn-primary" (click)="addObstacle()" [disabled]="!selectedZone">+ 新增</button>
          </div>
          <div class="card-body" style="padding:0;">
            @if (!selectedZone) {
              <div style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">请先选择区域</div>
            } @else if (obstacles.length === 0) {
              <div style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">暂无障碍物数据</div>
            } @else {
              <div style="max-height:300px;overflow-y:auto;">
                @for (o of obstacles; track o.id) {
                  <div class="obstacle-card" [class.selected]="selectedObstacle?.id === o.id" (click)="selectObstacle(o)">
                    <div class="obstacle-header">
                      <span class="obstacle-name">{{ o.name }}</span>
                      <span class="obstacle-type" [style.borderColor]="obstacleTypeColors[o.type]">{{ obstacleTypeText(o.type) }}</span>
                    </div>
                    <div class="obstacle-info">
                      <span>位置: ({{ o.x }}, {{ o.y }})</span>
                      <span>尺寸: {{ o.width }}×{{ o.height }}</span>
                    </div>
                    <div class="obstacle-actions">
                      <button class="btn btn-outline" style="padding:2px 8px;font-size:11px;" (click)="editObstacle(o); $event.stopPropagation()">编辑</button>
                      <button class="btn btn-danger" style="padding:2px 8px;font-size:11px;margin-left:4px;" (click)="deleteObstacle(o.id); $event.stopPropagation()">删除</button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
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
              <div style="display:flex;gap:8px;">
                @if (editingObstacle) {
                  <button class="btn btn-secondary" (click)="cancelEditObstacle()">取消障碍物编辑</button>
                }
                <button class="btn btn-success" (click)="saveZone()">保存</button>
              </div>
            </div>
            <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>名称</label>
                <input class="form-control" [(ngModel)]="editingZone.name" />
              </div>
              <div class="form-group">
                <label>类型</label>
                <select class="form-control" [(ngModel)]="editingZone.type">
                  @for (zt of zoneTypes; track zt) {
                    <option [ngValue]="zt">{{ zoneTypeText(zt) }}</option>
                  }
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

        @if (editingObstacle) {
          <div class="card">
            <div class="card-header">
              <h3>障碍物属性</h3>
              <button class="btn btn-success" (click)="saveObstacle()">保存</button>
            </div>
            <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>名称</label>
                <input class="form-control" [(ngModel)]="editingObstacle.name" />
              </div>
              <div class="form-group">
                <label>类型</label>
                <select class="form-control" [(ngModel)]="editingObstacle.type">
                  @for (ot of obstacleTypes; track ot) {
                    <option [ngValue]="ot">{{ obstacleTypeText(ot) }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>位置 X</label>
                <input class="form-control" type="number" [(ngModel)]="editingObstacle.x" />
              </div>
              <div class="form-group">
                <label>位置 Y</label>
                <input class="form-control" type="number" [(ngModel)]="editingObstacle.y" />
              </div>
              <div class="form-group">
                <label>宽度</label>
                <input class="form-control" type="number" [(ngModel)]="editingObstacle.width" />
              </div>
              <div class="form-group">
                <label>高度</label>
                <input class="form-control" type="number" [(ngModel)]="editingObstacle.height" />
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .obstacle-card {
      padding: 12px;
      border-bottom: 1px solid #1b3a5c;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .obstacle-card:hover {
      background-color: rgba(27, 58, 92, 0.3);
    }
    .obstacle-card.selected {
      background-color: rgba(0, 212, 255, 0.15);
      border-left: 3px solid #00d4ff;
    }
    .obstacle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .obstacle-name {
      font-weight: 500;
      color: #e0f0ff;
      font-size: 13px;
    }
    .obstacle-type {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid;
      color: #a0c0e0;
    }
    .obstacle-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11px;
      color: #5a7a9a;
      margin-bottom: 8px;
    }
    .obstacle-actions {
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class ZoneModelingComponent implements OnInit, AfterViewInit {
  @ViewChild('zoneCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  zones: Zone[] = [];
  obstacles: Obstacle[] = [];
  selectedZone: Zone | null = null;
  editingZone: Zone | null = null;
  selectedObstacle: Obstacle | null = null;
  editingObstacle: Obstacle | null = null;

  private ctx!: CanvasRenderingContext2D;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragCurrent = { x: 0, y: 0 };

  zoneTypeColors = zoneTypeColors;
  zoneTypeText = zoneTypeText;
  obstacleTypeText = obstacleTypeText;

  obstacleTypeColors: Record<ObstacleType, string> = {
    Shelf: '#8B4513',
    Column: '#708090',
    Wall: '#696969',
    Machine: '#4682B4'
  };

  obstacleTypes: ObstacleType[] = ['Shelf', 'Column', 'Wall', 'Machine'];
  zoneTypes: ZoneType[] = ['ColdStorage', 'Corridor', 'Loading', 'Charging', 'Restricted'];

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
      type: 'ColdStorage',
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
    this.obstacles = zone.obstacles || [];
    this.selectedObstacle = null;
    this.editingObstacle = null;
    this.drawCanvas();
  }

  selectObstacle(obstacle: Obstacle): void {
    this.selectedObstacle = obstacle;
    this.drawCanvas();
  }

  addObstacle(): void {
    if (!this.selectedZone) return;
    const newObstacle: Obstacle = {
      id: crypto.randomUUID(),
      name: '新障碍物',
      type: 'Shelf',
      x: this.selectedZone.x + 20,
      y: this.selectedZone.y + 20,
      width: 40,
      height: 40
    };
    this.editingObstacle = { ...newObstacle };
  }

  editObstacle(obstacle: Obstacle): void {
    this.editingObstacle = { ...obstacle };
    this.selectedObstacle = obstacle;
  }

  cancelEditObstacle(): void {
    this.editingObstacle = null;
  }

  saveObstacle(): void {
    if (!this.editingObstacle || !this.selectedZone) return;

    const obstacleData = {
      name: this.editingObstacle.name,
      positionX: this.editingObstacle.x,
      positionY: this.editingObstacle.y,
      width: this.editingObstacle.width,
      height: this.editingObstacle.height,
      type: this.editingObstacle.type
    };

    const existing = this.obstacles.find(o => o.id === this.editingObstacle!.id);
    if (existing) {
      this.api.updateObstacle(this.editingObstacle.id, obstacleData).subscribe({
        next: (updated: any) => {
          const converted = this.convertObstacleDto(updated);
          const idx = this.obstacles.findIndex(o => o.id === converted.id);
          if (idx >= 0) this.obstacles[idx] = converted;
          this.updateZoneObstacles();
          this.editingObstacle = null;
          this.selectedObstacle = converted;
          this.drawCanvas();
        }
      });
    } else {
      this.api.createObstacle(this.selectedZone.id, obstacleData).subscribe({
        next: (created: any) => {
          const converted = this.convertObstacleDto(created);
          this.obstacles.push(converted);
          this.updateZoneObstacles();
          this.editingObstacle = null;
          this.selectedObstacle = converted;
          this.drawCanvas();
        }
      });
    }
  }

  deleteObstacle(id: string): void {
    this.api.deleteObstacle(id).subscribe({
      next: () => {
        this.obstacles = this.obstacles.filter(o => o.id !== id);
        this.updateZoneObstacles();
        if (this.selectedObstacle?.id === id) this.selectedObstacle = null;
        if (this.editingObstacle?.id === id) this.editingObstacle = null;
        this.drawCanvas();
      }
    });
  }

  private updateZoneObstacles(): void {
    if (this.selectedZone) {
      this.selectedZone.obstacles = [...this.obstacles];
      const zoneIdx = this.zones.findIndex(z => z.id === this.selectedZone!.id);
      if (zoneIdx >= 0) {
        this.zones[zoneIdx] = { ...this.selectedZone };
      }
    }
  }

  private convertObstacleDto(dto: any): Obstacle {
    return {
      id: dto.id,
      name: dto.name,
      x: dto.positionX || 0,
      y: dto.positionY || 0,
      width: dto.width || 10,
      height: dto.height || 10,
      type: this.parseObstacleType(dto.type)
    };
  }

  private parseObstacleType(value: any): ObstacleType {
    const validValues: ObstacleType[] = ['Shelf', 'Column', 'Wall', 'Machine'];
    if (typeof value === 'string' && validValues.includes(value as ObstacleType)) {
      return value as ObstacleType;
    }
    return 'Shelf';
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

  private typeColor(type: ZoneType): string {
    return zoneTypeColors[type] || '#1e90ff';
  }

  onCanvasMouseDown(e: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedObstacle = this.findObstacleAt(x, y);
    if (clickedObstacle) {
      this.selectObstacle(clickedObstacle);
      const zone = this.zones.find(z => z.obstacles?.some(o => o.id === clickedObstacle.id));
      if (zone && this.selectedZone?.id !== zone.id) {
        this.selectZone(zone);
      }
      return;
    }

    const clickedZone = this.findZoneAt(x, y);
    if (clickedZone) {
      this.selectZone(clickedZone);
      this.selectedObstacle = null;
      this.drawCanvas();
      return;
    }

    this.selectedZone = null;
    this.selectedObstacle = null;
    this.drawCanvas();

    this.isDragging = true;
    this.dragStart = { x, y };
    this.dragCurrent = { ...this.dragStart };
  }

  private findObstacleAt(x: number, y: number): Obstacle | null {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      const obstacles = zone.obstacles || [];
      for (let j = obstacles.length - 1; j >= 0; j--) {
        const o = obstacles[j];
        if (x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height) {
          return o;
        }
      }
    }
    return null;
  }

  private findZoneAt(x: number, y: number): Zone | null {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height) {
        return z;
      }
    }
    return null;
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
        type: 'ColdStorage',
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

    for (const z of this.zones) {
      const zoneObstacles = z.obstacles || [];
      for (const o of zoneObstacles) {
        const color = this.obstacleTypeColors[o.type];
        ctx.fillStyle = color + '44';
        ctx.fillRect(o.x, o.y, o.width, o.height);
        ctx.strokeStyle = this.selectedObstacle?.id === o.id ? '#00d4ff' : color;
        ctx.lineWidth = this.selectedObstacle?.id === o.id ? 2.5 : 1.5;
        ctx.strokeRect(o.x, o.y, o.width, o.height);
        ctx.fillStyle = color;
        ctx.font = '10px sans-serif';
        ctx.fillText(o.name, o.x + 4, o.y + 14);
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
