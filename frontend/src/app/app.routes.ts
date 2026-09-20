import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ===========================================================================
  // 1. PUBLIC MARKETING WEBSITE (SEYYON CONNECT)
  // ===========================================================================
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout.component').then(
        (c) => c.PublicLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/public/home/home.component').then(
            (c) => c.HomeComponent,
          ),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/public/about/about.component').then(
            (c) => c.AboutComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/public/products/products.component').then(
            (c) => c.ProductsComponent,
          ),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./features/public/pricing/pricing.component').then(
            (c) => c.PricingComponent,
          ),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/public/contact/contact.component').then(
            (c) => c.ContactComponent,
          ),
      },
      {
        path: 'blogs',
        loadComponent: () =>
          import('./features/public/blog/blog-list/blog-list.component').then(
            (c) => c.BlogListComponent,
          ),
      },
      {
        path: 'blogs/:slug',
        loadComponent: () =>
          import('./features/public/blog/blog-detail/blog-detail.component').then(
            (c) => c.BlogDetailComponent,
          ),
      },
    ],
  },

  // ===========================================================================
  // 2. AUTHENTICATION (LOGIN)
  // ===========================================================================
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

  // ===========================================================================
  // 3. AUTHENTICATED SAAS APPLICATION & DASHBOARD
  // ===========================================================================
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
        path: 'media',
        loadComponent: () =>
          import('./features/media/media.component').then(
            (c) => c.MediaComponent,
          ),
        canActivate: [roleGuard(['COMPANY_ADMIN'])],
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
        path: 'usage',
        loadComponent: () =>
          import('./features/usage/usage.component').then(
            (c) => c.UsageComponent,
          ),
      },
      {
        path: 'subscription',
        loadComponent: () =>
          import('./features/subscription/subscription.component').then(
            (c) => c.SubscriptionComponent,
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

  // Fallback Route
  { path: '**', redirectTo: '' },
];
