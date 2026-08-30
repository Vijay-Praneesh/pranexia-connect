import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { KpiCardComponent } from '../dashboard/components/kpi-card/kpi-card.component';
import { CompanyPlan } from '../companies/company.model';
import { OwnerDashboardService } from './owner-dashboard.service';
import { OwnerDashboardSummary } from './owner-dashboard.model';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [DatePipe, EmptyStateComponent, ErrorStateComponent, KpiCardComponent, LoadingStateComponent, RouterLink, StatusBadgeComponent],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.scss',
})
export class OwnerDashboardComponent implements OnInit {
  private readonly dashboard = inject(OwnerDashboardService);
  private readonly errors = inject(HttpErrorService);

  readonly plans: CompanyPlan[] = ['STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE'];
  summary: OwnerDashboardSummary | null = null;
  loading = true;
  refreshing = false;
  errorMessage = '';

  ngOnInit(): void { this.load(); }
  refresh(): void { this.load(true); }

  private load(refresh = false): void {
    if (refresh) this.refreshing = true; else this.loading = true;
    this.errorMessage = '';
    this.dashboard.getSummary().pipe(finalize(() => { this.loading = false; this.refreshing = false; })).subscribe({
      next: (summary) => { this.summary = summary; },
      error: (error: unknown) => { this.errorMessage = this.errors.map(error).message; },
    });
  }
}
