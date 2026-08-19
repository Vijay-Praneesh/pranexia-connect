import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then((c) => c.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then((c) => c.LoginComponent),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/app-layout/app-layout.component').then((c) => c.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((c) => c.DashboardComponent),
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers-placeholder.component').then((c) => c.CustomersPlaceholderComponent),
      },
      {
        path: 'templates',
        loadComponent: () => import('./features/templates/templates-placeholder.component').then((c) => c.TemplatesPlaceholderComponent),
      },
      {
        path: 'campaigns',
        loadComponent: () => import('./features/campaigns/campaigns-placeholder.component').then((c) => c.CampaignsPlaceholderComponent),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
