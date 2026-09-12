import { CommonModule, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import type { Chart } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CompanyPlanOverview, MetricOverviewItem, WarningThresholdStatus } from '../plans/plan.model';
import { PlanService } from '../plans/plan.service';
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
    NgClass,
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './usage.component.html',
  styleUrl: './usage.component.scss',
})
export class UsageComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly usageService = inject(UsageService);
  private readonly planService = inject(PlanService);
  private readonly httpErrors = inject(HttpErrorService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly Math = Math;

  private readonly destroy$ = new Subject<void>();

  @ViewChild('trendChartCanvas') trendChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('metaChartCanvas') metaChartCanvas?: ElementRef<HTMLCanvasElement>;

  private trendChart?: Chart;
  private metaChart?: Chart;
  private chartsNeedUpdate = false;

  summary: UsageSummary | null = null;
  planOverview: CompanyPlanOverview | null = null;
  history: UsageHistoryItem[] = [];
  selectedPeriod = '';
  availablePeriods: string[] = [];

  loading = true;
  refreshing = false;
  syncingMeta = false;
  exporting = false;
  errorMessage = '';
  metaFeedbackMessage = '';
  metaFeedbackTone: 'success' | 'info' | 'warning' = 'info';
  showPlanComparison = false;

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

  get failureRate(): number {
    const sent = this.summary?.saas.messages.sent || 0;
    const failed = this.summary?.saas.messages.failed || 0;
    return sent > 0 ? Math.round((failed / sent) * 100) : 0;
  }

  get warningMetrics(): MetricOverviewItem[] {
    if (!this.planOverview?.metrics) return [];
    return this.planOverview.metrics.filter(
      (m) =>
        m.status === 'WARNING' ||
        m.status === 'CRITICAL' ||
        m.status === 'EXHAUSTED' ||
        m.status === 'OVER_LIMIT'
    );
  }

  get highestCapacityMetric(): MetricOverviewItem | null {
    if (!this.planOverview?.metrics || !this.planOverview.metrics.length) return null;
    const sorted = [...this.planOverview.metrics]
      .filter((m) => m.percentage !== null)
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    return sorted[0] || null;
  }

  get overallPlanHealth(): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OVER_LIMIT' {
    const warnings = this.warningMetrics;
    if (warnings.some((w) => w.status === 'OVER_LIMIT' || w.status === 'EXHAUSTED')) {
      return 'OVER_LIMIT';
    }
    if (warnings.some((w) => w.status === 'CRITICAL')) {
      return 'CRITICAL';
    }
    if (warnings.some((w) => w.status === 'WARNING')) {
      return 'WARNING';
    }
    return 'HEALTHY';
  }

  ngOnInit(): void {
    this.initPeriods();
    this.loadData();
  }

  ngAfterViewChecked(): void {
    if (this.chartsNeedUpdate && !this.loading && this.summary) {
      this.chartsNeedUpdate = false;
      void this.renderCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
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

  togglePlanComparison(): void {
    this.showPlanComparison = !this.showPlanComparison;
  }

  syncMeta(): void {
    if (this.syncingMeta) return;

    this.syncingMeta = true;
    this.metaFeedbackMessage = '';

    this.usageService
      .syncMetaUsage(this.selectedPeriod)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.syncingMeta = false;
        })
      )
      .subscribe({
        next: (result) => {
          this.metaFeedbackMessage = result.message;
          this.metaFeedbackTone = result.status === 'SYNCED' ? 'success' : 'warning';
          this.toast.success(result.message || 'Meta usage synced successfully');
          this.loadData(true);
        },
        error: (error: unknown) => {
          const msg = this.httpErrors.map(error).message;
          this.metaFeedbackMessage = msg;
          this.metaFeedbackTone = 'warning';
          this.toast.error(msg || 'Failed to sync Meta usage');
        },
      });
  }

  exportCsv(): void {
    if (!this.summary) {
      this.toast.info('No usage data available to export.');
      return;
    }

    this.exporting = true;
    try {
      const headers = [
        'Billing Period',
        'Messages Sent',
        'Messages Delivered',
        'Messages Read',
        'Messages Failed',
        'Delivery Rate %',
        'Campaigns Created',
        'Campaigns Completed',
        'Media Files Uploaded',
        'Media Storage Bytes',
        'Templates Used',
        'Meta Total Conversations',
        'Meta Marketing Conversations',
        'Meta Utility Conversations',
        'Meta Auth Conversations',
        'Meta Service Conversations',
        'Meta Cost Currency',
        'Meta Cost Amount',
      ];

      const records = this.history.length > 0 ? this.history : [
        {
          period: this.summary.period.period,
          periodStart: this.summary.period.periodStart,
          periodEnd: this.summary.period.periodEnd,
          messages: this.summary.saas.messages,
          campaigns: this.summary.saas.campaigns,
          media: this.summary.saas.media,
          templates: this.summary.saas.templates,
          meta: {
            status: this.summary.meta.status,
            syncedAt: this.summary.meta.syncedAt,
            currency: this.summary.meta.currency,
            amount: this.summary.meta.amount,
            totalConversations: this.summary.meta.totalConversations,
          },
        },
      ];

      const rows = records.map((item) => {
        const sent = item.messages?.sent || 0;
        const delivered = item.messages?.delivered || 0;
        const read = item.messages?.read || 0;
        const failed = item.messages?.failed || 0;
        const rate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
        const mediaBytes = item.media?.uploadedBytes || item.media?.activeStorageBytes || 0;

        return [
          `"${item.period}"`,
          sent,
          delivered,
          read,
          failed,
          `${rate}%`,
          item.campaigns?.created || 0,
          item.campaigns?.completed || 0,
          item.media?.uploadedCount || item.media?.activeFileCount || 0,
          mediaBytes,
          item.templates?.used || 0,
          item.meta?.totalConversations || 0,
          (item as UsageHistoryItem).meta?.totalConversations || 0,
          0,
          0,
          0,
          `"${item.meta?.currency || 'USD'}"`,
          item.meta?.amount !== null && item.meta?.amount !== undefined ? item.meta.amount : 'N/A',
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const cleanCompany = (this.auth.getCurrentUser()?.company?.companyName || 'company')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);

      link.setAttribute('href', url);
      link.setAttribute('download', `usage_report_${cleanCompany}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.toast.success('Usage report exported successfully.');
    } catch (err) {
      this.toast.error('Failed to export usage CSV.');
    } finally {
      this.exporting = false;
    }
  }

  formatBytes(bytes: number | null | undefined): string {
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

  getStatusBadgeTone(status: WarningThresholdStatus): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'OVER_LIMIT':
      case 'EXHAUSTED':
        return 'danger';
      case 'CRITICAL':
      case 'WARNING':
        return 'warning';
      default:
        return 'success';
    }
  }

  getMetricIcon(metric: string): string {
    switch (metric) {
      case 'MONTHLY_MESSAGES':
      case 'WHATSAPP_CONNECTIONS':
        return 'bi-whatsapp';
      case 'MONTHLY_CAMPAIGNS':
        return 'bi-megaphone';
      case 'CUSTOMERS':
        return 'bi-people';
      case 'TEMPLATES':
        return 'bi-file-earmark-text';
      case 'MEDIA_STORAGE_BYTES':
        return 'bi-database';
      case 'MONTHLY_MEDIA_UPLOADS':
        return 'bi-cloud-arrow-up';
      case 'TEAM_MEMBERS':
        return 'bi-people-fill';
      default:
        return 'bi-speedometer2';
    }
  }

  getMetricIconBgClass(metric: string): string {
    switch (metric) {
      case 'MONTHLY_MESSAGES':
      case 'WHATSAPP_CONNECTIONS':
        return 'bg-emerald-subtle text-emerald';
      case 'MONTHLY_MEDIA_UPLOADS':
        return 'bg-primary-subtle text-primary';
      default:
        return 'bg-indigo-subtle text-indigo';
    }
  }

  getMetricRoute(metric: string): string {
    switch (metric) {
      case 'MONTHLY_MESSAGES':
      case 'MONTHLY_CAMPAIGNS':
        return '/campaigns';
      case 'CUSTOMERS':
        return '/customers';
      case 'TEMPLATES':
        return '/templates';
      case 'MEDIA_STORAGE_BYTES':
      case 'MONTHLY_MEDIA_UPLOADS':
        return '/media';
      case 'TEAM_MEMBERS':
      case 'WHATSAPP_CONNECTIONS':
        return '/settings';
      default:
        return '/subscription';
    }
  }

  private destroyCharts(): void {
    this.trendChart?.destroy();
    this.trendChart = undefined;
    this.metaChart?.destroy();
    this.metaChart = undefined;
  }

  private async renderCharts(): Promise<void> {
    const { default: Chart } = await import('chart.js/auto');

    // 1. Render Trend Chart (Past Billing Periods)
    if (this.trendChartCanvas && this.history.length > 0) {
      this.trendChart?.destroy();

      // Reverse history so oldest is on the left, newest on the right
      const chronologicalHistory = [...this.history].reverse();
      const labels = chronologicalHistory.map((h) => this.formatPeriodLabel(h.period));
      const sentData = chronologicalHistory.map((h) => h.messages.sent);
      const deliveredData = chronologicalHistory.map((h) => h.messages.delivered);
      const conversationsData = chronologicalHistory.map((h) => h.meta?.totalConversations || 0);

      this.trendChart = new Chart(this.trendChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Messages Sent',
              data: sentData,
              backgroundColor: '#2563EB',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.8,
            },
            {
              label: 'Messages Delivered',
              data: deliveredData,
              backgroundColor: '#10B981',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.8,
            },
            {
              label: 'Meta Conversations',
              data: conversationsData,
              backgroundColor: '#6366F1',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { size: 12, weight: 'bold' },
                color: '#172033',
              },
            },
            tooltip: {
              backgroundColor: '#0F1B3D',
              titleFont: { size: 13, weight: 'bold' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#64748B', font: { size: 11 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#F1F5F9' },
              ticks: { color: '#64748B', font: { size: 11 } },
            },
          },
        },
      });
    }

    // 2. Render Meta Conversation Categories Doughnut Chart
    if (this.metaChartCanvas && this.summary) {
      this.metaChart?.destroy();

      const meta = this.summary.meta;
      const categories = [
        { label: 'Marketing', count: meta.marketingConversations, color: '#2563EB' },
        { label: 'Utility', count: meta.utilityConversations, color: '#6366F1' },
        { label: 'Authentication', count: meta.authenticationConversations, color: '#F59E0B' },
        { label: 'Service', count: meta.serviceConversations, color: '#10B981' },
      ];

      const total = categories.reduce((sum, c) => sum + c.count, 0);
      const hasData = total > 0;

      const labels = hasData ? categories.map((c) => c.label) : ['No Conversations'];
      const values = hasData ? categories.map((c) => c.count) : [1];
      const colors = hasData ? categories.map((c) => c.color) : ['#E2E8F0'];

      this.metaChart = new Chart(this.metaChartCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              hoverOffset: hasData ? 6 : 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          animation: { duration: 600 },
          plugins: {
            legend: { display: false },
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
                  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                  return ` ${context.label}: ${count.toLocaleString()} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }
  }

  private loadData(refresh = false): void {
    if (refresh) this.refreshing = true;
    else this.loading = true;
    this.errorMessage = '';

    forkJoin({
      summary: this.usageService.getSummary(this.selectedPeriod),
      planOverview: this.planService.getCurrentPlanOverview(this.selectedPeriod),
      history: this.usageService.getHistory(12),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        })
      )
      .subscribe({
        next: ({ summary, planOverview, history }) => {
          this.summary = summary;
          this.planOverview = planOverview;
          this.history = history;
          this.chartsNeedUpdate = true;
        },
        error: (error: unknown) => {
          this.errorMessage = this.httpErrors.map(error).message;
        },
      });
  }
}
