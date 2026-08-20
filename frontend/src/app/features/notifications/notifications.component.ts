import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { HttpErrorService } from '../../core/services/http-error.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { Customer } from '../customers/customer.model';
import { CustomerActivityData, CustomerActivityRecord, NotificationCapabilities } from './notification.model';
import { NotificationsService } from './notifications.service';
@Component({ selector: 'app-notifications', standalone: true, imports: [DatePipe, ReactiveFormsModule, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, StatusBadgeComponent], templateUrl: './notifications.component.html', styleUrl: './notifications.component.scss' })
export class NotificationsComponent {
  private readonly api = inject(NotificationsService); private readonly auth = inject(AuthService); private readonly errors = inject(HttpErrorService); private readonly fb = inject(FormBuilder);
  readonly isCompanyAdmin = this.auth.getCurrentUser()?.role === 'COMPANY_ADMIN';
  readonly capabilities: NotificationCapabilities = { notifications: false, unreadState: false, unreadCount: false, generalActivity: false, customerCampaignHistory: true };
  readonly selectionForm = this.fb.nonNullable.group({ customerId: [''] });
  customers: Customer[] = []; selectedCustomer: Customer | null = null; activity: CustomerActivityRecord[] = []; customersLoading = false; activityLoading = false; errorMessage = '';
  constructor() { this.selectionForm.controls.customerId.valueChanges.subscribe((id) => { this.selectedCustomer = this.customers.find((customer) => customer.id === id) ?? null; this.activity = []; if (id) this.loadActivity(id); }); if (this.isCompanyAdmin) this.loadCustomers(); }
  loadCustomers(): void { if (this.customersLoading || !this.isCompanyAdmin) return; this.customersLoading = true; this.errorMessage = ''; this.api.getCustomers().pipe(finalize(() => { this.customersLoading = false; })).subscribe({ next: (data) => { this.customers = data.customers; }, error: (error) => { this.errorMessage = this.errors.map(error).message; } }); }
  loadActivity(customerId = this.selectionForm.controls.customerId.value): void { if (!customerId || this.activityLoading || !this.isCompanyAdmin) return; this.activityLoading = true; this.errorMessage = ''; this.api.getCustomerActivity(customerId).pipe(finalize(() => { this.activityLoading = false; })).subscribe({ next: (data: CustomerActivityData) => { this.selectedCustomer = data.customer; this.activity = data.history; }, error: (error) => { this.errorMessage = this.errors.map(error).message; } }); }
  refresh(): void { const id = this.selectionForm.controls.customerId.value; id ? this.loadActivity(id) : this.loadCustomers(); }
  activityTime(item: CustomerActivityRecord): string { return item.readAt || item.deliveredAt || item.sentAt || item.updatedAt || item.createdAt; }
}
