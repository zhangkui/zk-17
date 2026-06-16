import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  Team,
  TeamMember,
  Warning,
  MemberType,
  ShiftType,
  shiftText,
  memberTypeText,
  riskLevelText,
  warningTypeText
} from '../../core/models';

@Component({
  selector: 'app-team-archive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>班组归档</h2>
      <p>班组人员管理与事件责任追溯</p>
    </div>

    <div class="content-grid" style="grid-template-columns:320px 1fr;">
      <div class="card">
        <div class="card-header">
          <h3>班组列表</h3>
          <button class="btn btn-primary" (click)="openTeamModal()">+ 新增</button>
        </div>
        <div class="card-body" style="padding:0;">
          <ul class="zone-list">
            @for (t of teams; track t.id) {
              <li [class.selected]="selectedTeam?.id === t.id" (click)="selectTeam(t)">
                <div style="flex:1;">
                  <div style="color:#e8f0fe;font-weight:500;">{{ t.name }}</div>
                  <div style="font-size:12px;color:#5a7a9a;">{{ shiftText(t.shift) }} · {{ t.leader || '未指定组长' }} · {{ t.members.length }}人</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="risk-badge" [class]="teamBadgeClass(t.safetyScore)">{{ t.safetyScore }}分</span>
                  <button class="btn btn-sm btn-secondary" (click)="$event.stopPropagation(); openTeamModal(t)" title="编辑">✎</button>
                  <button class="btn btn-sm btn-danger" (click)="$event.stopPropagation(); confirmDeleteTeam(t)" title="删除">✕</button>
                </div>
              </li>
            } @empty {
              <li style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">暂无班组数据</li>
            }
          </ul>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
        @if (selectedTeam) {
          <div class="card">
            <div class="card-header">
              <h3>{{ selectedTeam.name }} - 成员管理</h3>
              <button class="btn btn-primary" (click)="openMemberModal()">+ 添加成员</button>
            </div>
            <div class="card-body">
              @if (selectedTeam.members.length > 0) {
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">
                  @for (m of selectedTeam.members; track m.id) {
                    <div class="team-member" style="background:#081220;padding:12px;border-radius:8px;">
                      <div class="team-avatar">{{ m.name[0] }}</div>
                      <div style="flex:1;">
                        <div style="color:#e8f0fe;font-size:13px;">{{ m.name }}</div>
                        <div style="color:#5a7a9a;font-size:11px;">{{ memberTypeText(m.type) }} · {{ m.badge || '-' }}</div>
                      </div>
                      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                        <span style="font-size:12px;" [style.color]="m.eventCount > 0 ? '#ff4757' : '#2ed573'">{{ m.eventCount }}次</span>
                        <div style="display:flex;gap:4px;">
                          <button class="btn btn-sm btn-secondary" (click)="openMemberModal(m)" title="编辑">✎</button>
                          <button class="btn btn-sm btn-danger" (click)="confirmDeleteMember(m)" title="删除">✕</button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div style="padding:24px;text-align:center;color:#5a7a9a;font-size:13px;">暂无成员数据</div>
              }
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>关联事件</h3>
              <span style="font-size:12px;color:#5a7a9a;">{{ teamEvents.length }} 条记录</span>
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
                      <th>人员</th>
                      <th>描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (e of teamEvents; track e.id) {
                      <tr>
                        <td>{{ e.timestamp | date:'MM-dd HH:mm' }}</td>
                        <td>{{ warningTypeText(e.type) }}</td>
                        <td><span class="risk-badge" [class]="e.level">{{ riskLevelText(e.level) }}</span></td>
                        <td>{{ e.forkliftName }}</td>
                        <td>{{ e.personnelName || '-' }}</td>
                        <td>{{ e.message }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" style="padding:24px;text-align:center;color:#5a7a9a;">暂无事件记录</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>责任统计</h3>
            </div>
            <div class="card-body">
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
                <div>
                  <div style="font-size:12px;color:#5a7a9a;">总事件数</div>
                  <div style="font-size:24px;font-weight:700;color:#e8f0fe;">{{ teamStatistics?.totalWarnings ?? teamEvents.length }}</div>
                </div>
                <div>
                  <div style="font-size:12px;color:#5a7a9a;">极高事件</div>
                  <div style="font-size:24px;font-weight:700;color:#ff4757;">{{ teamStatistics?.criticalWarnings ?? criticalEventCount() }}</div>
                </div>
                <div>
                  <div style="font-size:12px;color:#5a7a9a;">安全评分</div>
                  <div style="font-size:24px;font-weight:700;" [style.color]="scoreColor()">{{ selectedTeam.safetyScore }}</div>
                </div>
                <div>
                  <div style="font-size:12px;color:#5a7a9a;">确认率</div>
                  <div style="font-size:24px;font-weight:700;color:#00d4ff;">{{ acknowledgedRate() }}%</div>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="card">
            <div class="card-body" style="text-align:center;padding:60px;color:#5a7a9a;">
              请从左侧选择班组查看详情
            </div>
          </div>
        }
      </div>
    </div>

    @if (showTeamModal) {
      <div class="modal-overlay" (click)="closeTeamModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingTeam ? '编辑班组' : '新增班组' }}</h3>
            <button class="btn btn-sm btn-secondary" (click)="closeTeamModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>班组名称</label>
              <input type="text" class="form-control" [(ngModel)]="teamForm.name" placeholder="请输入班组名称" />
            </div>
            <div class="form-group">
              <label>班次</label>
              <select class="form-control" [(ngModel)]="teamForm.shift">
                <option value="Morning">早班</option>
                <option value="Afternoon">中班</option>
                <option value="Night">晚班</option>
              </select>
            </div>
            <div class="form-group">
              <label>组长</label>
              <input type="text" class="form-control" [(ngModel)]="teamForm.leader" placeholder="请输入组长姓名" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeTeamModal()">取消</button>
            <button class="btn btn-primary" (click)="saveTeam()" [disabled]="!teamForm.name.trim()">保存</button>
          </div>
        </div>
      </div>
    }

    @if (showMemberModal) {
      <div class="modal-overlay" (click)="closeMemberModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingMember ? '编辑成员' : '新增成员' }}</h3>
            <button class="btn btn-sm btn-secondary" (click)="closeMemberModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>成员类型</label>
              <select class="form-control" [(ngModel)]="memberForm.type">
                <option value="Operator">操作员</option>
                <option value="Worker">工人</option>
                <option value="Supervisor">主管</option>
              </select>
            </div>
            <div class="form-group">
              <label>姓名</label>
              <input type="text" class="form-control" [(ngModel)]="memberForm.memberName" placeholder="请输入姓名" />
            </div>
            <div class="form-group">
              <label>工号</label>
              <input type="text" class="form-control" [(ngModel)]="memberForm.badge" placeholder="请输入工号" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeMemberModal()">取消</button>
            <button class="btn btn-primary" (click)="saveMember()" [disabled]="!memberForm.memberName.trim() || !memberForm.badge.trim()">保存</button>
          </div>
        </div>
      </div>
    }

    @if (showConfirmDialog) {
      <div class="modal-overlay" (click)="closeConfirmDialog()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>确认删除</h3>
          </div>
          <div class="modal-body">
            <p>{{ confirmMessage }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeConfirmDialog()">取消</button>
            <button class="btn btn-danger" (click)="confirmDelete()">确认删除</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: #0a1628;
      border: 1px solid #1e3a5f;
      border-radius: 8px;
      min-width: 400px;
      max-width: 500px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #1e3a5f;
    }
    .modal-header h3 {
      margin: 0;
      color: #e8f0fe;
      font-size: 16px;
    }
    .modal-body {
      padding: 20px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid #1e3a5f;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      color: #5a7a9a;
      font-size: 13px;
    }
    .form-control {
      width: 100%;
      padding: 10px 12px;
      background: #081220;
      border: 1px solid #1e3a5f;
      border-radius: 6px;
      color: #e8f0fe;
      font-size: 14px;
      box-sizing: border-box;
    }
    .form-control:focus {
      outline: none;
      border-color: #00d4ff;
    }
    .form-control::placeholder {
      color: #3a5a7a;
    }
    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
      min-width: auto;
    }
    .btn-danger {
      background: rgba(255, 71, 87, 0.2);
      color: #ff4757;
      border: 1px solid rgba(255, 71, 87, 0.3);
    }
    .btn-danger:hover {
      background: rgba(255, 71, 87, 0.3);
    }
  `]
})
export class TeamArchiveComponent implements OnInit {
  teams: Team[] = [];
  selectedTeam: Team | null = null;
  teamEvents: Warning[] = [];
  teamStatistics: any = null;

  showTeamModal = false;
  showMemberModal = false;
  showConfirmDialog = false;
  editingTeam: Team | null = null;
  editingMember: TeamMember | null = null;
  confirmMessage = '';
  deleteAction: (() => void) | null = null;

  teamForm = { name: '', shift: 'Morning' as ShiftType, leader: '' };
  memberForm = { type: 'Worker' as MemberType, memberName: '', badge: '' };

  shiftText = shiftText;
  memberTypeText = memberTypeText;
  riskLevelText = riskLevelText;
  warningTypeText = warningTypeText;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  private loadTeams(): void {
    this.api.getTeams().subscribe({
      next: d => {
        this.teams = d;
        if (this.selectedTeam) {
          const updated = this.teams.find(t => t.id === this.selectedTeam?.id);
          if (updated) {
            this.selectedTeam = updated;
          }
        }
      }
    });
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.teamStatistics = null;
    this.loadTeamEvents(team.id);
    this.loadTeamStatistics(team.id);
  }

  openTeamModal(team?: Team): void {
    this.editingTeam = team || null;
    if (team) {
      this.teamForm = { name: team.name, shift: team.shift, leader: team.leader };
    } else {
      this.teamForm = { name: '', shift: 'Morning', leader: '' };
    }
    this.showTeamModal = true;
  }

  closeTeamModal(): void {
    this.showTeamModal = false;
    this.editingTeam = null;
  }

  saveTeam(): void {
    if (!this.teamForm.name.trim()) return;

    if (this.editingTeam) {
      this.api.updateTeam(this.editingTeam.id, this.teamForm).subscribe({
        next: () => {
          this.loadTeams();
          this.closeTeamModal();
        }
      });
    } else {
      this.api.createTeam(this.teamForm).subscribe({
        next: (newTeam) => {
          this.loadTeams();
          this.closeTeamModal();
          this.selectTeam(newTeam);
        }
      });
    }
  }

  confirmDeleteTeam(team: Team): void {
    this.confirmMessage = `确定要删除班组「${team.name}」吗？此操作不可恢复。`;
    this.deleteAction = () => this.deleteTeam(team.id);
    this.showConfirmDialog = true;
  }

  private deleteTeam(teamId: string): void {
    this.api.deleteTeam(teamId).subscribe({
      next: () => {
        if (this.selectedTeam?.id === teamId) {
          this.selectedTeam = null;
          this.teamEvents = [];
          this.teamStatistics = null;
        }
        this.loadTeams();
        this.closeConfirmDialog();
      }
    });
  }

  openMemberModal(member?: TeamMember): void {
    this.editingMember = member || null;
    if (member) {
      this.memberForm = { type: member.type, memberName: member.name, badge: member.badge || '' };
    } else {
      this.memberForm = { type: 'Worker', memberName: '', badge: '' };
    }
    this.showMemberModal = true;
  }

  closeMemberModal(): void {
    this.showMemberModal = false;
    this.editingMember = null;
  }

  saveMember(): void {
    if (!this.selectedTeam || !this.memberForm.memberName.trim() || !this.memberForm.badge.trim()) return;

    if (this.editingMember) {
      this.api.updateTeamMember(this.selectedTeam.id, this.editingMember.id, {
        memberType: this.memberForm.type,
        memberName: this.memberForm.memberName,
        badge: this.memberForm.badge
      }).subscribe({
        next: () => {
          this.loadTeams();
          this.closeMemberModal();
        }
      });
    } else {
      this.api.addTeamMember(this.selectedTeam.id, this.memberForm).subscribe({
        next: () => {
          this.loadTeams();
          this.closeMemberModal();
        }
      });
    }
  }

  confirmDeleteMember(member: TeamMember): void {
    this.confirmMessage = `确定要删除成员「${member.name}」吗？此操作不可恢复。`;
    this.deleteAction = () => this.deleteMember(member.id);
    this.showConfirmDialog = true;
  }

  private deleteMember(memberId: string): void {
    if (!this.selectedTeam) return;

    this.api.deleteTeamMember(this.selectedTeam.id, memberId).subscribe({
      next: () => {
        this.loadTeams();
        this.closeConfirmDialog();
      }
    });
  }

  closeConfirmDialog(): void {
    this.showConfirmDialog = false;
    this.deleteAction = null;
  }

  confirmDelete(): void {
    if (this.deleteAction) {
      this.deleteAction();
    }
  }

  private loadTeamEvents(teamId: string): void {
    this.api.getTeamEvents(teamId).subscribe({
      next: d => { this.teamEvents = d; }
    });
  }

  private loadTeamStatistics(teamId: string): void {
    this.api.getTeamStatistics(teamId).subscribe({
      next: d => {
        this.teamStatistics = d;
        if (this.selectedTeam && d.safetyScore !== undefined) {
          this.selectedTeam.safetyScore = d.safetyScore;
        }
      }
    });
  }

  criticalEventCount(): number {
    return this.teamEvents.filter(e => e.level === 'Critical').length;
  }

  acknowledgedRate(): number {
    if (this.teamStatistics?.acknowledgedRate !== undefined) {
      return Math.round(this.teamStatistics.acknowledgedRate * 100);
    }
    if (this.teamEvents.length === 0) return 100;
    const acknowledged = this.teamEvents.filter(e => e.isAcknowledged).length;
    return Math.round((acknowledged / this.teamEvents.length) * 100);
  }

  scoreColor(): string {
    if (!this.selectedTeam) return '#ff4757';
    if (this.selectedTeam.safetyScore >= 90) return '#2ed573';
    if (this.selectedTeam.safetyScore >= 70) return '#ffd32a';
    return '#ff4757';
  }

  teamBadgeClass(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }
}
