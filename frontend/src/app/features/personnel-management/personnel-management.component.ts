import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  Personnel,
  Team,
  PersonnelStatus,
  personnelStatusText,
  shiftText,
  memberTypeText,
  Warning,
  warningTypeText,
  riskLevelText
} from '../../core/models';

@Component({
  selector: 'app-personnel-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>人员基础资料管理</h2>
      <p>人员信息维护、班组分配与状态管理</p>
    </div>

    <div class="content-grid" style="grid-template-columns:320px 1fr;">
      <div class="card">
        <div class="card-header">
          <h3>班组列表</h3>
        </div>
        <div class="card-body" style="padding:0;">
          <ul class="zone-list">
            <li [class.selected]="selectedTeamId === null" (click)="selectTeam(null)">
              <div>
                <div style="color:#e8f0fe;font-weight:500;">全部人员</div>
                <div style="font-size:12px;color:#5a7a9a;">共 {{ personnel.length }} 人</div>
              </div>
              <span class="risk-badge low">{{ onlineCount(personnel) }} 在线</span>
            </li>
            @for (t of teams; track t.id) {
              <li [class.selected]="selectedTeamId === t.id" (click)="selectTeam(t.id)">
                <div>
                  <div style="color:#e8f0fe;font-weight:500;">{{ t.name }}</div>
                  <div style="font-size:12px;color:#5a7a9a;">{{ shiftText(t.shift) }} · {{ getTeamPersonnel(t.id).length }}人</div>
                </div>
                <span class="risk-badge" [class]="teamBadgeClass(t.safetyScore)">{{ t.safetyScore }}分</span>
              </li>
            } @empty {
              <li style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">暂无班组数据</li>
            }
          </ul>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card">
          <div class="card-header">
            <h3>人员列表</h3>
            <div style="display:flex;gap:8px;">
              <select class="form-input" [(ngModel)]="filterStatus" (change)="applyFilter()" style="width:120px;">
                <option [value]="null">全部状态</option>
                <option value="Online">在线</option>
                <option value="Offline">离线</option>
              </select>
              <select class="form-input" [(ngModel)]="filterTeamId" (change)="applyFilter()" style="width:140px;">
                <option [value]="null">全部班组</option>
                @for (t of teams; track t.id) {
                  <option [value]="t.id">{{ t.name }}</option>
                }
              </select>
              <input class="form-input" [(ngModel)]="searchKeyword" (input)="applyFilter()" placeholder="搜索姓名/工号" style="width:160px;" />
              <button class="btn btn-primary" (click)="openAddModal()">+ 新增人员</button>
            </div>
          </div>
          <div class="card-body" style="padding:0;">
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>工号</th>
                    <th>状态</th>
                    <th>所属班组</th>
                    <th>当前位置</th>
                    <th>关联事件</th>
                    <th>最后更新</th>
                    <th style="width:200px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of filteredPersonnel; track p.id) {
                    <tr>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <div class="team-avatar">{{ p.name[0] }}</div>
                          <span>{{ p.name }}</span>
                        </div>
                      </td>
                      <td>{{ p.code }}</td>
                      <td><span class="status-badge" [class]="p.status">{{ personnelStatusText(p.status) }}</span></td>
                      <td>{{ getTeamName(p.teamId) }}</td>
                      <td>({{ p.position.x.toFixed(0) }}, {{ p.position.y.toFixed(0) }})</td>
                      <td>
                        <span [style.color]="getPersonnelEventCount(p.id) > 0 ? '#ff4757' : '#2ed573'">
                          {{ getPersonnelEventCount(p.id) }} 次
                        </span>
                      </td>
                      <td>{{ p.lastUpdate | date:'MM-dd HH:mm' }}</td>
                      <td>
                        <div style="display:flex;gap:4px;">
                          <button class="btn btn-sm" (click)="openEditModal(p)">编辑</button>
                          <button class="btn btn-sm" [class]="p.status === 'Online' ? 'btn-warning' : 'btn-success'" (click)="toggleStatus(p)">
                            {{ p.status === 'Online' ? '停用' : '启用' }}
                          </button>
                          <button class="btn btn-sm btn-danger" (click)="confirmDelete(p)">删除</button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" style="padding:24px;text-align:center;color:#5a7a9a;">暂无人员数据</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>班组人员统计</h3>
          </div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">
              <div style="background:#081220;padding:16px;border-radius:8px;border:1px solid #1a2d44;">
                <div style="font-size:12px;color:#5a7a9a;margin-bottom:8px;">全部人员</div>
                <div style="display:flex;justify-content:space-between;align-items:baseline;">
                  <div style="font-size:28px;font-weight:700;color:#e8f0fe;">{{ personnel.length }}</div>
                  <div style="font-size:12px;">
                    <span style="color:#2ed573;">{{ onlineCount(personnel) }} 在线</span>
                    <span style="color:#5a7a9a;margin:0 4px;">·</span>
                    <span style="color:#5a7a9a;">{{ offlineCount(personnel) }} 离线</span>
                  </div>
                </div>
              </div>
              @for (t of teams; track t.id) {
                <div style="background:#081220;padding:16px;border-radius:8px;border:1px solid #1a2d44;">
                  <div style="font-size:12px;color:#5a7a9a;margin-bottom:8px;">{{ t.name }} ({{ shiftText(t.shift) }})</div>
                  <div style="display:flex;justify-content:space-between;align-items:baseline;">
                    <div style="font-size:28px;font-weight:700;color:#e8f0fe;">{{ getTeamPersonnel(t.id).length }}</div>
                    <div style="font-size:12px;">
                      <span style="color:#2ed573;">{{ onlineCount(getTeamPersonnel(t.id)) }} 在线</span>
                      <span style="color:#5a7a9a;margin:0 4px;">·</span>
                      <span style="color:#5a7a9a;">{{ offlineCount(getTeamPersonnel(t.id)) }} 离线</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        @if (selectedPersonnel) {
          <div class="card">
            <div class="card-header">
              <h3>{{ selectedPersonnel.name }} - 关联事件</h3>
              <span style="font-size:12px;color:#5a7a9a;">{{ personnelEvents.length }} 条记录</span>
            </div>
            <div class="card-body" style="padding:0;">
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>类型</th>
                      <th>等级</th>
                      <th>叉车</th>
                      <th>描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (e of personnelEvents; track e.id) {
                      <tr>
                        <td>{{ e.timestamp | date:'MM-dd HH:mm' }}</td>
                        <td>{{ warningTypeText(e.type) }}</td>
                        <td><span class="risk-badge" [class]="e.level">{{ riskLevelText(e.level) }}</span></td>
                        <td>{{ e.forkliftName }}</td>
                        <td>{{ e.message }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" style="padding:24px;text-align:center;color:#5a7a9a;">暂无事件记录</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }
      </div>
    </div>

    @if (showModal) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()" style="width:480px;">
          <div class="modal-header">
            <h3>{{ isEdit ? '编辑人员' : '新增人员' }}</h3>
            <button class="btn btn-sm" (click)="closeModal()">×</button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div>
                <label style="display:block;margin-bottom:6px;color:#5a7a9a;font-size:13px;">姓名</label>
                <input class="form-input" [(ngModel)]="formData.name" placeholder="请输入姓名" />
              </div>
              <div>
                <label style="display:block;margin-bottom:6px;color:#5a7a9a;font-size:13px;">工号</label>
                <input class="form-input" [(ngModel)]="formData.badge" placeholder="请输入工号" />
              </div>
              <div>
                <label style="display:block;margin-bottom:6px;color:#5a7a9a;font-size:13px;">所属班组</label>
                <select class="form-input" [(ngModel)]="formData.teamId">
                  <option [value]="null">请选择班组</option>
                  @for (t of teams; track t.id) {
                    <option [value]="t.id">{{ t.name }}</option>
                  }
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" (click)="closeModal()">取消</button>
            <button class="btn btn-primary" (click)="savePersonnel()">{{ isEdit ? '保存' : '创建' }}</button>
          </div>
        </div>
      </div>
    }

    @if (showDeleteConfirm) {
      <div class="modal-overlay" (click)="showDeleteConfirm = false">
        <div class="modal-content" (click)="$event.stopPropagation()" style="width:400px;">
          <div class="modal-header">
            <h3>确认删除</h3>
          </div>
          <div class="modal-body">
            <p style="color:#5a7a9a;">确定要删除人员「{{ personnelToDelete?.name }}」吗？此操作不可撤销。</p>
          </div>
          <div class="modal-footer">
            <button class="btn" (click)="showDeleteConfirm = false">取消</button>
            <button class="btn btn-danger" (click)="deletePersonnel()">确认删除</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`:host { display: block; }`]
})
export class PersonnelManagementComponent implements OnInit {
  personnel: Personnel[] = [];
  filteredPersonnel: Personnel[] = [];
  teams: Team[] = [];
  allEvents: Warning[] = [];
  personnelEvents: Warning[] = [];

  selectedTeamId: string | null = null;
  selectedPersonnel: Personnel | null = null;
  filterStatus: string | null = null;
  filterTeamId: string | null = null;
  searchKeyword: string = '';

  showModal = false;
  isEdit = false;
  formData = { name: '', badge: '', teamId: null as string | null };
  editingPersonnel: Personnel | null = null;

  showDeleteConfirm = false;
  personnelToDelete: Personnel | null = null;

  personnelStatusText = personnelStatusText;
  shiftText = shiftText;
  memberTypeText = memberTypeText;
  warningTypeText = warningTypeText;
  riskLevelText = riskLevelText;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.api.getPersonnel().subscribe({ next: d => { this.personnel = d; this.filteredPersonnel = d; } });
    this.api.getTeams().subscribe({ next: d => { this.teams = d; } });
    this.api.getWarnings().subscribe({ next: d => { this.allEvents = d; } });
  }

  selectTeam(teamId: string | null): void {
    this.selectedTeamId = teamId;
    if (teamId) {
      this.api.getPersonnelByTeam(teamId).subscribe({
        next: d => {
          this.filteredPersonnel = d;
          this.filterTeamId = teamId;
        }
      });
    } else {
      this.filterTeamId = null;
      this.applyFilter();
    }
  }

  getTeamPersonnel(teamId: string): Personnel[] {
    return this.personnel.filter(p => p.teamId === teamId);
  }

  getTeamName(teamId: string | undefined): string {
    if (!teamId) return '未分配';
    const team = this.teams.find(t => t.id === teamId);
    return team ? team.name : '未分配';
  }

  onlineCount(list: Personnel[]): number {
    return list.filter(p => p.status === 'Online').length;
  }

  offlineCount(list: Personnel[]): number {
    return list.filter(p => p.status === 'Offline').length;
  }

  getPersonnelEventCount(personnelId: string): number {
    return this.allEvents.filter(e => e.personnelId === personnelId).length;
  }

  applyFilter(): void {
    let result = [...this.personnel];

    if (this.filterStatus) {
      result = result.filter(p => p.status === this.filterStatus);
    }

    if (this.filterTeamId) {
      result = result.filter(p => p.teamId === this.filterTeamId);
    }

    if (this.searchKeyword) {
      const kw = this.searchKeyword.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.code.toLowerCase().includes(kw)
      );
    }

    this.filteredPersonnel = result;
  }

  openAddModal(): void {
    this.isEdit = false;
    this.editingPersonnel = null;
    this.formData = { name: '', badge: '', teamId: null };
    this.showModal = true;
  }

  openEditModal(personnel: Personnel): void {
    this.isEdit = true;
    this.editingPersonnel = personnel;
    this.selectedPersonnel = personnel;
    this.personnelEvents = this.allEvents.filter(e => e.personnelId === personnel.id);
    this.formData = {
      name: personnel.name,
      badge: personnel.badge || personnel.code,
      teamId: personnel.teamId || null
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = { name: '', badge: '', teamId: null };
    this.editingPersonnel = null;
  }

  savePersonnel(): void {
    if (!this.formData.name || !this.formData.badge) return;

    const payload = {
      name: this.formData.name,
      badge: this.formData.badge,
      teamId: this.formData.teamId || undefined
    };

    if (this.isEdit && this.editingPersonnel) {
      this.api.updatePersonnel(this.editingPersonnel.id, payload).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        }
      });
    } else {
      this.api.createPersonnel(payload).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        }
      });
    }
  }

  toggleStatus(personnel: Personnel): void {
    const newStatus: PersonnelStatus = personnel.status === 'Online' ? 'Offline' : 'Online';
    this.api.updatePersonnelStatus(personnel.id, newStatus).subscribe({
      next: () => this.loadData()
    });
  }

  confirmDelete(personnel: Personnel): void {
    this.personnelToDelete = personnel;
    this.showDeleteConfirm = true;
  }

  deletePersonnel(): void {
    if (!this.personnelToDelete) return;
    this.api.deletePersonnel(this.personnelToDelete.id).subscribe({
      next: () => {
        this.loadData();
        this.showDeleteConfirm = false;
        this.personnelToDelete = null;
      }
    });
  }

  teamBadgeClass(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }
}
