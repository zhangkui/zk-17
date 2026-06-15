import { ApplicationConfig } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'zone-modeling', loadComponent: () => import('./features/zone-modeling/zone-modeling.component').then(m => m.ZoneModelingComponent) },
  { path: 'blind-spot', loadComponent: () => import('./features/blind-spot/blind-spot.component').then(m => m.BlindSpotComponent) },
  { path: 'collision-warning', loadComponent: () => import('./features/collision-warning/collision-warning.component').then(m => m.CollisionWarningComponent) },
  { path: 'event-replay', loadComponent: () => import('./features/event-replay/event-replay.component').then(m => m.EventReplayComponent) },
  { path: 'team-archive', loadComponent: () => import('./features/team-archive/team-archive.component').then(m => m.TeamArchiveComponent) },
  { path: 'statistics', loadComponent: () => import('./features/statistics/statistics.component').then(m => m.StatisticsComponent) },
  { path: '**', redirectTo: 'dashboard' }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
};
