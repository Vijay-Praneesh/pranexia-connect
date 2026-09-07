import { AsyncPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { Campaign } from '../campaigns/campaign.model';
import { CampaignService } from '../campaigns/campaign.service';
import { CustomerDashboardStatistics } from '../customers/customer.model';
import { CustomerService } from '../customers/customer.service';
import { DistributionChartComponent } from './components/distribution-chart/distribution-chart.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { DashboardSummary } from './dashboard.model';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    PercentPipe,
    RouterLink,
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
  private readonly dashboardApi = inject(DashboardService);
  private readonly campaignApi = inject(CampaignService, { optional: true });
  private readonly customerApi = inject(CustomerService, { optional: true });
  private readonly httpErrors = inject(HttpErrorService);
  readonly auth = inject(AuthService);

  summary: DashboardSummary | null = null;
  recentCampaigns: Campaign[] = [];
  customerStats: CustomerDashboardStatistics | null = null;
  loading = true;
  refreshing = false;
  errorMessage = '';

  readonly campaignLabels = [
    'Draft',
    'Scheduled',
    'Running',
    'Completed',
    'Failed',
    'Cancelled',
  ];
  readonly campaignColors = [
    '#94a3b8',
    '#0284c7',
    '#4338ca',
    '#10b981',
    '#dc2626',
    '#64748b',
  ];

  get isEmpty(): boolean {
    return (
      this.summary?.campaigns.total === 0 &&
      this.summary.messages.totalRecipients === 0
    );
  }

  get campaignValues(): number[] {
    const campaigns = this.summary?.campaigns;
    return campaigns
      ? [
          campaigns.draft,
          campaigns.scheduled,
          campaigns.running,
          campaigns.completed,
          campaigns.failed,
          campaigns.cancelled,
        ]
      : [];
  }

  get deliveryPercentage(): number {
    return (this.summary?.performance.deliveryRate || 0) / 100;
  }

  get readPercentage(): number {
    return (this.summary?.performance.readRate || 0) / 100;
  }

  get failurePercentage(): number {
    return (this.summary?.performance.failureRate || 0) / 100;
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

    const summary$ = this.dashboardApi.getSummary();
    const campaigns$ = this.campaignApi
      ? this.campaignApi.getCampaigns({ page: 1, limit: 5 }).pipe(
          catchError(() => of({ campaigns: [], pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 5 } }))
        )
      : of({ campaigns: [], pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 5 } });
    const customerStats$ = this.customerApi
      ? this.customerApi.getDashboardStats().pipe(catchError(() => of(null)))
      : of(null);

    forkJoin({
      summary: summary$,
      campaignData: campaigns$,
      customerStats: customerStats$,
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        })
      )
      .subscribe({
        next: (data) => {
          this.summary = data.summary;
          this.recentCampaigns = data.campaignData.campaigns || [];
          this.customerStats = data.customerStats;
        },
        error: (error: unknown) => {
          this.errorMessage = this.httpErrors.map(error).message;
        },
      });
  }
}
