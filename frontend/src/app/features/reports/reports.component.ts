import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';

import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ReportCampaign, ReportStatistics, RecipientReportRow, RecipientReportStatus } from './report.model';
import { ReportsService } from './reports.service';

@Component({ selector: 'app-reports', standalone: true,
  imports: [DatePipe, ReactiveFormsModule, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, PaginationComponent, StatusBadgeComponent],
  templateUrl: './reports.component.html', styleUrl: './reports.component.scss' })
export class ReportsComponent implements OnDestroy {
  private readonly api = inject(ReportsService); private readonly errors = inject(HttpErrorService); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>(); private pollHandle?: ReturnType<typeof setInterval>;
  campaigns: ReportCampaign[] = []; selectedCampaign: ReportCampaign | null = null; report: ReportStatistics | null = null; recipients: RecipientReportRow[] = [];
  campaignId = ''; recipientStatus = ''; recipientPage = 1; recipientTotalPages = 0; recipientTotalRecords = 0;
  campaignsLoading = true; reportLoading = false; recipientLoading = false; errorMessage = '';
  readonly statuses: RecipientReportStatus[] = ['PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'];
  readonly selectionForm = this.fb.nonNullable.group({ campaignId: [''], status: [''] });

  constructor() {
    this.selectionForm.controls.campaignId.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((campaignId) => void this.updateQuery({ campaignId: campaignId || null, page: 1 }));
    this.selectionForm.controls.status.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((status) => void this.updateQuery({ status: status || null, page: 1 }));
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.campaignId = params.get('campaignId') ?? ''; this.recipientStatus = params.get('status') ?? ''; this.recipientPage = Math.max(1, Number(params.get('page')) || 1);
      this.selectionForm.setValue({ campaignId: this.campaignId, status: this.recipientStatus }, { emitEvent: false });
      if (!this.campaigns.length) this.loadCampaigns(); else this.selectAndLoad();
    });
  }
  ngOnDestroy(): void { this.stopPolling(); this.destroy$.next(); this.destroy$.complete(); }

  loadCampaigns(): void { this.campaignsLoading = true; this.errorMessage = ''; this.api.getCampaigns().pipe(finalize(() => { this.campaignsLoading = false; })).subscribe({ next: (data) => { this.campaigns = data.campaigns; this.selectAndLoad(); }, error: (error) => { this.errorMessage = this.errors.map(error).message; } }); }
  refresh(): void { if (this.campaignId) this.loadReport(); else this.loadCampaigns(); }
  changePage(page: number): void { void this.updateQuery({ page }); }

  private selectAndLoad(): void {
    this.stopPolling(); this.selectedCampaign = this.campaigns.find((campaign) => campaign.id === this.campaignId) ?? null;
    if (!this.campaignId || !this.selectedCampaign) { this.report = null; this.recipients = []; this.recipientTotalPages = 0; return; }
    this.loadReport();
  }
  loadReport(silent = false): void {
    if (!this.campaignId) return; if (!silent) { this.reportLoading = true; this.recipientLoading = true; } this.errorMessage = '';
    forkJoin({ report: this.api.getCampaignReport(this.campaignId), recipients: this.api.getRecipients({ campaignId: this.campaignId, page: this.recipientPage, limit: 10, sortBy: 'createdAt', order: 'DESC', status: this.recipientStatus as RecipientReportStatus || undefined }) })
      .pipe(finalize(() => { if (!silent) { this.reportLoading = false; this.recipientLoading = false; } })).subscribe({
        next: ({ report, recipients }) => { this.report = report; this.recipients = recipients.recipients; this.recipientTotalPages = recipients.pagination.totalPages; this.recipientTotalRecords = recipients.pagination.totalRecords; this.configurePolling(); },
        error: (error) => { if (!silent) this.errorMessage = this.errors.map(error).message; },
      });
  }
  private configurePolling(): void { this.stopPolling(); if (this.report?.status === 'SCHEDULED' || this.report?.status === 'RUNNING') this.pollHandle = setInterval(() => this.loadReport(true), 15000); }
  private stopPolling(): void { if (this.pollHandle) clearInterval(this.pollHandle); this.pollHandle = undefined; }
  private updateQuery(query: Record<string, string | number | null>): Promise<boolean> { return this.router.navigate([], { relativeTo: this.route, queryParams: query, queryParamsHandling: 'merge' }); }
}

