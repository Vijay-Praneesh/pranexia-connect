import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import type { Chart } from 'chart.js';

import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../core/services/toast.service';
import { RecipientReportRow, RecipientReportStatus, ReportCampaign, ReportStatistics } from './report.model';
import { ReportsService } from './reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnDestroy, AfterViewChecked {
  private readonly api = inject(ReportsService);
  private readonly errors = inject(HttpErrorService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  private readonly destroy$ = new Subject<void>();
  private pollHandle?: ReturnType<typeof setInterval>;

  @ViewChild('deliveryChartCanvas') deliveryChartCanvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart<'doughnut'>;
  private chartNeedsUpdate = false;

  campaigns: ReportCampaign[] = [];
  selectedCampaign: ReportCampaign | null = null;
  report: ReportStatistics | null = null;
  recipients: RecipientReportRow[] = [];

  campaignId = '';
  recipientStatus = '';
  recipientPage = 1;
  recipientTotalPages = 0;
  recipientTotalRecords = 0;

  campaignsLoading = true;
  reportLoading = false;
  recipientLoading = false;
  exporting = false;
  errorMessage = '';

  readonly statuses: RecipientReportStatus[] = [
    'PENDING',
    'QUEUED',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED',
  ];

  readonly selectionForm = this.fb.nonNullable.group({
    campaignId: [''],
    status: [''],
  });

  constructor() {
    this.selectionForm.controls.campaignId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((campaignId) => {
        void this.updateQuery({ campaignId: campaignId || null, page: 1 });
      });

    this.selectionForm.controls.status.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        void this.updateQuery({ status: status || null, page: 1 });
      });

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.campaignId = params.get('campaignId') ?? '';
        this.recipientStatus = params.get('status') ?? '';
        this.recipientPage = Math.max(1, Number(params.get('page')) || 1);
        this.selectionForm.setValue(
          { campaignId: this.campaignId, status: this.recipientStatus },
          { emitEvent: false }
        );
        if (!this.campaigns.length) {
          this.loadCampaigns();
        } else {
          this.selectAndLoad();
        }
      });
  }

  ngAfterViewChecked(): void {
    if (this.chartNeedsUpdate && this.deliveryChartCanvas && this.report) {
      this.chartNeedsUpdate = false;
      void this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.chart?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCampaigns(): void {
    this.campaignsLoading = true;
    this.errorMessage = '';
    this.api
      .getCampaigns()
      .pipe(
        finalize(() => {
          this.campaignsLoading = false;
        })
      )
      .subscribe({
        next: (data) => {
          this.campaigns = data.campaigns;
          this.selectAndLoad();
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  refresh(): void {
    if (this.campaignId) {
      this.loadReport();
    } else {
      this.loadCampaigns();
    }
  }

  changePage(page: number): void {
    void this.updateQuery({ page });
  }

  selectCampaignDirectly(id: string): void {
    this.selectionForm.controls.campaignId.setValue(id);
  }

  filterByStatus(status: string): void {
    this.selectionForm.controls.status.setValue(status);
  }

  private selectAndLoad(): void {
    this.stopPolling();
    this.selectedCampaign =
      this.campaigns.find((campaign) => campaign.id === this.campaignId) ?? null;
    if (!this.campaignId || !this.selectedCampaign) {
      this.report = null;
      this.recipients = [];
      this.recipientTotalPages = 0;
      this.recipientTotalRecords = 0;
      this.chart?.destroy();
      return;
    }
    this.loadReport();
  }

  loadReport(silent = false): void {
    if (!this.campaignId) return;
    if (!silent) {
      this.reportLoading = true;
      this.recipientLoading = true;
    }
    this.errorMessage = '';

    forkJoin({
      report: this.api.getCampaignReport(this.campaignId),
      recipients: this.api.getRecipients({
        campaignId: this.campaignId,
        page: this.recipientPage,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
        status: (this.recipientStatus as RecipientReportStatus) || undefined,
      }),
    })
      .pipe(
        finalize(() => {
          if (!silent) {
            this.reportLoading = false;
            this.recipientLoading = false;
          }
        })
      )
      .subscribe({
        next: ({ report, recipients }) => {
          this.report = report;
          this.recipients = recipients.recipients;
          this.recipientTotalPages = recipients.pagination.totalPages;
          this.recipientTotalRecords = recipients.pagination.totalRecords;
          this.chartNeedsUpdate = true;
          this.configurePolling();
        },
        error: (error) => {
          if (!silent) {
            this.errorMessage = this.errors.map(error).message;
          }
        },
      });
  }

  private configurePolling(): void {
    this.stopPolling();
    if (this.report?.status === 'SCHEDULED' || this.report?.status === 'RUNNING') {
      this.pollHandle = setInterval(() => this.loadReport(true), 15000);
    }
  }

  private stopPolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = undefined;
    }
  }

  private updateQuery(
    query: Record<string, string | number | null>
  ): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query,
      queryParamsHandling: 'merge',
    });
  }

  // ===========================================================================
  // Chart.js Delivery Breakdown Doughnut Chart
  // ===========================================================================
  private async renderChart(): Promise<void> {
    if (!this.deliveryChartCanvas || !this.report) return;
    const { default: Chart } = await import('chart.js/auto');

    this.chart?.destroy();

    const delivered = this.report.deliveredCount || 0;
    const read = this.report.readCount || 0;
    const sentOnly = Math.max(0, (this.report.sentCount || 0) - delivered);
    const failed = this.report.failedCount || 0;
    const pending = Math.max(
      0,
      (this.report.totalRecipients || 0) -
        (this.report.sentCount || 0) -
        failed
    );

    const labels = ['Read Messages', 'Delivered (Unread)', 'Sent / In-Flight', 'Failed', 'Pending'];
    const values = [read, Math.max(0, delivered - read), sentOnly, failed, pending];
    const colors = ['#2563EB', '#10B981', '#6366F1', '#EF4444', '#94A3B8'];

    const total = values.reduce((sum, val) => sum + val, 0);
    const hasData = total > 0;

    const chartLabels = hasData ? labels : ['No Data'];
    const chartValues = hasData ? values : [1];
    const chartColors = hasData ? colors : ['#E2E8F0'];

    this.chart = new Chart(this.deliveryChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartValues,
            backgroundColor: chartColors,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            hoverOffset: hasData ? 6 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        animation: {
          duration: 600,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: hasData,
            backgroundColor: '#0F1B3D',
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const count = context.parsed || 0;
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                return ` ${context.label}: ${count.toLocaleString()} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  // ===========================================================================
  // CSV Export
  // ===========================================================================
  exportCsv(): void {
    if (!this.report || !this.recipients.length) {
      this.toast.info('No recipient records available to export for this view.');
      return;
    }

    this.exporting = true;
    try {
      const headers = [
        'Customer Name',
        'Mobile Number',
        'Status',
        'Sent At',
        'Delivered At',
        'Read At',
        'Failure Reason',
        'WhatsApp Message ID',
      ];

      const rows = this.recipients.map((r) => {
        const name = `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}`.trim() || 'Unknown';
        const mobile = r.customer?.mobile || '';
        const status = r.status || '';
        const sentAt = r.sentAt ? new Date(r.sentAt).toLocaleString() : '';
        const deliveredAt = r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '';
        const readAt = r.readAt ? new Date(r.readAt).toLocaleString() : '';
        const reason = (r.failureReason || '').replace(/"/g, '""');
        const msgId = r.whatsappMessageId || '';

        return `"${name}","${mobile}","${status}","${sentAt}","${deliveredAt}","${readAt}","${reason}","${msgId}"`;
      });

      const csvContent = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const cleanName = (this.report.campaignName || 'campaign')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);

      link.setAttribute('href', url);
      link.setAttribute('download', `report_${cleanName}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.toast.success('Campaign recipient report exported successfully.');
    } catch (err) {
      this.toast.error('Failed to export report CSV. Please try again.');
    } finally {
      this.exporting = false;
    }
  }

  // ===========================================================================
  // UI Formatters & Helpers
  // ===========================================================================
  getInitials(firstName?: string | null, lastName?: string | null): string {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return (first + last) || 'CU';
  }

  getRateColor(rate: number): string {
    if (rate >= 80) return 'text-success';
    if (rate >= 50) return 'text-primary';
    if (rate >= 20) return 'text-warning';
    return 'text-danger';
  }

  getExecutionDuration(startedAt?: string | null, completedAt?: string | null): string {
    if (!startedAt) return '—';
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));

    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    const remSec = diffSec % 60;
    if (diffMin < 60) return `${diffMin}m ${remSec}s`;
    const diffHours = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;
    return `${diffHours}h ${remMin}m`;
  }

  // Global Cross-Campaign Aggregate Metrics (For High-Level Overview)
  get totalGlobalRecipients(): number {
    return this.campaigns.reduce((sum, c) => sum + (c.totalRecipients || 0), 0);
  }

  get totalGlobalDelivered(): number {
    return this.campaigns.reduce((sum, c) => sum + (c.deliveredCount || 0), 0);
  }

  get totalGlobalRead(): number {
    return this.campaigns.reduce((sum, c) => sum + (c.readCount || 0), 0);
  }

  get totalGlobalFailed(): number {
    return this.campaigns.reduce((sum, c) => sum + (c.failedCount || 0), 0);
  }

  get globalDeliveryRate(): number {
    return this.totalGlobalRecipients > 0
      ? Math.round((this.totalGlobalDelivered / this.totalGlobalRecipients) * 100)
      : 0;
  }
}
