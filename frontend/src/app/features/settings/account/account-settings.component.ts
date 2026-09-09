import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationModalService } from '../../../core/services/confirmation-modal.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { HttpErrorService } from '../../../core/services/http-error.service';
import { ToastService } from '../../../core/services/toast.service';
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
  readonly auth = inject(AuthService);
  readonly googleAuth = inject(GoogleAuthService);
  private readonly errors = inject(HttpErrorService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ConfirmationModalService);

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

  getUserInitials(user: AccountSettingsUser | null): string {
    if (!user || !user.firstName) return 'AD';
    const first = user.firstName.charAt(0);
    const last = user.lastName ? user.lastName.charAt(0) : '';
    return (first + last).toUpperCase() || 'AD';
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Owner / Super Admin';
      case 'COMPANY_ADMIN':
        return 'Company Administrator';
      case 'MANAGER':
        return 'Manager';
      case 'EMPLOYEE':
        return 'Team Member';
      default:
        return role ? role.replaceAll('_', ' ') : 'User';
    }
  }

  logout(): void {
    this.auth.logout();
  }

  confirmLogout(): void {
    void this.modal
      .confirm({
        title: 'Sign Out',
        message: 'Are you sure you want to end your current session? You will need to log in again to access Seyyon Connect.',
        confirmText: 'Sign Out',
        cancelText: 'Stay Logged In',
        variant: 'danger',
        icon: 'bi-box-arrow-right',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.logout();
        }
      });
  }

  refresh(): void {
    if (this.loading || this.user?.role !== 'COMPANY_ADMIN') return;
    this.loading = true;
    this.errorMessage = '';
    this.api
      .getCurrentUser()
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.toast.success('Account information refreshed successfully.');
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  linkGoogle(): void {
    if (this.linkingGoogle) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.googleAuth.isConfigured()) {
      this.errorMessage = 'Google Sign-In is not configured on this environment.';
      this.toast.warning(this.errorMessage);
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
            this.toast.success('Google account successfully linked!');
          },
          error: (error) => {
            this.errorMessage = this.errors.map(error).message;
            this.toast.error(this.errorMessage);
          },
        });
    }).then((ready) => {
      if (!ready) {
        this.linkingGoogle = false;
        this.errorMessage = 'Could not load Google Sign-In SDK.';
        this.toast.error(this.errorMessage);
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
          this.toast.success('Google account disconnected successfully.');
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
          this.toast.error(this.errorMessage);
        },
      });
  }

  confirmUnlinkGoogle(): void {
    void this.modal
      .confirm({
        title: 'Disconnect Google Account',
        message: 'Are you sure you want to unlink your Google Account? You will no longer be able to use Google Single Sign-On until you re-link it.',
        confirmText: 'Disconnect',
        cancelText: 'Cancel',
        variant: 'warning',
        icon: 'bi-google',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.unlinkGoogle();
        }
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
