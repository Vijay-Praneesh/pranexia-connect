import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { KpiCardComponent } from '../dashboard/components/kpi-card/kpi-card.component';
import { UsageHistoryItem, UsageSummary } from './usage.model';
import { UsageService } from './usage.service';

@Component({
  selector: 'app-usage',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    FormsModule,
    EmptyStateComponent,
    ErrorStateComponent,
    KpiCardComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './usage.component.html',
  styleUrl: './usage.component.scss',
})
export class UsageComponent implements OnInit {
  private readonly usageService = inject(UsageService);
  private readonly httpErrors = inject(HttpErrorService);
  readonly auth = inject(AuthService);

  summary: UsageSummary | null = null;
  history: UsageHistoryItem[] = [];
  selectedPeriod = '';
  availablePeriods: string[] = [];

  loading = true;
  refreshing = false;
  syncingMeta = false;
  errorMessage = '';
  metaFeedbackMessage = '';
  metaFeedbackTone: 'success' | 'info' | 'warning' = 'info';

  get isSuperAdmin(): boolean {
    return this.auth.getCurrentUser()?.role === 'SUPER_ADMIN';
  }

  get isCompanyAdmin(): boolean {
    return this.auth.getCurrentUser()?.role === 'COMPANY_ADMIN';
  }

  get deliveryRate(): number {
    const sent = this.summary?.saas.messages.sent || 0;
    const delivered = this.summary?.saas.messages.delivered || 0;
    return sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  }

  get readRate(): number {
    const sent = this.summary?.saas.messages.sent || 0;
    const read = this.summary?.saas.messages.read || 0;
    return sent > 0 ? Math.round((read / sent) * 100) : 0;
  }

  ngOnInit(): void {
    this.initPeriods();
    this.loadData();
  }

  initPeriods(): void {
    const periods: string[] = [];
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();

    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(currentYear, currentMonth - i, 1));
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      periods.push(`${year}-${month}`);
    }

    this.availablePeriods = periods;
    this.selectedPeriod = periods[0];
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.loadData(true);
  }

  refresh(): void {
    this.loadData(true);
  }

  syncMeta(): void {
    if (this.syncingMeta) return;

    this.syncingMeta = true;
    this.metaFeedbackMessage = '';

    this.usageService
      .syncMetaUsage(this.selectedPeriod)
      .pipe(
        finalize(() => {
          this.syncingMeta = false;
        })
      )
      .subscribe({
        next: (result) => {
          this.metaFeedbackMessage = result.message;
          this.metaFeedbackTone = result.status === 'SYNCED' ? 'success' : 'warning';
          // Reload summary to reflect newly synced data
          this.loadData(true);
        },
        error: (error: unknown) => {
          this.metaFeedbackMessage = this.httpErrors.map(error).message;
          this.metaFeedbackTone = 'warning';
        },
      });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${formatted} ${sizes[i]}`;
  }

  formatPeriodLabel(periodStr: string): string {
    if (!periodStr) return '';
    const [year, month] = periodStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  private loadData(refresh = false): void {
    if (refresh) this.refreshing = true;
    else this.loading = true;
    this.errorMessage = '';

    forkJoin({
      summary: this.usageService.getSummary(this.selectedPeriod),
      history: this.usageService.getHistory(12),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        })
      )
      .subscribe({
        next: ({ summary, history }) => {
          this.summary = summary;
          this.history = history;
        },
        error: (error: unknown) => {
          this.errorMessage = this.httpErrors.map(error).message;
        },
      });
  }
}
