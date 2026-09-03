import { DatePipe, NgClass } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CompanyPlan } from '../companies/company.model';
import { OwnerDashboardService } from './owner-dashboard.service';
import { OwnerDashboardSummary } from './owner-dashboard.model';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    RouterLink,
    StatusBadgeComponent,
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.scss',
})
export class OwnerDashboardComponent implements OnInit {
  private readonly dashboard = inject(OwnerDashboardService);
  private readonly errors = inject(HttpErrorService);

  readonly plans: CompanyPlan[] = [
    'STARTER',
    'BUSINESS',
    'PROFESSIONAL',
    'ENTERPRISE',
  ];
  summary: OwnerDashboardSummary | null = null;
  loading = true;
  refreshing = false;
  errorMessage = '';

  ngOnInit(): void {
    this.load();
  }

  refresh(): void {
    this.load(true);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getActiveClientPercentage(): number {
    if (!this.summary?.companies.total) return 0;
    return Math.round(
      (this.summary.companies.active / this.summary.companies.total) * 100,
    );
  }

  getPlanPercentage(plan: CompanyPlan): number {
    if (!this.summary?.companies.total) return 0;
    return Math.round(
      ((this.summary.plans[plan] || 0) / this.summary.companies.total) * 100,
    );
  }

  getActiveUserPercentage(): number {
    if (!this.summary?.overview.totalUsers) return 0;
    return Math.round(
      (this.summary.overview.activeUsers / this.summary.overview.totalUsers) *
        100,
    );
  }

  getInactiveUsers(): number {
    if (!this.summary) return 0;
    return Math.max(
      0,
      this.summary.overview.totalUsers - this.summary.overview.activeUsers,
    );
  }

  getAvgUsersPerClient(): string {
    if (!this.summary?.companies.total || !this.summary?.overview.totalUsers)
      return '0.0';
    return (
      this.summary.overview.totalUsers / this.summary.companies.total
    ).toFixed(1);
  }

  getCompanyInitials(name: string): string {
    if (!name) return 'CO';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getPlanBadgeClass(plan: CompanyPlan): string {
    switch (plan) {
      case 'STARTER':
        return 'plan-badge-starter';
      case 'BUSINESS':
        return 'plan-badge-business';
      case 'PROFESSIONAL':
        return 'plan-badge-professional';
      case 'ENTERPRISE':
        return 'plan-badge-enterprise';
      default:
        return 'plan-badge-default';
    }
  }

  private load(refresh = false): void {
    if (refresh) this.refreshing = true;
    else this.loading = true;
    this.errorMessage = '';
    this.dashboard
      .getSummary()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        }),
      )
      .subscribe({
        next: (summary) => {
          this.summary = summary;
        },
        error: (error: unknown) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }
}
