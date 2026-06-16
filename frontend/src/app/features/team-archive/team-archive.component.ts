import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  Team,
  TeamMember,
  Warning,
  shiftText,
  roleText,
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
          <button class="btn btn-primary" (click)="addTeam()">+ 新增</button>
        </div>
        <div class="card-body" style="padding:0;">
          <ul class="zone-list">
            @for (t of teams; track t.id) {
              <li [class.selected]="selectedTeam?.id === t.id" (click)="selectTeam(t)">
                <div>
                  <div style="color:#e8f0fe;font-weight:500;">{{ t.name }}</div>
                  <div style="font-size:12px;color:#5a7a9a;">{{ shiftText(t.shift) }} · {{ t.members.length }}人</div>
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
        @if (selectedTeam) {
          <div class="card">
            <div class="card-header">
              <h3>{{ selectedTeam.name }} - 成员管理</h3>
              <button class="btn btn-primary" (click)="addMember()">+ 添加成员</button>
            </div>
            <div class="card-body">
              @if (selectedTeam.members.length > 0) {
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
                  @for (m of selectedTeam.members; track m.id) {
                    <div class="team-member" style="background:#081220;padding:12px;border-radius:8px;">
                      <div class="team-avatar">{{ m.name[0] }}</div>
                      <div style="flex:1;">
                        <div style="color:#e8f0fe;font-size:13px;">{{ m.name }}</div>
                        <div style="color:#5a7a9a;font-size:11px;">{{ roleText(m.role) }}</div>
                      </div>
                      <span style="font-size:12px;" [style.color]="m.eventCount > 0 ? '#ff4757' : '#2ed573'">{{ m.eventCount }}次</span>
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
                  <div style="font-size:24px;font-weight:700;color:#e8f0fe;">{{ teamEvents.length }}</div>
                </div>
                <div>
                  <div style="font-size:12px;color:#5a7a9a;">极高事件</div>
                  <div style="font-size:24px;font-weight:700;color:#ff4757;">{{ criticalEventCount() }}</div>
                </div>
                <div>
                  <div style="font-size:12px;color:#5a7a9a;">安全评分</div>
                  <div style="font-size:24px;font-weight:700;" [style.color]="scoreColor()">{{ selectedTeam.safetyScore }}</div>
                </div>
                <div>
                  <div style="font-size:12px;color:#5a7a9a;">班次</div>
                  <div style="font-size:24px;font-weight:700;color:#00d4ff;">{{ shiftText(selectedTeam.shift) }}</div>
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
  `,
  styles: [`:host { display: block; }`]
})
export class TeamArchiveComponent implements OnInit {
  teams: Team[] = [];
  selectedTeam: Team | null = null;
  teamEvents: Warning[] = [];

  shiftText = shiftText;
  roleText = roleText;
  riskLevelText = riskLevelText;
  warningTypeText = warningTypeText;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  private loadTeams(): void {
    this.api.getTeams().subscribe({
      next: d => { this.teams = d; }
    });
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.loadTeamEvents(team.id);
  }

  addTeam(): void {
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name: '新班组',
      leader: '',
      members: [],
      shift: 'morning',
      eventCount: 0,
      safetyScore: 100
    };
    this.teams.push(newTeam);
  }

  addMember(): void {
    if (!this.selectedTeam) return;
    this.selectedTeam.members.push({
      id: crypto.randomUUID(),
      name: '新成员',
      role: 'worker',
      eventCount: 0
    });
  }

  criticalEventCount(): number {
    return this.teamEvents.filter(e => e.level === 'critical').length;
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

  private loadTeamEvents(teamId: string): void {
    this.api.getTeamEvents(teamId).subscribe({
      next: d => { this.teamEvents = d; }
    });
  }
}
