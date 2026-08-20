import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorService } from '../../../core/services/http-error.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AccountSettingsUser, SettingsCapabilities } from './account-settings.model';
import { AccountSettingsService } from './account-settings.service';

@Component({ selector: 'app-account-settings', standalone: true,
  imports: [DatePipe, ErrorStateComponent, LoadingStateComponent, StatusBadgeComponent],
  templateUrl: './account-settings.component.html', styleUrl: './account-settings.component.scss' })
export class AccountSettingsComponent {
  private readonly api = inject(AccountSettingsService); private readonly auth = inject(AuthService); private readonly errors = inject(HttpErrorService);
  user: AccountSettingsUser | null = this.auth.getCurrentUser(); loading = false; errorMessage = '';
  readonly capabilities: SettingsCapabilities = { profileEditing: false, companyEditing: false, teamManagement: false, preferences: false };
  activeTab: 'account' | 'company' | 'team' | 'preferences' = 'account';

  constructor() { if (this.user?.role === 'COMPANY_ADMIN') this.refresh(); }

  refresh(): void {
    if (this.loading || this.user?.role !== 'COMPANY_ADMIN') return;
    this.loading = true; this.errorMessage = '';
    this.api.getCurrentUser().pipe(finalize(() => { this.loading = false; })).subscribe({ next: (user) => { this.user = user; }, error: (error) => { this.errorMessage = this.errors.map(error).message; } });
  }

  selectTab(tab: typeof this.activeTab): void { this.activeTab = tab; }
}
