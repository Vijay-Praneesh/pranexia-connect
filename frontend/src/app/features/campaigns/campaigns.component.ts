import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { concatMap, debounceTime, distinctUntilChanged, finalize, forkJoin, Observable, of, Subject, takeUntil } from 'rxjs';

import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { Customer } from '../customers/customer.model';
import { CustomerService } from '../customers/customer.service';
import { Template } from '../templates/template.model';
import { TemplateService } from '../templates/template.service';
import { Media } from '../media/media.model';
import { MediaService } from '../media/media.service';
import { Campaign, CampaignListData, CampaignRecipient, CampaignRecipientListData, CampaignReport, CampaignSendType, CampaignSortField, CampaignStatus, CampaignWriteRequest } from './campaign.model';
import { CampaignService } from './campaign.service';

@Component({ selector: 'app-campaigns', standalone: true,
  imports: [DatePipe, ReactiveFormsModule, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, PaginationComponent, StatusBadgeComponent],
  templateUrl: './campaigns.component.html', styleUrl: './campaigns.component.scss' })
export class CampaignsComponent implements OnDestroy {
  private readonly api = inject(CampaignService); private readonly templatesApi = inject(TemplateService); private readonly customersApi = inject(CustomerService);
  private readonly errors = inject(HttpErrorService); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly fb = inject(FormBuilder); private readonly mediaApi = inject(MediaService, { optional: true });
  private readonly destroy$ = new Subject<void>(); private pollHandle?: ReturnType<typeof setInterval>;

  campaigns: Campaign[] = []; approvedTemplates: Template[] = []; customers: Customer[] = []; media: Media[] = []; selectedCustomers = new Set<string>();
  recipients: CampaignRecipient[] = []; report: CampaignReport | null = null; detail: Campaign | null = null;
  page = 1; limit = 10; totalRecords = 0; totalPages = 0; keyword = ''; status = ''; sendType = ''; templateId = '';
  sortBy: CampaignSortField = 'created_at'; order: 'ASC' | 'DESC' = 'DESC';
  loading = true; actionLoading = false; detailLoading = false; reportLoading = false; errorMessage = ''; formError = ''; successMessage = '';
  editorOpen = false; editing: Campaign | null = null; recipientPage = 1; recipientTotalPages = 0;
  readonly statuses: CampaignStatus[] = ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  readonly customerFields = ['firstName', 'lastName', 'mobile', 'email', 'country', 'notes'] as const;
  readonly filtersForm = this.fb.nonNullable.group({ keyword: [''], status: [''], sendType: [''], templateId: [''] });
  readonly campaignForm = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.maxLength(150)]], description: [''], templateId: ['', Validators.required], sendType: ['NOW' as CampaignSendType, Validators.required], scheduledAt: [''], mediaId: [''], variableMappings: this.fb.nonNullable.group({}) });

  constructor() {
    this.filtersForm.controls.keyword.valueChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe((value) => void this.updateQuery({ keyword: value.trim() || null, page: 1 }));
    for (const key of ['status', 'sendType', 'templateId'] as const) this.filtersForm.controls[key].valueChanges.pipe(distinctUntilChanged(), takeUntil(this.destroy$)).subscribe((value) => void this.updateQuery({ [key]: value || null, page: 1 }));
    this.loadOptions();
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.keyword = params.get('keyword')?.trim() ?? ''; this.status = params.get('status') ?? ''; this.sendType = params.get('sendType') ?? ''; this.templateId = params.get('templateId') ?? '';
      this.page = Math.max(1, Number(params.get('page')) || 1); this.limit = Math.max(1, Math.min(100, Number(params.get('limit')) || 10));
      const sort = params.get('sortBy'); this.sortBy = ['created_at', 'updated_at', 'name', 'status', 'send_type', 'scheduled_at'].includes(sort ?? '') ? sort as CampaignSortField : 'created_at';
      this.order = params.get('order') === 'ASC' ? 'ASC' : 'DESC';
      this.filtersForm.setValue({ keyword: this.keyword, status: this.status, sendType: this.sendType, templateId: this.templateId }, { emitEvent: false }); this.load();
    });
  }
  ngOnDestroy(): void { this.stopPolling(); this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    const request: Observable<Campaign[] | CampaignListData> = this.keyword
      ? this.api.searchCampaigns(this.keyword, {
        status: this.status as CampaignStatus || undefined,
        sendType: this.sendType as CampaignSendType || undefined,
        templateId: this.templateId || undefined
      })
      : this.api.getCampaigns({ page: this.page, limit: this.limit, sortBy: this.sortBy, order: this.order, status: this.status as CampaignStatus || undefined, sendType: this.sendType as CampaignSendType || undefined, templateId: this.templateId || undefined });
    request.pipe(finalize(() => { this.loading = false; })).subscribe({ next: (result) => { if (Array.isArray(result)) { this.campaigns = result; this.totalRecords = result.length; this.totalPages = result.length ? 1 : 0; this.page = 1; } else { this.campaigns = result.campaigns; this.totalRecords = result.pagination.totalRecords; this.totalPages = result.pagination.totalPages; } }, error: (error) => { this.errorMessage = this.errors.map(error).message; } });
  }
  loadOptions(): void {
    forkJoin({ templates: this.templatesApi.getTemplates({ page: 1, limit: 100, status: 'APPROVED', sortBy: 'name', order: 'ASC' }), customers: this.customersApi.getCustomers({ page: 1, limit: 100, status: 'ACTIVE', sortBy: 'firstName', order: 'ASC' }) }).subscribe({ next: (result) => { this.approvedTemplates = result.templates.templates; this.customers = result.customers.customers; }, error: (error) => { this.errorMessage = this.errors.map(error).message; } });
    this.mediaApi?.getMedia({ page: 1, limit: 100 }).subscribe({ next: (result) => { this.media = result.media.filter((item) => item.status === 'READY'); }, error: () => undefined });
  }
  changePage(page: number): void { void this.updateQuery({ page }); }
  sort(field: CampaignSortField): void { void this.updateQuery({ sortBy: field, order: this.sortBy === field && this.order === 'ASC' ? 'DESC' : 'ASC', page: 1 }); }
  clearFilters(): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { keyword: null, status: null, sendType: null, templateId: null, page: 1 }, queryParamsHandling: 'merge' }); }
  hasFilters(): boolean { return Boolean(this.keyword || this.status || this.sendType || this.templateId); }

  openCreate(): void { this.editing = null; this.selectedCustomers.clear(); this.formError = ''; this.campaignForm.reset({ name: '', description: '', templateId: '', sendType: 'NOW', scheduledAt: '', mediaId: '', variableMappings: {} }); this.editorOpen = true; }
  openEdit(campaign: Campaign): void { this.editing = campaign; this.selectedCustomers.clear(); this.formError = ''; this.campaignForm.reset({ name: campaign.name, description: campaign.description ?? '', templateId: campaign.templateId, sendType: campaign.sendType, scheduledAt: campaign.scheduledAt ? this.toLocalInput(campaign.scheduledAt) : '', mediaId: campaign.mediaId ?? '', variableMappings: campaign.variableMappings ?? {} }); this.editorOpen = true; }
  toggleCustomer(id: string, checked: boolean): void { checked ? this.selectedCustomers.add(id) : this.selectedCustomers.delete(id); }
  toggleAllCustomers(checked: boolean): void { this.selectedCustomers.clear(); if (checked) this.customers.forEach((customer) => this.selectedCustomers.add(customer.id)); }
  templateVariables(): string[] {
    const template = this.approvedTemplates.find((item) => item.id === this.campaignForm.controls.templateId.value);
    if (!Array.isArray(template?.variables)) return [];
    return template.variables.map((variable, index) => typeof variable === 'string' ? variable : variable.key || variable.name || String(index + 1));
  }
  mappingValue(variable: string, index: number): string { const mappings = this.campaignForm.controls.variableMappings.value as Record<string, string>; return mappings[variable] || mappings[String(index + 1)] || ''; }
  setMapping(variable: string, index: number, field: string): void { const mappings = { ...this.campaignForm.controls.variableMappings.value } as Record<string, string>; delete mappings[String(index + 1)]; mappings[variable] = field; this.campaignForm.controls.variableMappings.setValue(mappings); }
  selectedTemplateName(): string { return this.approvedTemplates.find((template) => template.id === this.campaignForm.controls.templateId.value)?.name || 'Template'; }
  selectedMediaName(): string { return this.media.find((item) => item.id === this.campaignForm.controls.mediaId.value)?.originalName || 'No media attached'; }

  save(): void {
    if (this.campaignForm.invalid || this.actionLoading) { this.campaignForm.markAllAsTouched(); return; }
    const raw = this.campaignForm.getRawValue();
    if (raw.sendType === 'SCHEDULED' && !raw.scheduledAt) { this.formError = 'Choose a scheduled date and time.'; return; }
    const scheduledAt = raw.sendType === 'SCHEDULED' ? new Date(raw.scheduledAt).toISOString() : null;
    if (scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) { this.formError = 'Scheduled time must be in the future.'; return; }
    const payload: CampaignWriteRequest = { name: raw.name.trim(), description: raw.description.trim() || null, templateId: raw.templateId, sendType: raw.sendType, scheduledAt, mediaId: raw.mediaId || null, variableMappings: raw.variableMappings };
    this.actionLoading = true; this.formError = '';
    if (this.editing) { this.api.updateCampaign(this.editing.id, payload).pipe(finalize(() => { this.actionLoading = false; })).subscribe({ next: () => this.afterSave('Campaign updated successfully.'), error: (error) => { this.formError = this.errors.map(error).message; } }); return; }
    this.api.createCampaign({ ...payload, sendType: 'NOW', scheduledAt: null }).pipe(
      concatMap((campaign) => this.selectedCustomers.size ? this.api.assignRecipients({ campaignId: campaign.id, customerIds: [...this.selectedCustomers] }).pipe(concatMap(() => of(campaign))) : of(campaign)),
      concatMap((campaign) => payload.sendType === 'SCHEDULED' ? this.api.updateCampaign(campaign.id, payload) : of(campaign)), finalize(() => { this.actionLoading = false; })
    ).subscribe({ next: () => this.afterSave(payload.sendType === 'SCHEDULED' ? 'Campaign created and scheduled.' : 'Campaign created successfully.'), error: (error) => { this.formError = this.errors.map(error).message; } });
  }
  private afterSave(message: string): void { this.editorOpen = false; this.notify(message); this.load(); }

  showDetail(id: string): void { this.detailLoading = true; this.errorMessage = ''; this.api.getCampaign(id).pipe(finalize(() => { this.detailLoading = false; })).subscribe({ next: (campaign) => { this.detail = campaign; this.report = null; this.recipients = []; this.recipientPage = 1; this.configurePolling(); }, error: (error) => { this.errorMessage = this.errors.map(error).message; } }); }
  closeDetail(): void { this.detail = null; this.report = null; this.recipients = []; this.stopPolling(); }
  refreshDetail(silent = false): void { if (!this.detail || (!silent && this.detailLoading)) return; if (!silent) this.detailLoading = true; this.api.getCampaign(this.detail.id).pipe(finalize(() => { if (!silent) this.detailLoading = false; })).subscribe({ next: (campaign) => { this.detail = campaign; this.configurePolling(); }, error: (error) => { if (!silent) this.errorMessage = this.errors.map(error).message; } }); }
  loadReport(): void { if (!this.detail) return; this.reportLoading = true; forkJoin({ report: this.api.getCampaignReport(this.detail.id), recipients: this.api.getCampaignRecipients({ campaignId: this.detail.id, page: this.recipientPage, limit: 10, sortBy: 'createdAt', order: 'DESC' }) }).pipe(finalize(() => { this.reportLoading = false; })).subscribe({ next: ({ report, recipients }) => { this.report = report; this.setRecipients(recipients); }, error: (error) => { this.errorMessage = this.errors.map(error).message; } }); }
  changeRecipientPage(page: number): void { this.recipientPage = page; this.loadReport(); }
  private setRecipients(data: CampaignRecipientListData): void { this.recipients = data.recipients; this.recipientTotalPages = data.pagination.totalPages; }

  send(campaign: Campaign): void { if (!this.canSend(campaign) || !confirm(`Send “${campaign.name}” to ${campaign.totalRecipients} recipient${campaign.totalRecipients === 1 ? '' : 's'} using ${campaign.template?.name ?? 'the selected template'}? Sending cannot be undone.`)) return; this.runAction(this.api.sendCampaign(campaign.id), 'Campaign send completed. Check the report for delivery status.'); }
  cancel(campaign: Campaign): void { if (!this.canCancel(campaign) || !confirm(`Cancel scheduled campaign “${campaign.name}”?`)) return; this.runAction(this.api.cancelCampaign(campaign.id), 'Campaign cancelled successfully.'); }
  remove(campaign: Campaign): void { if (!confirm(`Delete campaign “${campaign.name}”? This cannot be undone.`)) return; this.runAction(this.api.deleteCampaign(campaign.id), 'Campaign deleted successfully.', true); }
  canSend(campaign: Campaign): boolean { return campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED'; }
  canCancel(campaign: Campaign): boolean { return campaign.status === 'SCHEDULED'; }
  canEdit(campaign: Campaign): boolean { return campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED'; }
  private runAction(request: Observable<unknown>, message: string, closes = false): void { if (this.actionLoading) return; this.actionLoading = true; request.pipe(finalize(() => { this.actionLoading = false; })).subscribe({ next: () => { if (closes) this.closeDetail(); this.notify(message); this.load(); if (!closes && this.detail) this.refreshDetail(); }, error: (error) => { this.errorMessage = this.errors.map(error).message; } }); }
  private configurePolling(): void { this.stopPolling(); if (this.detail?.status === 'SCHEDULED' || this.detail?.status === 'RUNNING') this.pollHandle = setInterval(() => this.refreshDetail(true), 15000); }
  private stopPolling(): void { if (this.pollHandle) clearInterval(this.pollHandle); this.pollHandle = undefined; }
  private toLocalInput(iso: string): string { const date = new Date(iso); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
  private notify(message: string): void { this.successMessage = message; setTimeout(() => { this.successMessage = ''; }, 4000); }
  private updateQuery(query: Record<string, string | number | null>): Promise<boolean> { return this.router.navigate([], { relativeTo: this.route, queryParams: query, queryParamsHandling: 'merge' }); }
}
