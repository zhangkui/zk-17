import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  Forklift,
  Team,
  ForkliftStatus,
  ShiftType,
  forkliftStatusText,
  shiftText,
  zoneTypeColors
} from '../../core/models';

@Component({
  selector: 'app-forklift-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>叉车管理</h2>
      <p>叉车基础资料管理与状态监控</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>叉车列表</h3>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" (click)="openAddModal()">+ 新增叉车</button>
        </div>
      </div>
      <div class="card-body">
        <div class="filter-bar">
          <div class="form-group" style="margin-bottom:0;">
            <label>按状态筛选</label>
            <select class="form-control" [(ngModel)]="filterStatus" (change)="applyFilters()">
              <option [ngValue]="null">全部</option>
              <option value="Online">在线</option>
              <option value="Offline">离线</option>
              <option value="Charging">充电中</option>
              <option value="Maintenance">维护中</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>按班组筛选</label>
            <select class="form-control" [(ngModel)]="filterTeamId" (change)="applyFilters()">
              <option [ngValue]="null">全部</option>
              @for (t of teams; track t.id) {
                <option [value]="t.id">{{ t.name }} ({{ shiftText(t.shift) }})</option>
              }
            </select>
          </div>
          <button class="btn btn-outline" (click)="resetFilters()">重置筛选</button>
        </div>

        <div class="table-container" style="margin-top:16px;">
          <table>
            <thead>
              <tr>
                <th>编号</th>
                <th>型号</th>
                <th>状态</th>
                <th>所属班组</th>
                <th>当前位置</th>
                <th>盲区半径</th>
                <th>关联事件</th>
                <th>最后更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              @for (f of filteredForklifts; track f.id) {
                <tr>
                  <td style="font-weight:500;color:#e8f0fe;">{{ f.code }}</td>
                  <td>{{ f.model || '-' }}</td>
                  <td>
                    <span class="status-badge" [class]="f.status">
                      {{ forkliftStatusText(f.status) }}
                    </span>
                  </td>
                  <td>{{ getTeamName(f.teamId) }}</td>
                  <td>({{ f.position.x }}, {{ f.position.y }})</td>
                  <td>{{ f.blindSpotRadius || '-' }}m</td>
                  <td>
                    <span class="event-count" [class.high]="getEventCount(f.id) > 5">
                      {{ getEventCount(f.id) }} 次
                    </span>
                  </td>
                  <td>{{ f.lastUpdate | date:'MM-dd HH:mm' }}</td>
                  <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn btn-outline" style="padding:2px 8px;font-size:11px;" (click)="openEditModal(f)">编辑</button>
                      <button 
                        class="btn" 
                        [class]="f.status === 'Offline' ? 'btn-success' : 'btn-warning'"
                        style="padding:2px 8px;font-size:11px;"
                        (click)="toggleStatus(f)">
                        {{ f.status === 'Offline' ? '启用' : '停用' }}
                      </button>
                      <button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" (click)="deleteForklift(f.id)">删除</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" style="padding:32px;text-align:center;color:#5a7a9a;">
                    暂无叉车数据
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1b3a5c;display:flex;gap:24px;">
          <div>
            <div style="font-size:12px;color:#5a7a9a;">叉车总数</div>
            <div style="font-size:20px;font-weight:700;color:#e8f0fe;">{{ forklifts.length }}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#5a7a9a;">在线</div>
            <div style="font-size:20px;font-weight:700;color:#2ed573;">{{ countByStatus('Online') }}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#5a7a9a;">离线</div>
            <div style="font-size:20px;font-weight:700;color:#ff4757;">{{ countByStatus('Offline') }}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#5a7a9a;">充电中</div>
            <div style="font-size:20px;font-weight:700;color:#ffa502;">{{ countByStatus('Charging') }}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#5a7a9a;">维护中</div>
            <div style="font-size:20px;font-weight:700;color:#9b59b6;">{{ countByStatus('Maintenance') }}</div>
          </div>
        </div>
      </div>
    </div>

    @if (showModal) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingForklift ? '编辑叉车' : '新增叉车' }}</h3>
            <button class="btn btn-outline" style="padding:4px 8px;" (click)="closeModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>编号 *</label>
              <input class="form-control" [(ngModel)]="formData.code" placeholder="请输入叉车编号" />
            </div>
            <div class="form-group">
              <label>型号 *</label>
              <input class="form-control" [(ngModel)]="formData.model" placeholder="请输入叉车型号" />
            </div>
            <div class="form-group">
              <label>所属班组</label>
              <select class="form-control" [(ngModel)]="formData.teamId">
                <option [ngValue]="null">请选择班组</option>
                @for (t of teams; track t.id) {
                  <option [value]="t.id">{{ t.name }} ({{ shiftText(t.shift) }})</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>盲区半径(米) *</label>
              <input class="form-control" type="number" [(ngModel)]="formData.blindSpotRadius" placeholder="请输入盲区半径" min="0" step="0.1" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="closeModal()">取消</button>
            <button class="btn btn-primary" (click)="saveForklift()">保存</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .filter-bar {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .filter-bar .form-group {
      flex: 0 0 auto;
      min-width: 160px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-badge.Online {
      background: rgba(46, 213, 115, 0.15);
      color: #2ed573;
    }
    .status-badge.Offline {
      background: rgba(255, 71, 87, 0.15);
      color: #ff4757;
    }
    .status-badge.Charging {
      background: rgba(255, 165, 2, 0.15);
      color: #ffa502;
    }
    .status-badge.Maintenance {
      background: rgba(155, 89, 182, 0.15);
      color: #9b59b6;
    }
    .event-count {
      font-size: 12px;
      font-weight: 500;
      color: #5a7a9a;
    }
    .event-count.high {
      color: #ff4757;
    }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: #0a1929;
      border: 1px solid #1b3a5c;
      border-radius: 8px;
      width: 480px;
      max-width: 90vw;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #1b3a5c;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 16px;
      color: #e8f0fe;
    }
    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid #1b3a5c;
    }
  `]
})
export class ForkliftManagementComponent implements OnInit {
  forklifts: Forklift[] = [];
  filteredForklifts: Forklift[] = [];
  teams: Team[] = [];

  filterStatus: ForkliftStatus | null = null;
  filterTeamId: string | null = null;

  showModal = false;
  editingForklift: Forklift | null = null;
  formData = {
    code: '',
    model: '',
    teamId: null as string | null,
    blindSpotRadius: 3
  };

  forkliftStatusText = forkliftStatusText;
  shiftText = shiftText;
  zoneTypeColors = zoneTypeColors;

  private eventCounts: Map<string, number> = new Map();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadForklifts();
    this.loadTeams();
    this.loadEventCounts();
  }

  private loadForklifts(): void {
    this.api.getForklifts().subscribe({
      next: d => {
        this.forklifts = d;
        this.filteredForklifts = d;
      }
    });
  }

  private loadTeams(): void {
    this.api.getTeams().subscribe({
      next: d => { this.teams = d; }
    });
  }

  private loadEventCounts(): void {
    this.api.getEvents().subscribe({
      next: events => {
        this.eventCounts.clear();
        for (const e of events) {
          const count = this.eventCounts.get(e.forkliftId) || 0;
          this.eventCounts.set(e.forkliftId, count + 1);
        }
      }
    });
  }

  applyFilters(): void {
    let result = [...this.forklifts];

    if (this.filterStatus) {
      result = result.filter(f => f.status === this.filterStatus);
    }

    if (this.filterTeamId) {
      result = result.filter(f => f.teamId === this.filterTeamId);
    }

    this.filteredForklifts = result;
  }

  resetFilters(): void {
    this.filterStatus = null;
    this.filterTeamId = null;
    this.filteredForklifts = [...this.forklifts];
  }

  getTeamName(teamId: string | undefined): string {
    if (!teamId) return '-';
    const team = this.teams.find(t => t.id === teamId);
    return team ? `${team.name} (${shiftText(team.shift)})` : '-';
  }

  getEventCount(forkliftId: string): number {
    return this.eventCounts.get(forkliftId) || 0;
  }

  countByStatus(status: ForkliftStatus): number {
    return this.forklifts.filter(f => f.status === status).length;
  }

  openAddModal(): void {
    this.editingForklift = null;
    this.formData = {
      code: '',
      model: '',
      teamId: null,
      blindSpotRadius: 3
    };
    this.showModal = true;
  }

  openEditModal(forklift: Forklift): void {
    this.editingForklift = forklift;
    this.formData = {
      code: forklift.code,
      model: forklift.model || '',
      teamId: forklift.teamId || null,
      blindSpotRadius: forklift.blindSpotRadius || 3
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingForklift = null;
  }

  saveForklift(): void {
    if (!this.formData.code.trim() || !this.formData.model.trim()) {
      alert('请填写必填项');
      return;
    }

    const data = {
      code: this.formData.code.trim(),
      model: this.formData.model.trim(),
      teamId: this.formData.teamId || undefined,
      blindSpotRadius: this.formData.blindSpotRadius
    };

    if (this.editingForklift) {
      this.api.updateForklift(this.editingForklift.id, data).subscribe({
        next: updated => {
          const idx = this.forklifts.findIndex(f => f.id === updated.id);
          if (idx >= 0) this.forklifts[idx] = updated;
          this.applyFilters();
          this.closeModal();
        }
      });
    } else {
      this.api.createForklift(data).subscribe({
        next: created => {
          this.forklifts.push(created);
          this.applyFilters();
          this.closeModal();
        }
      });
    }
  }

  toggleStatus(forklift: Forklift): void {
    const newStatus: ForkliftStatus = forklift.status === 'Offline' ? 'Online' : 'Offline';
    this.api.updateForkliftStatus(forklift.id, newStatus).subscribe({
      next: updated => {
        const idx = this.forklifts.findIndex(f => f.id === updated.id);
        if (idx >= 0) this.forklifts[idx] = updated;
        this.applyFilters();
      }
    });
  }

  deleteForklift(id: string): void {
    if (!confirm('确定要删除此叉车吗？')) return;
    this.api.deleteForklift(id).subscribe({
      next: () => {
        this.forklifts = this.forklifts.filter(f => f.id !== id);
        this.applyFilters();
        this.eventCounts.delete(id);
      }
    });
  }
}
