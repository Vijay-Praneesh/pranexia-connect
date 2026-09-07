import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Observable, Subject, takeUntil } from 'rxjs';

import { CustomerStatus } from '../../core/models/domain-status.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalService } from '../../core/services/confirmation-modal.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { Customer, CustomerDashboardStatistics, CustomerImportResult, CustomerListData, CustomerListQuery, CustomerWriteRequest } from './customer.model';
import { CustomerService } from './customer.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly customersApi = inject(CustomerService);
  private readonly errors = inject(HttpErrorService);
  private readonly modalService = inject(ConfirmationModalService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  private readonly searchChanges = new Subject<string>();

  customers: Customer[] = [];
  stats: CustomerDashboardStatistics | null = null;
  selected = new Set<string>();
  page = 1;
  limit = 10;
  totalRecords = 0;
  totalPages = 0;
  q = '';
  statusFilter: CustomerStatus | 'ALL' = 'ALL';
  sortBy: 'firstName' | 'mobile' | 'email' | 'status' | 'createdAt' = 'createdAt';
  order: 'ASC' | 'DESC' = 'DESC';
  loading = true;
  actionLoading = false;
  errorMessage = '';
  successMessage = '';
  editorOpen = false;
  importOpen = false;
  editing: Customer | null = null;
  detail: Customer | null = null;
  importFile: File | null = null;
  importResult: CustomerImportResult | null = null;

  readonly searchForm = this.formBuilder.nonNullable.group({ q: [''] });
  readonly customerForm = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: [''],
    mobile: ['', Validators.required],
    email: ['', Validators.email],
    country: ['India', Validators.required],
    tags: [''],
    notes: [''],
    status: ['ACTIVE' as CustomerStatus, Validators.required],
  });

  constructor() {
    this.searchChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => {
        void this.updateQuery({ q: q.trim() || null, page: 1 });
      });

    this.searchForm.controls.q.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.searchChanges.next(value));

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.q = params.get('q')?.trim() ?? '';
      this.page = Math.max(1, Number(params.get('page')) || 1);
      this.limit = Math.max(1, Math.min(100, Number(params.get('limit')) || 10));
      this.sortBy = (params.get('sortBy') as typeof this.sortBy) || 'createdAt';
      this.order = params.get('order') === 'ASC' ? 'ASC' : 'DESC';
      const rawStatus = params.get('status')?.toUpperCase();
      this.statusFilter = (rawStatus === 'ACTIVE' || rawStatus === 'BLOCKED' ? rawStatus : 'ALL') as CustomerStatus | 'ALL';
      this.searchForm.controls.q.setValue(this.q, { emitEvent: false });
      this.load();
      this.loadStats();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.selected.clear();

    const query: CustomerListQuery = {
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
      order: this.order,
    };
    if (this.statusFilter !== 'ALL') {
      query.status = this.statusFilter;
    }

    const request: Observable<Customer[] | CustomerListData> = this.q
      ? this.customersApi.searchCustomers(this.q)
      : this.customersApi.getCustomers(query);

    request
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (result) => {
          if (Array.isArray(result)) {
            this.customers = result;
            this.totalRecords = result.length;
            this.totalPages = result.length ? 1 : 0;
            this.page = 1;
          } else {
            this.customers = result.customers;
            this.totalRecords = result.pagination.totalRecords;
            this.totalPages = result.pagination.totalPages;
          }
        },
        error: (error) => {
          this.errorMessage = this.errors.map(error).message;
        },
      });
  }

  loadStats(): void {
    this.customersApi.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: () => {
        // Non-blocking: stats are optional summary
      },
    });
  }

  changePage(page: number): void {
    void this.updateQuery({ page });
  }

  sort(field: 'firstName' | 'mobile' | 'email' | 'status' | 'createdAt'): void {
    const order = this.sortBy === field && this.order === 'ASC' ? 'DESC' : 'ASC';
    void this.updateQuery({ sortBy: field, order, page: 1 });
  }

  filterStatus(status: CustomerStatus | 'ALL'): void {
    this.statusFilter = status;
    void this.updateQuery({
      status: status === 'ALL' ? null : status,
      page: 1,
    });
  }

  clearSearch(): void {
    this.searchForm.controls.q.setValue('');
    void this.updateQuery({ q: null, page: 1 });
  }

  clearAllFilters(): void {
    this.statusFilter = 'ALL';
    this.searchForm.controls.q.setValue('');
    void this.updateQuery({ q: null, status: null, page: 1 });
  }

  openCreate(): void {
    this.editing = null;
    this.customerForm.reset({
      firstName: '',
      lastName: '',
      mobile: '',
      email: '',
      country: 'India',
      tags: '',
      notes: '',
      status: 'ACTIVE',
    });
    this.editorOpen = true;
  }

  openEdit(customer: Customer): void {
    this.editing = customer;
    this.customerForm.reset({
      firstName: customer.firstName,
      lastName: customer.lastName ?? '',
      mobile: customer.mobile,
      email: customer.email ?? '',
      country: customer.country,
      tags: customer.tags?.join(', ') ?? '',
      notes: customer.notes ?? '',
      status: customer.status,
    });
    this.editorOpen = true;
  }

  save(): void {
    if (this.customerForm.invalid || this.actionLoading) {
      this.customerForm.markAllAsTouched();
      return;
    }
    const raw = this.customerForm.getRawValue();
    const payload: CustomerWriteRequest = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim() || null,
      mobile: raw.mobile.trim(),
      email: raw.email.trim() || null,
      country: raw.country.trim(),
      tags: raw.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: raw.notes.trim() || null,
      status: raw.status,
    };
    this.actionLoading = true;
    this.errorMessage = '';
    const request = this.editing
      ? this.customersApi.updateCustomer(this.editing.id, payload)
      : this.customersApi.createCustomer(payload);

    request
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.editorOpen = false;
          this.notify(
            this.editing
              ? 'Customer updated successfully.'
              : 'Customer created successfully.'
          );
          this.load();
          this.loadStats();
        },
        error: (error) => {
          const msg = this.errors.map(error).message;
          this.errorMessage = msg;
          this.toastService.error(msg);
        },
      });
  }

  showDetail(id: string): void {
    this.actionLoading = true;
    this.customersApi
      .getCustomer(id)
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        })
      )
      .subscribe({
        next: (customer) => {
          this.detail = customer;
        },
        error: (error) => {
          const msg = this.errors.map(error).message;
          this.errorMessage = msg;
          this.toastService.error(msg);
        },
      });
  }

  remove(customer: Customer): void {
    const fullName = `${customer.firstName} ${customer.lastName ?? ''}`.trim();
    this.modalService
      .confirm({
        title: 'Delete Customer?',
        message: `Are you sure you want to delete "${fullName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: 'bi-trash3-fill',
        action: () => this.customersApi.deleteCustomer(customer.id),
      })
      .then((confirmed) => {
        if (confirmed) {
          if (this.detail?.id === customer.id) {
            this.detail = null;
          }
          this.toastService.success('Customer deleted successfully.');
          this.afterDelete(1);
          this.loadStats();
        }
      })
      .catch((error) => {
        const msg =
          this.errors.map(error).message ||
          'Failed to delete customer. Please try again.';
        this.toastService.error(msg);
      });
  }

  toggle(id: string, checked: boolean): void {
    checked ? this.selected.add(id) : this.selected.delete(id);
  }

  toggleAll(checked: boolean): void {
    this.selected.clear();
    if (checked) {
      this.customers.forEach((customer) => this.selected.add(customer.id));
    }
  }

  bulkStatus(status: CustomerStatus): void {
    this.runBulk(
      this.customersApi.bulkStatus([...this.selected], status),
      `Selected customers marked ${status.toLowerCase()}.`
    );
  }

  bulkDelete(): void {
    if (!this.selected.size) return;
    const count = this.selected.size;
    this.modalService
      .confirm({
        title: 'Delete Customers?',
        message: `Are you sure you want to delete ${count} selected customer${
          count === 1 ? '' : 's'
        }? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: 'bi-trash3-fill',
        action: () => this.customersApi.bulkDelete([...this.selected]),
      })
      .then((confirmed) => {
        if (confirmed) {
          this.toastService.success('Selected customers deleted.');
          this.afterDelete(count);
          this.loadStats();
        }
      })
      .catch((error) => {
        const msg =
          this.errors.map(error).message ||
          'Failed to delete selected customers.';
        this.toastService.error(msg);
      });
  }

  selectImportFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.importFile = file;
    this.errorMessage = '';
    if (
      file &&
      (!/\.(xlsx|xls)$/i.test(file.name) || file.size > 5 * 1024 * 1024)
    ) {
      this.importFile = null;
      const msg = 'Select an Excel .xlsx or .xls file no larger than 5 MB.';
      this.errorMessage = msg;
      this.toastService.warning(msg);
    }
  }

  importCustomers(): void {
    if (!this.importFile || this.actionLoading) return;
    this.actionLoading = true;
    this.importResult = null;
    this.customersApi
      .importCustomers(this.importFile)
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        })
      )
      .subscribe({
        next: (result) => {
          this.importResult = result;
          this.notify('Customer import completed.');
          this.load();
          this.loadStats();
        },
        error: (error) => {
          const msg = this.errors.map(error).message;
          this.errorMessage = msg;
          this.toastService.error(msg);
        },
      });
  }

  exportCustomers(): void {
    this.download(
      this.customersApi.exportCustomers(),
      `customers_${Date.now()}.xlsx`,
      'Customer export downloaded.'
    );
  }

  downloadTemplate(): void {
    this.download(
      this.customersApi.downloadImportTemplate(),
      'customer_import_template.xlsx',
      'Import template downloaded.'
    );
  }

  getInitials(firstName: string, lastName?: string | null): string {
    const f = (firstName || '').trim().charAt(0).toUpperCase();
    const l = (lastName || '').trim().charAt(0).toUpperCase();
    return f + (l || f ? l : '');
  }

  getAvatarToneClass(name: string): string {
    const tones = ['tone-indigo', 'tone-blue', 'tone-emerald', 'tone-amber', 'tone-sky'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = (hash + name.charCodeAt(i)) % tones.length;
    }
    return tones[hash] || 'tone-indigo';
  }

  private runBulk(
    request: ReturnType<CustomerService['bulkDelete']>,
    message: string,
    removesCustomers = false
  ): void {
    if (!this.selected.size || this.actionLoading) return;
    this.actionLoading = true;
    const affected = this.selected.size;
    request
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.notify(message);
          removesCustomers ? this.afterDelete(affected) : this.load();
          this.loadStats();
        },
        error: (error) => {
          const msg = this.errors.map(error).message;
          this.errorMessage = msg;
          this.toastService.error(msg);
        },
      });
  }

  private afterDelete(removed: number): void {
    if (!this.q && this.customers.length <= removed && this.page > 1) {
      void this.updateQuery({ page: this.page - 1 });
    } else {
      this.load();
    }
  }

  private download(
    request: ReturnType<CustomerService['exportCustomers']>,
    fallback: string,
    message: string
  ): void {
    if (this.actionLoading) return;
    this.actionLoading = true;
    request
      .pipe(
        finalize(() => {
          this.actionLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          const disposition = response.headers.get('Content-Disposition');
          const filename =
            disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback;
          const url = URL.createObjectURL(response.body ?? new Blob());
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          anchor.click();
          URL.revokeObjectURL(url);
          this.notify(message);
        },
        error: (error) => {
          const msg = this.errors.map(error).message;
          this.errorMessage = msg;
          this.toastService.error(msg);
        },
      });
  }

  private notify(message: string): void {
    this.successMessage = message;
    this.toastService.success(message);
    setTimeout(() => {
      this.successMessage = '';
    }, 4000);
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
}
