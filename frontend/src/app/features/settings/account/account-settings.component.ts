import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { HttpErrorService } from '../../../core/services/http-error.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AccountSettingsUser, SettingsCapabilities } from './account-settings.model';
import { AccountSettingsService } from './account-settings.service';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [DatePipe, ErrorStateComponent, LoadingStateComponent, StatusBadgeComponent],
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.scss',
})
export class AccountSettingsComponent {
  private readonly api = inject(AccountSettingsService);
  private readonly auth = inject(AuthService);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly errors = inject(HttpErrorService);

  user: AccountSettingsUser | null = this.auth.getCurrentUser();
  loading = false;
  linkingGoogle = false;
  errorMessage = '';
  successMessage = '';

  readonly capabilities: SettingsCapabilities = {
    profileEditing: false,
    companyEditing: false,
    teamManagement: false,
    preferences: false,
  };

  activeTab: 'account' | 'company' | 'team' | 'preferences' = 'account';

  constructor() {
    if (this.user?.role === 'COMPANY_ADMIN') this.refresh();
  }

  refresh(): void {
    if (this.loading || this.user?.role !== 'COMPANY_ADMIN') return;
    this.loading = true;
    this.errorMessage = '';
    this.api
      .getCurrentUser()
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (user) => { this.user = user; },
        error: (error) => { this.errorMessage = this.errors.map(error).message; },
      });
  }

  linkGoogle(): void {
    if (this.linkingGoogle) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.googleAuth.isConfigured()) {
      this.errorMessage = 'Google Sign-In is not configured on this environment.';
      return;
    }

    this.linkingGoogle = true;
    void this.googleAuth.initializeGoogleId((credential) => {
      this.auth
        .linkGoogle(credential)
        .pipe(finalize(() => { this.linkingGoogle = false; }))
        .subscribe({
          next: (updatedUser) => {
            this.user = updatedUser;
            this.successMessage = 'Google account successfully linked!';
          },
          error: (error) => {
            this.errorMessage = this.errors.map(error).message;
          },
        });
    }).then((ready) => {
      if (!ready) {
        this.linkingGoogle = false;
        this.errorMessage = 'Could not load Google Sign-In SDK.';
      }
    });
  }

  unlinkGoogle(): void {
    if (this.linkingGoogle) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.linkingGoogle = true;

    this.auth
      .unlinkGoogle()
      .pipe(finalize(() => { this.linkingGoogle = false; }))
      .subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          this.successMessage = 'Google account disconnected successfully.';
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  selectTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  handleTabKey(event: KeyboardEvent, tab: typeof this.activeTab): void {
    const tabs: Array<typeof this.activeTab> = ['account', 'company', 'team', 'preferences'];
    const current = tabs.indexOf(tab);
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    this.selectTab(tabs[next]);
    document.getElementById(`${tabs[next]}-tab`)?.focus();
  }
}

