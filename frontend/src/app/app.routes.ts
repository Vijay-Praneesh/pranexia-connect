import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(
        (c) => c.AuthLayoutComponent,
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(
            (c) => c.LoginComponent,
          ),
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/app-layout/app-layout.component').then(
        (c) => c.AppLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (c) => c.DashboardComponent,
          ),
      },
      {
        path: 'owner-dashboard',
        loadComponent: () =>
          import('./features/owner-dashboard/owner-dashboard.component').then(
            (c) => c.OwnerDashboardComponent,
          ),
        canActivate: [roleGuard(['SUPER_ADMIN'])],
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./features/companies/companies.component').then(
            (c) => c.CompaniesComponent,
          ),
        canActivate: [roleGuard(['SUPER_ADMIN'])],
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/customers.component').then(
            (c) => c.CustomersComponent,
          ),
      },
      {
        path: 'templates',
        loadComponent: () =>
          import('./features/templates/templates.component').then(
            (c) => c.TemplatesComponent,
          ),
      },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./features/campaigns/campaigns.component').then(
            (c) => c.CampaignsComponent,
          ),
      },
      {
        path: 'settings/whatsapp',
        loadComponent: () =>
          import('./features/settings/whatsapp/whatsapp-settings.component').then(
            (c) => c.WhatsAppSettingsComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then(
            (c) => c.ReportsComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/account/account-settings.component').then(
            (c) => c.AccountSettingsComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (c) => c.NotificationsComponent,
          ),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
