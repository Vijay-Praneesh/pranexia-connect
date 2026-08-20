import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthorizationFeedbackService } from '../../core/services/authorization-feedback.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [AsyncPipe, RouterLink, RouterOutlet],
  template: `
    <header class="border-bottom bg-white">
      <div class="container-fluid d-flex align-items-center justify-content-between gap-3 py-3">
        <span class="fw-semibold">Pranexia Connect</span>
        @if (auth.currentUser$ | async; as user) {
          <div class="d-flex align-items-center gap-3">
            <span class="d-none d-sm-inline text-body-secondary">{{ user.firstName }} · {{ user.company.companyName }}</span>
            <a class="btn btn-link btn-sm d-none d-md-inline-flex" routerLink="/reports"><i class="bi bi-bar-chart me-1" aria-hidden="true"></i>Reports</a>
            <a class="btn btn-link btn-sm d-none d-lg-inline-flex" routerLink="/settings/whatsapp"><i class="bi bi-whatsapp me-1" aria-hidden="true"></i>WhatsApp settings</a>
            <a class="btn btn-link btn-sm d-none d-xl-inline-flex" routerLink="/settings"><i class="bi bi-gear me-1" aria-hidden="true"></i>Account settings</a>
            <button class="btn btn-outline-secondary btn-sm" type="button" (click)="auth.logout()">
              <i class="bi bi-box-arrow-right me-1" aria-hidden="true"></i>Logout
            </button>
          </div>
        }
      </div>
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
})
export class AppLayoutComponent {
  readonly auth = inject(AuthService);
  readonly feedback = inject(AuthorizationFeedbackService);
}
