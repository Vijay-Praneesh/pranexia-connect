import { AsyncPipe, PercentPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DistributionChartComponent } from './components/distribution-chart/distribution-chart.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { DashboardSummary } from './dashboard.model';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    PercentPipe,
    DistributionChartComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    KpiCardComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly httpErrors = inject(HttpErrorService);
  readonly auth = inject(AuthService);

  summary: DashboardSummary | null = null;
  loading = true;
  refreshing = false;
  errorMessage = '';

  readonly campaignLabels = ['Draft', 'Scheduled', 'Running', 'Completed', 'Failed', 'Cancelled'];
  readonly campaignColors = ['#94a3b8', '#0dcaf0', '#4f46e5', '#198754', '#dc3545', '#6c757d'];

  get isEmpty(): boolean {
    return this.summary?.campaigns.total === 0 && this.summary.messages.totalRecipients === 0;
  }

  get campaignValues(): number[] {
    const campaigns = this.summary?.campaigns;
    return campaigns
      ? [campaigns.draft, campaigns.scheduled, campaigns.running, campaigns.completed, campaigns.failed, campaigns.cancelled]
      : [];
  }

  ngOnInit(): void {
    this.load();
  }

  refresh(): void {
    this.load(true);
  }

  private load(refresh = false): void {
    if (refresh) this.refreshing = true;
    else this.loading = true;
    this.errorMessage = '';

    this.dashboard.getSummary().pipe(
      finalize(() => {
        this.loading = false;
        this.refreshing = false;
      }),
    ).subscribe({
      next: (summary) => { this.summary = summary; },
      error: (error: unknown) => { this.errorMessage = this.httpErrors.map(error).message; },
    });
  }
}
