import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Observable, Subject, takeUntil } from 'rxjs';

import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { Template, TemplateButton, TemplateCategory, TemplateHeaderType, TemplateListData, TemplateSortField, TemplateStatus, TemplateWriteRequest } from './template.model';
import { TemplateService } from './template.service';

@Component({
  selector: 'app-templates', standalone: true,
  imports: [DatePipe, ReactiveFormsModule, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, PaginationComponent, StatusBadgeComponent],
  templateUrl: './templates.component.html', styleUrl: './templates.component.scss',
})
export class TemplatesComponent implements OnDestroy {
  private readonly api = inject(TemplateService);
  private readonly errors = inject(HttpErrorService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  templates: Template[] = [];
  page = 1; limit = 10; totalRecords = 0; totalPages = 0;
  keyword = ''; category = ''; status = ''; language = '';
  sortBy: TemplateSortField = 'createdAt'; order: 'ASC' | 'DESC' = 'DESC';
  loading = true; actionLoading = false; detailLoading = false;
  errorMessage = ''; formError = ''; successMessage = '';
  editorOpen = false; editing: Template | null = null; detail: Template | null = null;

  readonly categories: TemplateCategory[] = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
  readonly statuses: TemplateStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'];
  readonly headerTypes: TemplateHeaderType[] = ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'];
  readonly filtersForm = this.fb.nonNullable.group({ keyword: [''], category: [''], status: [''], language: [''] });
  readonly templateForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]], metaTemplateName: ['', Validators.maxLength(150)],
    metaTemplateId: ['', Validators.maxLength(255)], category: ['UTILITY' as TemplateCategory, Validators.required],
    language: ['en_US', [Validators.required, Validators.maxLength(20)]], headerType: ['NONE' as TemplateHeaderType, Validators.required],
    headerText: [''], body: ['', Validators.required], footer: ['', Validators.maxLength(255)], buttons: [''],
  });

  constructor() {
    this.filtersForm.controls.keyword.valueChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => void this.updateQuery({ keyword: value.trim() || null, page: 1 }));
    for (const key of ['category', 'status', 'language'] as const) {
      this.filtersForm.controls[key].valueChanges.pipe(distinctUntilChanged(), takeUntil(this.destroy$))
        .subscribe((value) => void this.updateQuery({ [key]: value.trim() || null, page: 1 }));
    }
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.keyword = params.get('keyword')?.trim() ?? '';
      this.category = params.get('category') ?? ''; this.status = params.get('status') ?? ''; this.language = params.get('language')?.trim() ?? '';
      this.page = Math.max(1, Number(params.get('page')) || 1); this.limit = Math.max(1, Math.min(100, Number(params.get('limit')) || 10));
      const requestedSort = params.get('sortBy');
      this.sortBy = ['createdAt', 'updatedAt', 'name', 'category', 'language', 'status'].includes(requestedSort ?? '') ? requestedSort as TemplateSortField : 'createdAt';
      this.order = params.get('order') === 'ASC' ? 'ASC' : 'DESC';
      this.filtersForm.setValue({ keyword: this.keyword, category: this.category, status: this.status, language: this.language }, { emitEvent: false });
      this.load();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    const request: Observable<Template[] | TemplateListData> = this.keyword
      ? this.api.searchTemplates(this.keyword)
      : this.api.getTemplates({ page: this.page, limit: this.limit, sortBy: this.sortBy, order: this.order,
          category: this.category as TemplateCategory || undefined, status: this.status as TemplateStatus || undefined, language: this.language || undefined });
    request.pipe(finalize(() => { this.loading = false; })).subscribe({
      next: (result) => {
        if (Array.isArray(result)) {
          this.templates = this.applySearchFilters(result); this.totalRecords = this.templates.length; this.totalPages = this.templates.length ? 1 : 0; this.page = 1;
        } else {
          this.templates = result.templates; this.totalRecords = result.pagination.totalRecords; this.totalPages = result.pagination.totalPages;
        }
      },
      error: (error) => { this.errorMessage = this.errors.map(error).message; },
    });
  }

  changePage(page: number): void { void this.updateQuery({ page }); }
  sort(field: TemplateSortField): void { void this.updateQuery({ sortBy: field, order: this.sortBy === field && this.order === 'ASC' ? 'DESC' : 'ASC', page: 1 }); }
  clearFilters(): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { keyword: null, category: null, status: null, language: null, page: 1 }, queryParamsHandling: 'merge' }); }

  openCreate(): void {
    this.editing = null; this.formError = '';
    this.templateForm.reset({ name: '', metaTemplateName: '', metaTemplateId: '', category: 'UTILITY', language: 'en_US', headerType: 'NONE', headerText: '', body: '', footer: '', buttons: '' });
    this.editorOpen = true;
  }

  openEdit(template: Template): void {
    this.editing = template; this.formError = '';
    this.templateForm.reset({ name: template.name, metaTemplateName: template.metaTemplateName ?? '', metaTemplateId: template.metaTemplateId ?? '', category: template.category,
      language: template.language, headerType: template.headerType, headerText: template.headerText ?? '', body: template.body, footer: template.footer ?? '', buttons: template.buttons ? JSON.stringify(template.buttons, null, 2) : '' });
    this.editorOpen = true;
  }

  save(): void {
    if (this.templateForm.invalid || this.actionLoading) { this.templateForm.markAllAsTouched(); return; }
    const raw = this.templateForm.getRawValue(); let buttons: TemplateButton[] | null = null;
    if (raw.buttons.trim()) {
      try { const parsed: unknown = JSON.parse(raw.buttons); if (!Array.isArray(parsed)) throw new Error(); buttons = parsed as TemplateButton[]; }
      catch { this.formError = 'Buttons must be a valid JSON array.'; return; }
    }
    const payload: TemplateWriteRequest = { name: raw.name.trim(), metaTemplateName: raw.metaTemplateName.trim() || null, metaTemplateId: raw.metaTemplateId.trim() || null,
      category: raw.category, language: raw.language.trim(), headerType: raw.headerType, headerText: raw.headerType === 'TEXT' ? raw.headerText.trim() || null : null,
      body: raw.body.trim(), footer: raw.footer.trim() || null, buttons };
    this.actionLoading = true; this.formError = '';
    const request = this.editing ? this.api.updateTemplate(this.editing.id, payload) : this.api.createTemplate(payload);
    request.pipe(finalize(() => { this.actionLoading = false; })).subscribe({
      next: () => { this.editorOpen = false; this.notify(this.editing ? 'Template updated successfully.' : 'Template created successfully.'); this.load(); },
      error: (error) => { this.formError = this.errors.map(error).message; },
    });
  }

  showDetail(id: string): void {
    this.detailLoading = true; this.errorMessage = '';
    this.api.getTemplate(id).pipe(finalize(() => { this.detailLoading = false; })).subscribe({ next: (template) => { this.detail = template; }, error: (error) => { this.errorMessage = this.errors.map(error).message; } });
  }

  remove(template: Template): void {
    if (!confirm(`Delete template “${template.name}”? This cannot be undone.`) || this.actionLoading) return;
    this.actionLoading = true;
    this.api.deleteTemplate(template.id).pipe(finalize(() => { this.actionLoading = false; })).subscribe({
      next: () => { this.notify('Template deleted successfully.'); if (!this.keyword && this.templates.length === 1 && this.page > 1) void this.updateQuery({ page: this.page - 1 }); else this.load(); },
      error: (error) => { this.errorMessage = this.errors.map(error).message; },
    });
  }

  placeholders(text: string | null): string[] { return text?.match(/\{\{\d+\}\}/g) ?? []; }
  buttonLabel(button: TemplateButton): string { return button.text || button.type || 'Button'; }
  hasFilters(): boolean { return Boolean(this.keyword || this.category || this.status || this.language); }

  private applySearchFilters(templates: Template[]): Template[] {
    return templates.filter((item) => (!this.category || item.category === this.category) && (!this.status || item.status === this.status) && (!this.language || item.language === this.language));
  }
  private notify(message: string): void { this.successMessage = message; setTimeout(() => { this.successMessage = ''; }, 4000); }
  private updateQuery(query: Record<string, string | number | null>): Promise<boolean> { return this.router.navigate([], { relativeTo: this.route, queryParams: query, queryParamsHandling: 'merge' }); }
}
