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
import { CompanyPlanOverview, WarningThresholdStatus } from '../plans/plan.model';
import {
  SubscriptionHistoryItem,
  SubscriptionInfo,
} from './subscription.model';
import { SubscriptionService } from './subscription.service';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    FormsModule,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss',
})
export class SubscriptionComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly httpErrors = inject(HttpErrorService);
  readonly auth = inject(AuthService);
  readonly Math = Math;

  subscription: SubscriptionInfo | null = null;
  planOverview: CompanyPlanOverview | null = null;
  history: SubscriptionHistoryItem[] = [];

  loading = true;
  refreshing = false;
  errorMessage = '';
  feedbackMessage = '';
  feedbackTone: 'success' | 'warning' | 'info' = 'info';
  showPlanComparison = false;

  get isSuperAdmin(): boolean {
    return this.auth.getCurrentUser()?.role === 'SUPER_ADMIN';
  }

  get isTrialing(): boolean {
    return this.subscription?.status === 'TRIALING';
  }

  get isCancelled(): boolean {
    return (
      this.subscription?.status === 'CANCELLED' ||
      Boolean(this.subscription?.cancelAtPeriodEnd)
    );
  }

  get isExpired(): boolean {
    return this.subscription?.status === 'EXPIRED';
  }

  get daysRemainingInPeriod(): number {
    if (!this.subscription?.currentPeriodEnd) return 0;
    const diff = new Date(this.subscription.currentPeriodEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get trialDaysRemaining(): number {
    if (!this.subscription?.trialEnd) return 0;
    const diff = new Date(this.subscription.trialEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.loadData(true);
  }

  togglePlanComparison(): void {
    this.showPlanComparison = !this.showPlanComparison;
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${formatted} ${sizes[i]}`;
  }

  getProgressBarClass(status: WarningThresholdStatus): string {
    switch (status) {
      case 'OVER_LIMIT':
      case 'EXHAUSTED':
        return 'bg-danger';
      case 'CRITICAL':
        return 'bg-warning text-dark';
      case 'WARNING':
        return 'bg-info text-dark';
      default:
        return 'bg-primary';
    }
  }

  private loadData(refresh = false): void {
    if (refresh) this.refreshing = true;
    else this.loading = true;
    this.errorMessage = '';

    forkJoin({
      current: this.subscriptionService.getCurrentSubscription(),
      history: this.subscriptionService.getSubscriptionHistory(25),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        })
      )
      .subscribe({
        next: ({ current, history }) => {
          this.subscription = current.subscription;
          this.planOverview = current.planOverview;
          this.history = history;
        },
        error: (error: unknown) => {
          this.errorMessage = this.httpErrors.map(error).message;
        },
      });
  }
}
