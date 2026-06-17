import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Zone, Obstacle, ZoneType, ObstacleType, zoneTypeColors, zoneTypeText, obstacleTypeText } from '../../core/models';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

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
            <button class="btn btn-primary" (click)="addObstacle()" [disabled]="!selectedZone || isSavingObstacle">
              @if (isSavingObstacle) { 保存中... } @else { + 新增 }
            </button>
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
                      <span>相对位置: ({{ o.relativeX }}, {{ o.relativeY }})</span>
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
            <span style="font-size:12px;color:#5a7a9a;">拖动区域/障碍物可移动位置，空白处拖动绘制新区域</span>
          </div>
          <div class="card-body">
            <canvas #zoneCanvas width="700" height="400"
              (mousedown)="onCanvasMouseDown($event)"
              (mousemove)="onCanvasMouseMove($event)"
              (mouseup)="onCanvasMouseUp($event)"
              (mouseleave)="onCanvasMouseLeave($event)"></canvas>
          </div>
        </div>

        @if (editingZone) {
        <div class="card">
          <div class="card-header">
            <h3>区域属性</h3>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary" (click)="cancelEditZone()">取消</button>
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
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary" (click)="cancelEditObstacle()">取消</button>
              <button class="btn btn-success" (click)="saveObstacle()">保存</button>
            </div>
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
              <label>相对位置 X</label>
              <input class="form-control" type="number" [(ngModel)]="editingObstacle.relativeX" />
            </div>
            <div class="form-group">
              <label>相对位置 Y</label>
              <input class="form-control" type="number" [(ngModel)]="editingObstacle.relativeY" />
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

    @if (toasts.length > 0) {
      <div class="toast-container">
        @for (t of toasts; track t.id) {
          <div class="toast" [class.toast-success]="t.type === 'success'" [class.toast-error]="t.type === 'error'" [class.toast-info]="t.type === 'info'">
            <span class="toast-icon">
              @if (t.type === 'success') { ✅ }
              @if (t.type === 'error') { ❌ }
              @if (t.type === 'info') { ℹ️ }
            </span>
            <span>{{ t.message }}</span>
            <button class="toast-close" (click)="removeToast(t.id)">×</button>
          </div>
        }
      </div>
    }

    @if (confirmDialog) {
      <div class="modal-overlay" (click)="cancelConfirm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ confirmDialog.title }}</h3>
          </div>
          <div class="modal-body">
            <p>{{ confirmDialog.message }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cancelConfirm()">取消</button>
            <button class="btn" [class.btn-danger]="confirmDialog.danger" [class.btn-primary]="!confirmDialog.danger" (click)="executeConfirm()">
              {{ confirmDialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; position: relative; }
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

    .toast-container {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 20px;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      min-width: 320px;
      font-size: 14px;
      animation: slideDown 0.3s ease;
      border: 1px solid;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .toast-success {
      background: #0d2f1f;
      border-color: #00ff8844;
      color: #88ffcc;
    }
    .toast-error {
      background: #2f0d0d;
      border-color: #ff444444;
      color: #ffaaaa;
    }
    .toast-info {
      background: #0d1f2f;
      border-color: #0088ff44;
      color: #aaccff;
    }
    .toast-icon {
      font-size: 18px;
    }
    .toast-close {
      margin-left: auto;
      background: none;
      border: none;
      color: inherit;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.6;
      padding: 0 4px;
    }
    .toast-close:hover { opacity: 1; }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal {
      background: #0a1628;
      border: 1px solid #1b3a5c;
      border-radius: 12px;
      width: 440px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: scaleIn 0.25s ease;
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      padding: 18px 22px;
      border-bottom: 1px solid #1b3a5c;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 16px;
      color: #e0f0ff;
    }
    .modal-body {
      padding: 20px 22px;
    }
    .modal-body p {
      margin: 0;
      color: #a0c0e0;
      line-height: 1.6;
      font-size: 14px;
    }
    .modal-footer {
      padding: 16px 22px;
      border-top: 1px solid #1b3a5c;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
  `]
})
export class ZoneModelingComponent implements OnInit, AfterViewInit {
  @ViewChild('zoneCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  zones: Zone[] = [];
  obstacles: ObstacleEx[] = [];
  selectedZone: Zone | null = null;
  editingZone: Zone | null = null;
  selectedObstacle: ObstacleEx | null = null;
  editingObstacle: ObstacleEx | null = null;
  isNewZone = false;
  isSavingObstacle = false;

  toasts: ToastMessage[] = [];
  confirmDialog: {
    title: string;
    message: string;
    confirmText: string;
    danger: boolean;
    onConfirm: () => void;
  } | null = null;

  private ctx!: CanvasRenderingContext2D;

  private dragMode: 'none' | 'createZone' | 'moveZone' | 'moveObstacle' = 'none';
  private dragStart = { x: 0, y: 0 };
  private dragCurrent = { x: 0, y: 0 };
  private dragOffset = { x: 0, y: 0 };
  private dragTargetZone: Zone | null = null;
  private dragTargetObstacle: ObstacleEx | null = null;
  private hasMoved = false;

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

  private toastIdCounter = 0;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadZones();
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.drawCanvas();
  }

  showToast(type: 'success' | 'error' | 'info', message: string): void {
    const id = ++this.toastIdCounter;
    this.toasts.push({ id, type, message });
    setTimeout(() => this.removeToast(id), 3500);
  }

  removeToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  showConfirm(options: { title: string; message: string; confirmText: string; danger?: boolean; onConfirm: () => void }): void {
    this.confirmDialog = {
      ...options,
      danger: options.danger ?? false
    };
  }

  cancelConfirm(): void {
    this.confirmDialog = null;
  }

  executeConfirm(): void {
    if (this.confirmDialog) {
      this.confirmDialog.onConfirm();
      this.confirmDialog = null;
    }
  }

  private getAbsoluteX(zone: Zone, relativeX: number): number {
    return zone.x + relativeX;
  }

  private getAbsoluteY(zone: Zone, relativeY: number): number {
    return zone.y + relativeY;
  }

  private getRelativeX(zone: Zone, absoluteX: number): number {
    return absoluteX - zone.x;
  }

  private getRelativeY(zone: Zone, absoluteY: number): number {
    return absoluteY - zone.y;
  }

  private loadZones(): void {
    this.api.getZones().subscribe({
      next: d => {
        this.zones = d.map(z => ({
          ...z,
          obstacles: (z.obstacles || []).map(o => this.convertObstacleDto(o, z))
        }));
        this.drawCanvas();
      },
      error: err => {
        console.error('加载区域失败:', err);
        this.showToast('error', '加载区域数据失败');
      }
    });
  }

  private convertObstacleDto(dto: any, zone: Zone): ObstacleEx {
    const relativeX = dto.positionX || 0;
    const relativeY = dto.positionY || 0;
    return {
      id: dto.id,
      name: dto.name,
      x: this.getAbsoluteX(zone, relativeX),
      y: this.getAbsoluteY(zone, relativeY),
      relativeX: relativeX,
      relativeY: relativeY,
      width: dto.width || 10,
      height: dto.height || 10,
      type: this.parseObstacleType(dto.type)
    };
  }

  addZone(): void {
    const canvas = this.canvasRef.nativeElement;
    const newZone: Zone = {
      id: crypto.randomUUID(),
      name: '新区域',
      type: 'ColdStorage',
      x: Math.floor(canvas.width / 2 - 60),
      y: Math.floor(canvas.height / 2 - 40),
      width: 120, height: 80,
      color: '#1e90ff',
      obstacles: [],
      isHighRisk: false
    };
    this.api.createZone(newZone).subscribe({
      next: created => {
        this.zones.push(created);
        this.selectedZone = created;
        this.editingZone = { ...created };
        this.isNewZone = true;
        this.obstacles = [];
        this.selectedObstacle = null;
        this.editingObstacle = null;
        this.drawCanvas();
        this.showToast('success', '区域创建成功');
      },
      error: err => {
        console.error('创建区域失败:', err);
        this.showToast('error', '创建区域失败');
      }
    });
  }

  selectZone(zone: Zone): void {
    this.selectedZone = zone;
    this.obstacles = (zone.obstacles || []).map(o => ({ ...o })) as ObstacleEx[];
    this.selectedObstacle = null;
    this.editingObstacle = null;
    this.drawCanvas();
  }

  selectObstacle(obstacle: ObstacleEx): void {
    this.selectedObstacle = obstacle;
    this.drawCanvas();
  }

  editZone(zone: Zone): void {
    this.editingZone = { ...zone };
    this.selectedZone = zone;
    this.isNewZone = false;
  }

  cancelEditZone(): void {
    this.editingZone = null;
    this.isNewZone = false;
  }

  deleteZone(id: string): void {
    const zone = this.zones.find(z => z.id === id);
    if (!zone) return;

    this.showConfirm({
      title: '删除区域',
      message: `确定要删除区域「${zone.name}」吗？该区域下的所有障碍物也将被删除，此操作无法撤销。`,
      confirmText: '删除',
      danger: true,
      onConfirm: () => {
        this.api.deleteZone(id).subscribe({
          next: () => {
            this.zones = this.zones.filter(z => z.id !== id);
            if (this.selectedZone?.id === id) this.selectedZone = null;
            if (this.editingZone?.id === id) this.editingZone = null;
            this.obstacles = [];
            this.selectedObstacle = null;
            this.editingObstacle = null;
            this.drawCanvas();
            this.showToast('success', `区域「${zone.name}」删除成功`);
          },
          error: err => {
            console.error('删除区域失败:', err);
            this.showToast('error', '删除区域失败');
          }
        });
      }
    });
  }

  saveZone(): void {
    if (!this.editingZone) return;
    this.editingZone.color = this.typeColor(this.editingZone.type);

    this.api.updateZone(this.editingZone).subscribe({
      next: updated => {
        const idx = this.zones.findIndex(z => z.id === updated.id);
        if (idx >= 0) {
          const updatedWithObs = {
            ...updated,
            obstacles: this.zones[idx].obstacles || []
          };
          this.zones[idx] = updatedWithObs;
        }
        if (this.selectedZone?.id === updated.id) {
          this.selectedZone = {
            ...updated,
            obstacles: this.selectedZone.obstacles || []
          };
        }
        this.editingZone = null;
        this.isNewZone = false;
        this.drawCanvas();
        this.showToast('success', '区域保存成功');
      },
      error: err => {
        console.error('保存区域失败:', err);
        this.showToast('error', '保存区域失败');
      }
    });
  }

  private typeColor(type: ZoneType): string {
    return zoneTypeColors[type] || '#1e90ff';
  }

  addObstacle(): void {
    if (!this.selectedZone) return;

    this.isSavingObstacle = true;

    const obstacleWidth = 40;
    const obstacleHeight = 40;

    const existingRelativePositions = this.obstacles.map(o => ({
      x: o.relativeX,
      y: o.relativeY,
      w: o.width,
      h: o.height
    }));

    const overlaps = (rx: number, ry: number) => {
      return existingRelativePositions.some(p =>
        rx < p.x + p.w && rx + obstacleWidth > p.x &&
        ry < p.y + p.h && ry + obstacleHeight > p.y
      );
    };

    const zoneMaxX = this.selectedZone.width - obstacleWidth - 4;
    const zoneMaxY = this.selectedZone.height - obstacleHeight - 4;

    let relX = 20;
    let relY = 20;
    let found = false;

    outer:
    for (let dy = 20; dy < this.selectedZone.height; dy += 15) {
      for (let dx = 20; dx < this.selectedZone.width; dx += 15) {
        if (dx > zoneMaxX || dy > zoneMaxY) continue;
        if (!overlaps(dx, dy)) {
          relX = dx;
          relY = dy;
          found = true;
          break outer;
        }
      }
    }

    if (!found) {
      relX = Math.min(relX, zoneMaxX);
      relY = Math.min(relY, zoneMaxY);
    }

    const obstacleData = {
      name: '新障碍物',
      positionX: relX,
      positionY: relY,
      width: obstacleWidth,
      height: obstacleHeight,
      type: 'Shelf' as ObstacleType
    };

    this.api.createObstacle(this.selectedZone.id, obstacleData).subscribe({
      next: (created: any) => {
        const converted = this.convertObstacleDto(created, this.selectedZone!);
        this.obstacles.push(converted);
        this.editingObstacle = { ...converted };
        this.selectedObstacle = { ...converted };
        this.updateZoneObstacles();
        this.drawCanvas();
        this.isSavingObstacle = false;
        this.showToast('success', '障碍物创建成功');
      },
      error: err => {
        console.error('创建障碍物失败:', err);
        this.showToast('error', '创建障碍物失败');
        this.isSavingObstacle = false;
      }
    });
  }

  editObstacle(obstacle: ObstacleEx): void {
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
      positionX: this.editingObstacle.relativeX,
      positionY: this.editingObstacle.relativeY,
      width: this.editingObstacle.width,
      height: this.editingObstacle.height,
      type: this.editingObstacle.type
    };

    this.api.updateObstacle(this.editingObstacle.id, obstacleData).subscribe({
      next: (updated: any) => {
        const converted = this.convertObstacleDto(updated, this.selectedZone!);
        const idx = this.obstacles.findIndex(o => o.id === converted.id);
        if (idx >= 0) this.obstacles[idx] = converted;
        this.updateZoneObstacles();
        this.editingObstacle = null;
        this.selectedObstacle = converted;
        this.drawCanvas();
        this.showToast('success', '障碍物更新成功');
      },
      error: err => {
        console.error('更新障碍物失败:', err);
        this.showToast('error', '更新障碍物失败');
      }
    });
  }

  deleteObstacle(id: string): void {
    const obstacle = this.obstacles.find(o => o.id === id);
    if (!obstacle) return;

    this.showConfirm({
      title: '删除障碍物',
      message: `确定要删除障碍物「${obstacle.name}」吗？此操作无法撤销。`,
      confirmText: '删除',
      danger: true,
      onConfirm: () => {
        this.api.deleteObstacle(id).subscribe({
          next: () => {
            this.obstacles = this.obstacles.filter(o => o.id !== id);
            this.updateZoneObstacles();
            if (this.selectedObstacle?.id === id) this.selectedObstacle = null;
            if (this.editingObstacle?.id === id) this.editingObstacle = null;
            this.drawCanvas();
            this.showToast('success', `障碍物「${obstacle.name}」删除成功`);
          },
          error: err => {
            console.error('删除障碍物失败:', err);
            this.showToast('error', '删除障碍物失败');
          }
        });
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

  private parseObstacleType(value: any): ObstacleType {
    const validValues: ObstacleType[] = ['Shelf', 'Column', 'Wall', 'Machine'];
    if (typeof value === 'string' && validValues.includes(value as ObstacleType)) {
      return value as ObstacleType;
    }
    return 'Shelf';
  }

  onCanvasMouseDown(e: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.dragStart = { x, y };
    this.dragCurrent = { x, y };
    this.hasMoved = false;

    const clickedObstacle = this.findObstacleAt(x, y);
    if (clickedObstacle) {
      this.selectObstacle(clickedObstacle);
      const zone = this.zones.find(z => z.obstacles?.some((o: any) => o.id === clickedObstacle.id));
      if (zone && this.selectedZone?.id !== zone.id) {
        this.selectZone(zone);
      }
      this.dragMode = 'moveObstacle';
      this.dragTargetObstacle = clickedObstacle;
      this.dragOffset = { x: x - clickedObstacle.x, y: y - clickedObstacle.y };
      return;
    }

    const clickedZone = this.findZoneAt(x, y);
    if (clickedZone) {
      this.selectZone(clickedZone);
      this.selectedObstacle = null;
      this.dragMode = 'moveZone';
      this.dragTargetZone = clickedZone;
      this.dragOffset = { x: x - clickedZone.x, y: y - clickedZone.y };
      this.drawCanvas();
      return;
    }

    this.selectedZone = null;
    this.selectedObstacle = null;
    this.drawCanvas();
    this.dragMode = 'createZone';
  }

  private findObstacleAt(x: number, y: number): ObstacleEx | null {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      const obs = (zone.obstacles as ObstacleEx[]) || [];
      for (let j = obs.length - 1; j >= 0; j--) {
        const o = obs[j];
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
    if (this.dragMode === 'none') return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.dragCurrent = { x, y };

    const dx = x - this.dragStart.x;
    const dy = y - this.dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.hasMoved = true;
    }

    if (this.dragMode === 'moveZone' && this.dragTargetZone) {
      const canvas = this.canvasRef.nativeElement;
      let newX = Math.max(0, Math.min(canvas.width - this.dragTargetZone.width, x - this.dragOffset.x));
      let newY = Math.max(0, Math.min(canvas.height - this.dragTargetZone.height, y - this.dragOffset.y));

      const deltaX = newX - this.dragTargetZone.x;
      const deltaY = newY - this.dragTargetZone.y;

      this.dragTargetZone.x = newX;
      this.dragTargetZone.y = newY;

      const zoneObs = (this.dragTargetZone.obstacles as ObstacleEx[]) || [];
      for (const o of zoneObs) {
        o.x = o.x + deltaX;
        o.y = o.y + deltaY;
      }

      const idx = this.zones.findIndex(z => z.id === this.dragTargetZone!.id);
      if (idx >= 0) this.zones[idx] = { ...this.dragTargetZone };
      if (this.selectedZone?.id === this.dragTargetZone.id) this.selectedZone = { ...this.dragTargetZone };
      const editZone = this.editingZone;
      if (editZone != null && editZone.id === this.dragTargetZone.id) {
        editZone.x = newX;
        editZone.y = newY;
      }

      if (this.selectedZone?.id === this.dragTargetZone.id) {
        this.obstacles = [...zoneObs];
      }

      this.drawCanvas();
      return;
    }

    if (this.dragMode === 'moveObstacle' && this.dragTargetObstacle && this.selectedZone) {
      const canvas = this.canvasRef.nativeElement;
      const zone = this.selectedZone;
      let newAbsX = x - this.dragOffset.x;
      let newAbsY = y - this.dragOffset.y;

      newAbsX = Math.max(zone.x + 4, Math.min(zone.x + zone.width - this.dragTargetObstacle.width - 4, newAbsX));
      newAbsX = Math.max(0, Math.min(canvas.width - this.dragTargetObstacle.width, newAbsX));
      newAbsY = Math.max(zone.y + 4, Math.min(zone.y + zone.height - this.dragTargetObstacle.height - 4, newAbsY));
      newAbsY = Math.max(0, Math.min(canvas.height - this.dragTargetObstacle.height, newAbsY));

      const newRelX = this.getRelativeX(zone, newAbsX);
      const newRelY = this.getRelativeY(zone, newAbsY);

      this.dragTargetObstacle.x = newAbsX;
      this.dragTargetObstacle.y = newAbsY;
      this.dragTargetObstacle.relativeX = newRelX;
      this.dragTargetObstacle.relativeY = newRelY;

      const zoneIdx = this.zones.findIndex(z => z.id === zone.id);
      if (zoneIdx >= 0) {
        const zObs = (this.zones[zoneIdx].obstacles as ObstacleEx[]) || [];
        const oIdx = zObs.findIndex(o => o.id === this.dragTargetObstacle!.id);
        if (oIdx >= 0) {
          zObs[oIdx] = { ...this.dragTargetObstacle };
          this.zones[zoneIdx] = { ...this.zones[zoneIdx], obstacles: [...zObs] };
        }
      }

      if (this.selectedZone) {
        this.selectedZone.obstacles = this.zones[zoneIdx]?.obstacles || this.selectedZone.obstacles;
      }

      const localIdx = this.obstacles.findIndex(o => o.id === this.dragTargetObstacle!.id);
      if (localIdx >= 0) this.obstacles[localIdx] = { ...this.dragTargetObstacle };

      if (this.selectedObstacle?.id === this.dragTargetObstacle.id) {
        this.selectedObstacle = { ...this.dragTargetObstacle };
      }
      if (this.editingObstacle?.id === this.dragTargetObstacle.id) {
        this.editingObstacle.relativeX = newRelX;
        this.editingObstacle.relativeY = newRelY;
        this.editingObstacle.x = newAbsX;
        this.editingObstacle.y = newAbsY;
      }

      this.drawCanvas();
      return;
    }

    if (this.dragMode === 'createZone') {
      this.drawCanvas();
    }
  }

  onCanvasMouseUp(e: MouseEvent): void {
    if (this.dragMode === 'none') return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.dragMode === 'moveZone' && this.dragTargetZone && this.hasMoved) {
      const zoneData = { ...this.dragTargetZone };
      this.api.updateZone(zoneData).subscribe({
        next: (updated: any) => {
          const idx = this.zones.findIndex(z => z.id === updated.id);
          if (idx >= 0) {
            this.zones[idx] = {
              ...updated,
              obstacles: this.zones[idx].obstacles || []
            };
          }
          const selZone = this.selectedZone;
          if (selZone?.id === updated.id) {
            this.selectedZone = {
              ...updated,
              obstacles: selZone!.obstacles || []
            };
          }
          const editZone = this.editingZone;
          if (editZone != null && editZone.id === updated.id) {
            editZone.x = updated.x;
            editZone.y = updated.y;
          }
          this.drawCanvas();
          this.showToast('success', '区域位置已更新');
        },
        error: err => {
          console.error('更新区域位置失败:', err);
          this.showToast('error', '更新区域位置失败');
        }
      });
    } else if (this.dragMode === 'moveObstacle' && this.dragTargetObstacle && this.hasMoved) {
      const obstacleData = {
        name: this.dragTargetObstacle.name,
        positionX: this.dragTargetObstacle.relativeX,
        positionY: this.dragTargetObstacle.relativeY,
        width: this.dragTargetObstacle.width,
        height: this.dragTargetObstacle.height,
        type: this.dragTargetObstacle.type
      };
      this.api.updateObstacle(this.dragTargetObstacle.id, obstacleData).subscribe({
        next: (updated: any) => {
          const zone = this.selectedZone;
          if (!zone) return;
          const converted = this.convertObstacleDto(updated, zone);
          const idx = this.obstacles.findIndex(o => o.id === converted.id);
          if (idx >= 0) this.obstacles[idx] = converted;
          this.updateZoneObstacles();
          if (this.selectedObstacle?.id === converted.id) this.selectedObstacle = converted;
          if (this.editingObstacle?.id === converted.id) {
            this.editingObstacle.relativeX = converted.relativeX;
            this.editingObstacle.relativeY = converted.relativeY;
            this.editingObstacle.x = converted.x;
            this.editingObstacle.y = converted.y;
          }
          this.drawCanvas();
          this.showToast('success', '障碍物位置已更新');
        },
        error: err => {
          console.error('更新障碍物位置失败:', err);
          this.showToast('error', '更新障碍物位置失败');
        }
      });
    } else if (this.dragMode === 'createZone' && this.hasMoved) {
      const minX = Math.min(this.dragStart.x, this.dragCurrent.x);
      const minY = Math.min(this.dragStart.y, this.dragCurrent.y);
      const w = Math.abs(this.dragCurrent.x - this.dragStart.x);
      const h = Math.abs(this.dragCurrent.y - this.dragStart.y);
      if (w > 20 && h > 20) {
        const newZone: Zone = {
          id: crypto.randomUUID(),
          name: '新区域',
          type: 'ColdStorage',
          x: minX, y: minY, width: w, height: h,
          color: '#1e90ff',
          obstacles: [],
          isHighRisk: false
        };
        this.api.createZone(newZone).subscribe({
          next: created => {
            this.zones.push(created);
            this.selectedZone = created;
            this.editingZone = { ...created };
            this.isNewZone = true;
            this.obstacles = [];
            this.drawCanvas();
            this.showToast('success', '区域创建成功');
          },
          error: err => {
            console.error('创建区域失败:', err);
            this.showToast('error', '创建区域失败');
          }
        });
      }
    }

    this.dragMode = 'none';
    this.dragTargetZone = null;
    this.dragTargetObstacle = null;
    this.hasMoved = false;
    this.drawCanvas();
  }

  onCanvasMouseLeave(e: MouseEvent): void {
    if (this.dragMode !== 'none') {
      this.onCanvasMouseUp(e);
    }
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
      ctx.lineWidth = this.selectedZone?.id === z.id ? 2.5 : 1.5;
      ctx.strokeRect(z.x, z.y, z.width, z.height);
      ctx.fillStyle = z.color;
      ctx.font = '12px sans-serif';
      ctx.fillText(z.name, z.x + 6, z.y + 16);
      if (z.temperature !== undefined && z.temperature !== null) {
        ctx.fillStyle = z.color + 'aa';
        ctx.font = '10px sans-serif';
        ctx.fillText(z.temperature + '℃', z.x + 6, z.y + 30);
      }
      if (this.dragMode === 'moveZone' && this.dragTargetZone?.id === z.id) {
        ctx.setLineDash([4, 2]);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(z.x - 2, z.y - 2, z.width + 4, z.height + 4);
        ctx.setLineDash([]);
      }
    }

    for (const z of this.zones) {
      const zoneObstacles = (z.obstacles as ObstacleEx[]) || [];
      for (const o of zoneObstacles) {
        const absX = o.x;
        const absY = o.y;
        const color = this.obstacleTypeColors[o.type];
        ctx.fillStyle = color + '55';
        ctx.fillRect(absX, absY, o.width, o.height);
        ctx.strokeStyle = this.selectedObstacle?.id === o.id ? '#00d4ff' : color;
        ctx.lineWidth = this.selectedObstacle?.id === o.id ? 3 : 1.5;
        ctx.strokeRect(absX, absY, o.width, o.height);
        ctx.fillStyle = color;
        ctx.font = '10px sans-serif';
        ctx.fillText(o.name, absX + 4, absY + 14);
        if (this.dragMode === 'moveObstacle' && this.dragTargetObstacle?.id === o.id) {
          ctx.setLineDash([3, 2]);
          ctx.strokeStyle = '#ffff88';
          ctx.lineWidth = 1;
          ctx.strokeRect(absX - 2, absY - 2, o.width + 4, o.height + 4);
          ctx.setLineDash([]);
        }
      }
    }

    if (this.dragMode === 'createZone' && this.hasMoved) {
      const minX = Math.min(this.dragStart.x, this.dragCurrent.x);
      const minY = Math.min(this.dragStart.y, this.dragCurrent.y);
      const w = Math.abs(this.dragCurrent.x - this.dragStart.x);
      const h = Math.abs(this.dragCurrent.y - this.dragStart.y);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(minX, minY, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,212,255,0.1)';
      ctx.fillRect(minX, minY, w, h);
    }
  }
}

interface ObstacleEx extends Obstacle {
  relativeX: number;
  relativeY: number;
}
