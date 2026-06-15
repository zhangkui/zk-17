import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Team, TeamMember, EventRecord } from '../../core/models';

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
                        <td>{{ typeText(e.type) }}</td>
                        <td><span class="risk-badge" [class]="e.level">{{ levelText(e.level) }}</span></td>
                        <td>{{ e.forkliftName }}</td>
                        <td>{{ e.personnelName || '-' }}</td>
                        <td>{{ e.description }}</td>
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
  teamEvents: EventRecord[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<Team[]>('/teams').subscribe({
      next: d => { this.teams = d; },
      error: () => { this.teams = this.mockTeams(); }
    });
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.loadTeamEvents(team.id);
  }

  addTeam(): void {
    const newTeam: Team = {
      id: 't' + Date.now(),
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
      id: 'm' + Date.now(),
      name: '新成员',
      role: 'worker',
      eventCount: 0
    });
  }

  shiftText(shift: string): string {
    const map: Record<string, string> = { morning: '早班', afternoon: '中班', night: '晚班' };
    return map[shift] || shift;
  }

  roleText(role: string): string {
    const map: Record<string, string> = { operator: '操作员', worker: '工人', supervisor: '主管' };
    return map[role] || role;
  }

  typeText(type: string): string {
    const map: Record<string, string> = {
      collision: '碰撞', blindspot_intrusion: '盲区入侵', zone_violation: '区域违规', speed_violation: '超速'
    };
    return map[type] || type;
  }

  levelText(level: string): string {
    const map: Record<string, string> = { critical: '极高', high: '高', medium: '中', low: '低' };
    return map[level] || level;
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

  teamBadgeClass(score: number): string {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    return 'high';
  }

  private loadTeamEvents(teamId: string): void {
    this.api.get<EventRecord[]>('/events/team/' + teamId).subscribe({
      next: d => { this.teamEvents = d; },
      error: () => {
        this.teamEvents = [
          { id: 'e1', type: 'collision', level: 'critical', forkliftId: 'f1', forkliftName: '叉车A01', personnelId: 'p1', personnelName: '张三', position: { x: 200, y: 180 }, description: '叉车与人员接近碰撞', timestamp: new Date(), duration: 15, teamId },
          { id: 'e2', type: 'speed_violation', level: 'medium', forkliftId: 'f2', forkliftName: '叉车A02', position: { x: 350, y: 250 }, description: '超速行驶', timestamp: new Date(Date.now() - 3600000), duration: 5, teamId },
          { id: 'e3', type: 'blindspot_intrusion', level: 'high', forkliftId: 'f1', forkliftName: '叉车A01', personnelId: 'p2', personnelName: '李四', position: { x: 280, y: 200 }, description: '人员进入盲区', timestamp: new Date(Date.now() - 7200000), duration: 10, teamId }
        ];
      }
    });
  }

  private mockTeams(): Team[] {
    return [
      {
        id: 't1', name: '冷藏一班', leader: '王强', shift: 'morning', eventCount: 3, safetyScore: 85,
        members: [
          { id: 'm1', name: '王强', role: 'supervisor', eventCount: 0 },
          { id: 'm2', name: '张三', role: 'operator', forkliftId: 'f1', eventCount: 2 },
          { id: 'm3', name: '赵六', role: 'worker', eventCount: 1 }
        ]
      },
      {
        id: 't2', name: '冷藏二班', leader: '刘明', shift: 'afternoon', eventCount: 5, safetyScore: 72,
        members: [
          { id: 'm4', name: '刘明', role: 'supervisor', eventCount: 0 },
          { id: 'm5', name: '李四', role: 'operator', forkliftId: 'f2', eventCount: 3 },
          { id: 'm6', name: '陈七', role: 'worker', eventCount: 2 }
        ]
      },
      {
        id: 't3', name: '夜班一组', leader: '周磊', shift: 'night', eventCount: 1, safetyScore: 95,
        members: [
          { id: 'm7', name: '周磊', role: 'supervisor', eventCount: 0 },
          { id: 'm8', name: '孙八', role: 'operator', forkliftId: 'f3', eventCount: 1 },
          { id: 'm9', name: '吴九', role: 'worker', eventCount: 0 }
        ]
      }
    ];
  }
}
