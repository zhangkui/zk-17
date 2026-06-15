import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">CS</div>
          <div class="logo-text">冷库叉车<br>盲区预警平台</div>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: false}" class="nav-item">
            <span class="nav-icon">📊</span>
            <span>实时监控</span>
          </a>
          <a routerLink="/zone-modeling" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🗺️</span>
            <span>区域建模</span>
          </a>
          <a routerLink="/blind-spot" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👁️</span>
            <span>盲区识别</span>
          </a>
          <a routerLink="/collision-warning" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⚠️</span>
            <span>碰撞预警</span>
          </a>
          <a routerLink="/event-replay" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🔄</span>
            <span>事件回放</span>
          </a>
          <a routerLink="/team-archive" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👥</span>
            <span>班组归档</span>
          </a>
          <a routerLink="/statistics" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📈</span>
            <span>统计分析</span>
          </a>
        </nav>
      </aside>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    if (this.router.url === '/') {
      this.router.navigate(['/dashboard']);
    }
  }
}
