import { DatePipe, NgClass } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  finalize,
  Subject,
  takeUntil,
} from 'rxjs';

import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  AccountStatus,
  CompanyPlan,
  CompanyRecord,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from './company.model';
import { CompanyService } from './company.service';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent implements OnDestroy {
  private readonly companiesApi = inject(CompanyService);
  private readonly errors = inject(HttpErrorService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private readonly searchChanges = new Subject<string>();

  readonly plans: CompanyPlan[] = [
    'STARTER',
    'BUSINESS',
    'PROFESSIONAL',
    'ENTERPRISE',
  ];
  readonly statuses: AccountStatus[] = ['ACTIVE', 'INACTIVE'];
  readonly searchForm = this.formBuilder.nonNullable.group({ search: [''] });
  readonly companyForm = this.formBuilder.nonNullable.group({
    companyName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    plan: ['STARTER' as CompanyPlan, Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminMobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  readonly editForm = this.formBuilder.nonNullable.group({
    companyName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    plan: ['STARTER' as CompanyPlan, Validators.required],
  });

  companies: CompanyRecord[] = [];
  page = 1;
  limit = 10;
  totalRecords = 0;
  totalPages = 0;
  search = '';
  status: AccountStatus | '' = '';
  plan: CompanyPlan | '' = '';
  loading = true;
  actionLoading = false;
  errorMessage = '';
  successMessage = '';
  editorOpen = false;
  editOpen = false;
  detail: CompanyRecord | null = null;
  editing: CompanyRecord | null = null;

  constructor() {
    this.searchChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((search) => {
        void this.updateQuery({ search: search.trim() || null, page: 1 });
      });
    this.searchForm.controls.search.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.searchChanges.next(value));
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.search = params.get('search')?.trim() ?? '';
        this.status = this.asStatus(params.get('status'));
        this.plan = this.asPlan(params.get('plan'));
        this.page = Math.max(1, Number(params.get('page')) || 1);
        this.searchForm.controls.search.setValue(this.search, {
          emitEvent: false,
        });
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.companiesApi
      .getCompanies({
        page: this.page,
        limit: this.limit,
        search: this.search,
        status: this.status || undefined,
        plan: this.plan || undefined,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (result) => {
          this.companies = result.companies;
          this.totalRecords = result.pagination.totalRecords;
          this.totalPages = result.pagination.totalPages;
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  applyFilters(): void {
    void this.updateQuery({
      status: this.status || null,
      plan: this.plan || null,
      page: 1,
    });
  }

  hasActiveFilters(): boolean {
    return !!(this.search || this.status || this.plan);
  }

  clearFilters(): void {
    this.searchForm.controls.search.setValue('');
    this.search = '';
    this.status = '';
    this.plan = '';
    void this.updateQuery({ search: null, status: null, plan: null, page: 1 });
  }

  clearSearch(): void {
    this.searchForm.controls.search.setValue('');
    this.search = '';
    void this.updateQuery({ search: null, page: 1 });
  }

  clearStatusFilter(): void {
    this.status = '';
    this.applyFilters();
  }

  clearPlanFilter(): void {
    this.plan = '';
    this.applyFilters();
  }

  getActiveCount(): number {
    return this.companies.filter((c) => c.status === 'ACTIVE').length;
  }

  getInactiveCount(): number {
    return this.companies.filter((c) => c.status === 'INACTIVE').length;
  }

  changePage(page: number): void {
    void this.updateQuery({ page });
  }

  openCreate(): void {
    this.companyForm.reset({
      companyName: '',
      email: '',
      mobile: '',
      plan: 'STARTER',
      firstName: '',
      lastName: '',
      adminEmail: '',
      adminMobile: '',
      password: '',
    });
    this.editorOpen = true;
    this.errorMessage = '';
  }

  openEdit(company: CompanyRecord): void {
    this.editing = company;
    this.editForm.reset({
      companyName: company.companyName ?? '',
      email: company.email ?? '',
      mobile: company.mobile ?? '',
      plan: company.plan ?? 'STARTER',
    });
    this.editForm.patchValue({
      companyName: company.companyName ?? '',
      email: company.email ?? '',
      mobile: company.mobile ?? '',
      plan: company.plan ?? 'STARTER',
    });
    this.editOpen = true;
    this.errorMessage = '';
  }

  save(): void {
    if (this.companyForm.invalid || this.actionLoading) {
      this.companyForm.markAllAsTouched();
      return;
    }
    const raw = this.companyForm.getRawValue();
    if (
      raw.email.trim().toLowerCase() !== raw.adminEmail.trim().toLowerCase() ||
      raw.mobile.trim() !== raw.adminMobile.trim()
    ) {
      this.errorMessage =
        'Company and admin email and mobile must match because the backend links the admin to those company contacts.';
      return;
    }
    const payload: CreateCompanyRequest = {
      companyName: raw.companyName.trim(),
      email: raw.email.trim(),
      mobile: raw.mobile.trim(),
      password: raw.password,
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      plan: raw.plan,
    };
    this.runAction(
      this.companiesApi.createCompany(payload),
      'Client company created successfully.',
      () => {
        this.editorOpen = false;
      },
    );
  }

  update(): void {
    if (!this.editing || this.editForm.invalid || this.actionLoading) {
      this.editForm.markAllAsTouched();
      return;
    }
    const raw = this.editForm.getRawValue();
    const payload: UpdateCompanyRequest = {
      companyName: raw.companyName.trim(),
      email: raw.email.trim(),
      mobile: raw.mobile.trim(),
      plan: raw.plan,
    };
    this.runAction(
      this.companiesApi.updateCompany(this.editing.id, payload),
      'Client company updated successfully.',
      () => {
        this.editOpen = false;
        if (this.detail && this.detail.id === this.editing?.id) {
          this.detail = {
            ...this.detail,
            companyName: payload.companyName,
            email: payload.email,
            mobile: payload.mobile,
            plan: payload.plan,
          };
        }
      },
    );
  }

  showDetail(id: string): void {
    this.actionLoading = true;
    this.errorMessage = '';
    this.companiesApi
      .getCompany(id)
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        }),
      )
      .subscribe({
        next: (company) => {
          this.detail = company;
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  toggleStatus(company: CompanyRecord): void {
    const status: AccountStatus =
      company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.runAction(
      this.companiesApi.updateCompanyStatus(company.id, status),
      `Company ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`,
      () => {
        if (this.detail && this.detail.id === company.id) {
          this.detail = { ...this.detail, status };
        }
      },
    );
  }

  admin(company: CompanyRecord): CompanyRecord['users'][number] | null {
    return company.users.find((user) => user.role === 'COMPANY_ADMIN') ?? null;
  }

  getCompanyInitials(name: string): string {
    if (!name) return 'CO';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getAdminInitials(user: CompanyRecord['users'][number] | null | undefined): string {
    if (!user) return 'AD';
    const first = user.firstName ? user.firstName.trim().charAt(0) : '';
    const last = user.lastName ? user.lastName.trim().charAt(0) : '';
    return (first + last).toUpperCase() || 'AD';
  }

  getPlanBadgeClass(plan: CompanyPlan): string {
    switch (plan) {
      case 'STARTER': return 'plan-badge-starter';
      case 'BUSINESS': return 'plan-badge-business';
      case 'PROFESSIONAL': return 'plan-badge-professional';
      case 'ENTERPRISE': return 'plan-badge-enterprise';
      default: return 'plan-badge-default';
    }
  }

  getPlanLabel(plan: CompanyPlan | string): string {
    switch (plan) {
      case 'STARTER': return 'Starter';
      case 'BUSINESS': return 'Business';
      case 'PROFESSIONAL': return 'Professional';
      case 'ENTERPRISE': return 'Enterprise';
      default: return plan;
    }
  }

  getStatusLabel(status: AccountStatus | string): string {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'INACTIVE': return 'Inactive';
      default: return status;
    }
  }

  private runAction(
    request: Observable<unknown>,
    message: string,
    onSuccess: () => void,
  ): void {
    this.actionLoading = true;
    this.errorMessage = '';
    request
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        }),
      )
      .subscribe({
        next: () => {
          onSuccess();
          this.notify(message);
          this.load();
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  private notify(message: string): void {
    this.successMessage = message;
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
  private asStatus(value: string | null): AccountStatus | '' {
    return value === 'ACTIVE' || value === 'INACTIVE' ? value : '';
  }
  private asPlan(value: string | null): CompanyPlan | '' {
    return this.plans.includes(value as CompanyPlan)
      ? (value as CompanyPlan)
      : '';
  }
}
