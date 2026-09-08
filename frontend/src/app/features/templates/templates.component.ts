import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Observable, Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalService } from '../../core/services/confirmation-modal.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { WhatsAppConnectionStatus } from '../settings/whatsapp/whatsapp-settings.model';
import { WhatsAppSettingsService } from '../settings/whatsapp/whatsapp-settings.service';
import {
  Template,
  TemplateButton,
  TemplateCategory,
  TemplateHeaderType,
  TemplateListData,
  TemplateSortField,
  TemplateStatus,
  TemplateWriteRequest,
} from './template.model';
import { TemplateService } from './template.service';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './templates.component.html',
  styleUrl: './templates.component.scss',
})
export class TemplatesComponent implements OnInit, OnDestroy {
  private readonly api = inject(TemplateService);
  private readonly errors = inject(HttpErrorService);
  private readonly modalService = inject(ConfirmationModalService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService, { optional: true });
  private readonly whatsappApi = inject(WhatsAppSettingsService, { optional: true });
  private readonly destroy$ = new Subject<void>();

  templates: Template[] = [];
  page = 1;
  limit = 10;
  totalRecords = 0;
  totalPages = 0;
  keyword = '';
  category = '';
  status = '';
  language = '';
  sortBy: TemplateSortField = 'createdAt';
  order: 'ASC' | 'DESC' = 'DESC';
  loading = true;
  actionLoading = false;
  detailLoading = false;
  errorMessage = '';
  formError = '';
  successMessage = '';
  editorOpen = false;
  detail: Template | null = null;
  whatsappStatus: WhatsAppConnectionStatus | null = null;
  viewMode: 'grid' | 'table' = 'grid';
  copiedTemplateId: string | null = null;

  readonly categories: TemplateCategory[] = [
    'MARKETING',
    'UTILITY',
    'AUTHENTICATION',
  ];
  readonly statuses: TemplateStatus[] = [
    'DRAFT',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'PAUSED',
    'DISABLED',
    'UNKNOWN',
  ];
  readonly headerTypes: TemplateHeaderType[] = [
    'NONE',
    'TEXT',
    'IMAGE',
    'VIDEO',
    'DOCUMENT',
  ];

  readonly filtersForm = this.fb.nonNullable.group({
    keyword: [''],
    category: [''],
    status: [''],
    language: [''],
  });

  readonly templateForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    metaTemplateName: ['', Validators.maxLength(150)],
    metaTemplateId: ['', Validators.maxLength(255)],
    category: ['UTILITY' as TemplateCategory, Validators.required],
    language: ['en_US', [Validators.required, Validators.maxLength(20)]],
    headerType: ['NONE' as TemplateHeaderType, Validators.required],
    headerText: [''],
    body: ['', Validators.required],
    footer: ['', Validators.maxLength(255)],
    buttons: [''],
  });

  constructor() {
    this.filtersForm.controls.keyword.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(
        (value) =>
          void this.updateQuery({ keyword: value.trim() || null, page: 1 }),
      );

    for (const key of ['category', 'status', 'language'] as const) {
      this.filtersForm.controls[key].valueChanges
        .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe(
          (value) => void this.updateQuery({ [key]: value.trim() || null, page: 1 }),
        );
    }

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.keyword = params.get('keyword')?.trim() ?? '';
      this.category = params.get('category') ?? '';
      this.status = params.get('status') ?? '';
      this.language = params.get('language')?.trim() ?? '';
      this.page = Math.max(1, Number(params.get('page')) || 1);
      this.limit = Math.max(1, Math.min(100, Number(params.get('limit')) || 10));
      const requestedSort = params.get('sortBy');
      this.sortBy = [
        'createdAt',
        'updatedAt',
        'name',
        'category',
        'language',
        'status',
      ].includes(requestedSort ?? '')
        ? (requestedSort as TemplateSortField)
        : 'createdAt';
      this.order = params.get('order') === 'ASC' ? 'ASC' : 'DESC';
      this.filtersForm.setValue(
        {
          keyword: this.keyword,
          category: this.category,
          status: this.status,
          language: this.language,
        },
        { emitEvent: false },
      );
      this.load();
    });
  }

  ngOnInit(): void {
    this.loadWhatsAppStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get userCompanyName(): string {
    return this.auth?.getCurrentUser()?.company?.companyName || 'Seyyon Connect';
  }

  get approvedCount(): number {
    return this.templates.filter((t) => t.status === 'APPROVED').length;
  }

  get pendingCount(): number {
    return this.templates.filter((t) => t.status === 'PENDING').length;
  }

  get issuesCount(): number {
    return this.templates.filter(
      (t) => t.status === 'REJECTED' || t.status === 'DISABLED' || t.status === 'PAUSED',
    ).length;
  }

  loadWhatsAppStatus(): void {
    if (!this.whatsappApi) return;
    this.whatsappApi.getStatus().subscribe({
      next: (res) => {
        this.whatsappStatus = res.status;
      },
      error: () => {
        this.whatsappStatus = 'DISCONNECTED';
      },
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    const request: Observable<Template[] | TemplateListData> = this.keyword
      ? this.api.searchTemplates(this.keyword)
      : this.api.getTemplates({
          page: this.page,
          limit: this.limit,
          sortBy: this.sortBy,
          order: this.order,
          category: (this.category as TemplateCategory) || undefined,
          status: (this.status as TemplateStatus) || undefined,
          language: this.language || undefined,
        });

    request
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (result) => {
          if (Array.isArray(result)) {
            this.templates = this.applySearchFilters(result);
            this.totalRecords = this.templates.length;
            this.totalPages = this.templates.length ? 1 : 0;
            this.page = 1;
          } else {
            this.templates = result.templates;
            this.totalRecords = result.pagination.totalRecords;
            this.totalPages = result.pagination.totalPages;
          }
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  changePage(page: number): void {
    void this.updateQuery({ page });
  }

  sort(field: TemplateSortField): void {
    void this.updateQuery({
      sortBy: field,
      order: this.sortBy === field && this.order === 'ASC' ? 'DESC' : 'ASC',
      page: 1,
    });
  }

  clearFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        keyword: null,
        category: null,
        status: null,
        language: null,
        page: 1,
      },
      queryParamsHandling: 'merge',
    });
  }

  openCreate(): void {
    this.formError = '';
    this.templateForm.reset({
      name: '',
      metaTemplateName: '',
      metaTemplateId: '',
      category: 'UTILITY',
      language: 'en_US',
      headerType: 'NONE',
      headerText: '',
      body: '',
      footer: '',
      buttons: '',
    });
    this.editorOpen = true;
  }

  save(): void {
    if (this.templateForm.invalid || this.actionLoading) {
      this.templateForm.markAllAsTouched();
      return;
    }
    const raw = this.templateForm.getRawValue();
    let buttons: TemplateButton[] | null = null;
    if (raw.buttons.trim()) {
      try {
        const parsed: unknown = JSON.parse(raw.buttons);
        if (!Array.isArray(parsed)) throw new Error();
        buttons = parsed as TemplateButton[];
      } catch {
        this.formError = 'Buttons must be a valid JSON array.';
        return;
      }
    }
    const payload: TemplateWriteRequest = {
      name: raw.name.trim(),
      metaTemplateName: raw.metaTemplateName.trim() || null,
      metaTemplateId: raw.metaTemplateId.trim() || null,
      category: raw.category,
      language: raw.language.trim(),
      headerType: raw.headerType,
      headerText:
        raw.headerType === 'TEXT' ? raw.headerText.trim() || null : null,
      body: raw.body.trim(),
      footer: raw.footer.trim() || null,
      buttons,
    };
    this.actionLoading = true;
    this.formError = '';
    this.api
      .createTemplate(payload)
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.editorOpen = false;
          this.notify('Template submitted to Meta successfully.');
          this.load();
        },
        error: (error) => {
          this.formError = this.errors.map(error).message;
        },
      });
  }

  sync(): void {
    if (this.actionLoading) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.api
      .syncTemplates()
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        }),
      )
      .subscribe({
        next: (result) => {
          this.notify(
            `${result.synchronized} template${result.synchronized === 1 ? '' : 's'} synchronized.`,
          );
          this.load();
        },
        error: (error) => {
          const msg = this.errors.map(error).message;
          this.errorMessage = msg;
          this.toastService.error(msg);
        },
      });
  }

  showDetail(id: string): void {
    this.detailLoading = true;
    this.errorMessage = '';
    this.api
      .getTemplate(id)
      .pipe(
        finalize(() => {
          this.detailLoading = false;
        }),
      )
      .subscribe({
        next: (template) => {
          this.detail = template;
        },
        error: (error) => {
          const msg = this.errors.map(error).message;
          this.errorMessage = msg;
          this.toastService.error(msg);
        },
      });
  }

  remove(template: Template): void {
    if (this.actionLoading) return;
    this.modalService
      .confirm({
        title: 'Delete Template?',
        message: `Are you sure you want to delete template "${template.name}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: 'bi-trash3-fill',
        action: () => this.api.deleteTemplate(template.id),
      })
      .then((confirmed) => {
        if (confirmed) {
          this.toastService.success('Template deleted successfully.');
          if (!this.keyword && this.templates.length === 1 && this.page > 1) {
            void this.updateQuery({ page: this.page - 1 });
          } else {
            this.load();
          }
        }
      })
      .catch((error) => {
        const msg =
          this.errors.map(error).message || 'Failed to delete template.';
        this.toastService.error(msg);
      });
  }

  copyTemplateContent(template: Template, event?: Event): void {
    if (event) event.stopPropagation();
    const textToCopy = template.body;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.copiedTemplateId = template.id;
        this.toastService.success(`Template content copied to clipboard.`);
        setTimeout(() => {
          if (this.copiedTemplateId === template.id) {
            this.copiedTemplateId = null;
          }
        }, 2500);
      });
    }
  }

  addNextVariable(): void {
    const bodyControl = this.templateForm.controls.body;
    const currentText = bodyControl.value;
    const existing = this.placeholders(currentText);
    const nextIndex = existing.length + 1;
    const insertion = `{{${nextIndex}}}`;
    bodyControl.setValue(
      currentText ? `${currentText} ${insertion}` : insertion,
    );
  }

  setButtonsPreset(type: 'URL' | 'PHONE' | 'QUICK_REPLY'): void {
    let preset: TemplateButton[] = [];
    if (type === 'URL') {
      preset = [{ type: 'URL', text: 'Visit Website', url: 'https://example.com' }];
    } else if (type === 'PHONE') {
      preset = [{ type: 'PHONE_NUMBER', text: 'Call Us', phoneNumber: '+1234567890' }];
    } else if (type === 'QUICK_REPLY') {
      preset = [
        { type: 'QUICK_REPLY', text: 'Confirm' },
        { type: 'QUICK_REPLY', text: 'Decline' },
      ];
    }
    this.templateForm.controls.buttons.setValue(
      JSON.stringify(preset, null, 2),
    );
  }

  getLivePreviewButtons(): TemplateButton[] {
    const raw = this.templateForm.controls.buttons.value;
    if (!raw.trim()) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as TemplateButton[]) : [];
    } catch {
      return [];
    }
  }

  placeholders(text: string | null): string[] {
    return text?.match(/\{\{\d+\}\}/g) ?? [];
  }

  buttonLabel(button: TemplateButton): string {
    return button.text || button.type || 'Button';
  }

  hasFilters(): boolean {
    return Boolean(
      this.keyword || this.category || this.status || this.language,
    );
  }

  private applySearchFilters(templates: Template[]): Template[] {
    return templates.filter(
      (item) =>
        (!this.category || item.category === this.category) &&
        (!this.status || item.status === this.status) &&
        (!this.language || item.language === this.language),
    );
  }

  private notify(message: string): void {
    this.successMessage = message;
    this.toastService.success(message);
    setTimeout(() => {
      this.successMessage = '';
    }, 4000);
  }

  private updateQuery(
    query: Record<string, string | number | null>,
  ): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query,
      queryParamsHandling: 'merge',
    });
  }
}

