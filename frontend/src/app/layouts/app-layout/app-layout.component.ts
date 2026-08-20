import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthorizationFeedbackService } from '../../core/services/authorization-feedback.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="border-bottom bg-white">
      <div class="container-fluid d-flex align-items-center justify-content-between gap-3 py-3">
        <a class="brand-link fw-semibold" routerLink="/dashboard">Pranexia Connect</a>
        @if (auth.currentUser$ | async; as user) {
          <div class="d-flex align-items-center gap-3">
            <span class="d-none d-sm-inline text-body-secondary">{{ user.firstName }} · {{ user.company.companyName }}</span>
            <a class="btn btn-link btn-sm" routerLink="/notifications" aria-label="Notifications and activity"><i class="bi bi-bell" aria-hidden="true"></i></a>
            <a class="btn btn-link btn-sm d-none d-md-inline-flex" routerLink="/reports"><i class="bi bi-bar-chart me-1" aria-hidden="true"></i>Reports</a>
            <a class="btn btn-link btn-sm d-none d-lg-inline-flex" routerLink="/settings/whatsapp"><i class="bi bi-whatsapp me-1" aria-hidden="true"></i>WhatsApp settings</a>
            <a class="btn btn-link btn-sm d-none d-xl-inline-flex" routerLink="/settings"><i class="bi bi-gear me-1" aria-hidden="true"></i>Account settings</a>
            <button class="btn btn-outline-secondary btn-sm" type="button" (click)="auth.logout()">
              <i class="bi bi-box-arrow-right me-1" aria-hidden="true"></i>Logout
            </button>
          </div>
        }
      </div>
      <nav class="primary-nav container-fluid" aria-label="Primary navigation">
        @for (item of navigation; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <i class="bi {{ item.icon }}" aria-hidden="true"></i>{{ item.label }}
          </a>
        }
      </nav>
    </header>
    <main class="container-fluid py-4">
      @if (feedback.message$ | async; as message) {
        <div class="alert alert-warning alert-dismissible" role="alert">
          {{ message }}
          <button class="btn-close" type="button" aria-label="Dismiss" (click)="feedback.clear()"></button>
        </div>
      }
      <router-outlet />
    </main>
  `,
  styles: [`
    .brand-link { color: inherit; text-decoration: none; white-space: nowrap; }
    .primary-nav { display: flex; gap: .25rem; overflow-x: auto; padding-bottom: .75rem; scrollbar-width: thin; }
    .primary-nav a { display: inline-flex; align-items: center; gap: .4rem; padding: .45rem .7rem; border-radius: .45rem; color: var(--bs-secondary-color); text-decoration: none; white-space: nowrap; }
    .primary-nav a:hover, .primary-nav a:focus-visible { color: var(--bs-primary); background: var(--bs-primary-bg-subtle); }
    .primary-nav a.active { color: white; background: var(--bs-primary); }
    @media (max-width: 575.98px) { header > .container-fluid { align-items: flex-start !important; } }
  `],
})
export class AppLayoutComponent {
  readonly auth = inject(AuthService);
  readonly feedback = inject(AuthorizationFeedbackService);
  readonly navigation = [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-grid' },
    { path: '/customers', label: 'Customers', icon: 'bi-people' },
    { path: '/templates', label: 'Templates', icon: 'bi-chat-square-text' },
    { path: '/campaigns', label: 'Campaigns', icon: 'bi-megaphone' },
    { path: '/reports', label: 'Reports', icon: 'bi-bar-chart' },
    { path: '/notifications', label: 'Activity', icon: 'bi-bell' },
    { path: '/settings', label: 'Settings', icon: 'bi-gear' },
    { path: '/settings/whatsapp', label: 'WhatsApp', icon: 'bi-whatsapp' },
  ] as const;
}
