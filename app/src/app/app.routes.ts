import { Routes } from '@angular/router';

/** The original Poteci navigation: dashboard -> trails/:type -> detail/:code. */
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage) },
  { path: 'trails/:type', loadComponent: () => import('./pages/trails/trails').then(m => m.TrailsPage) },
  { path: 'detail/:code', loadComponent: () => import('./pages/trail-detail/trail-detail').then(m => m.TrailDetailPage) },
  { path: '**', redirectTo: 'dashboard' }
];
