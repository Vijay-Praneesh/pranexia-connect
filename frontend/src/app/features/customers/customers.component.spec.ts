import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';

import { AuthenticatedUser } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalService } from '../../core/services/confirmation-modal.service';
import { ToastService } from '../../core/services/toast.service';
import { Customer, CustomerDashboardStatistics, CustomerListData } from './customer.model';
import { CustomerService } from './customer.service';
import { CustomersComponent } from './customers.component';

const user: AuthenticatedUser = {
  id: 'user', companyId: 'tenant-from-session', firstName: 'Asha', lastName: null, email: 'asha@example.com', mobile: '9999999999',
  role: 'COMPANY_ADMIN', status: 'ACTIVE', createdAt: '', updatedAt: '',
  company: { id: 'tenant-from-session', companyName: 'Acme Connect', email: 'acme@example.com', mobile: '9999999999', plan: 'STARTER', status: 'ACTIVE', createdAt: '', updatedAt: '' },
};

const mockCustomerStats: CustomerDashboardStatistics = {
  totalCustomers: 120,
  activeCustomers: 110,
  blockedCustomers: 10,
  countries: 2,
  newThisMonth: 15,
};

describe('CustomersComponent', () => {
  let fixture: ComponentFixture<CustomersComponent>;
  let component: CustomersComponent;
  let service: jasmine.SpyObj<CustomerService>;
  let router: jasmine.SpyObj<Router>;
  let modalService: jasmine.SpyObj<ConfirmationModalService>;
  let toastService: jasmine.SpyObj<ToastService>;
  const params$ = new BehaviorSubject(convertToParamMap({}));
  const currentUser = new BehaviorSubject<AuthenticatedUser | null>(user);

  beforeEach(async () => {
    params$.next(convertToParamMap({}));
    service = jasmine.createSpyObj<CustomerService>('CustomerService', [
      'getCustomers', 'searchCustomers', 'getCustomer', 'createCustomer', 'updateCustomer', 'deleteCustomer',
      'bulkDelete', 'bulkStatus', 'importCustomers', 'exportCustomers', 'downloadImportTemplate', 'getDashboardStats',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']); router.navigate.and.resolveTo(true);
    modalService = jasmine.createSpyObj<ConfirmationModalService>('ConfirmationModalService', ['confirm']);
    modalService.confirm.and.callFake(async (config) => {
      if (config.action) {
        const res = config.action();
        if (res && 'subscribe' in res) {
          (res as Observable<unknown>).subscribe();
        }
      }
      return true;
    });
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    service.getCustomers.and.returnValue(of(listData([customer])));
    service.getDashboardStats.and.returnValue(of(mockCustomerStats));
    service.searchCustomers.and.returnValue(of([customer]));
    service.createCustomer.and.returnValue(of(customer)); service.updateCustomer.and.returnValue(of(customer));
    service.deleteCustomer.and.returnValue(of(undefined)); service.bulkDelete.and.returnValue(of(undefined)); service.bulkStatus.and.returnValue(of(undefined));
    service.getCustomer.and.returnValue(of(customer)); service.importCustomers.and.returnValue(of({ imported: 1, skipped: 0, errors: [] }));
    const blobResponse = of(new HttpResponse({ body: new Blob(['excel']), headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="customers.xlsx"' }) }));
    service.exportCustomers.and.returnValue(blobResponse); service.downloadImportTemplate.and.returnValue(blobResponse);

    await TestBed.configureTestingModule({
      imports: [CustomersComponent],
      providers: [
        { provide: CustomerService, useValue: service },
        { provide: AuthService, useValue: { currentUser$: currentUser.asObservable() } },
        { provide: Router, useValue: router },
        { provide: ConfirmationModalService, useValue: modalService },
        { provide: ToastService, useValue: toastService },
        { provide: ActivatedRoute, useValue: { queryParamMap: params$.asObservable(), snapshot: {}, } },
      ],
    }).compileComponents();
  });

  it('renders loading while the list request is pending', () => {
    service.getCustomers.and.returnValue(new Subject<CustomerListData>()); create();
    expect(fixture.nativeElement.querySelector('app-loading-state')).toBeTruthy();
  });

  it('renders customer fields returned by the API', () => {
    create(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Asha Rao'); expect(text).toContain('9999999999'); expect(text).toContain('asha@example.com');
  });

  it('renders summary statistics from the real dashboard API', () => {
    create(); const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Total Contacts');
    expect(text).toContain('120');
    expect(text).toContain('Active Contacts');
    expect(text).toContain('110');
  });

  it('renders an empty state for an empty list', () => {
    service.getCustomers.and.returnValue(of(listData([]))); create();
    expect(fixture.nativeElement.textContent).toContain('No customers found');
  });

  it('debounces search and synchronizes q and page with the URL', fakeAsync(() => {
    create(); component.searchForm.controls.q.setValue('Asha'); tick(350);
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { q: 'Asha', page: 1 }, queryParamsHandling: 'merge' }));
  }));

  it('synchronizes pagination with the URL', () => {
    create(); component.changePage(2);
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { page: 2 } }));
  });

  it('restores pagination and sorting from URL query parameters', () => {
    params$.next(convertToParamMap({ page: '2', limit: '25', sortBy: 'firstName', order: 'ASC' })); create();
    expect(service.getCustomers).toHaveBeenCalledWith({ page: 2, limit: 25, sortBy: 'firstName', order: 'ASC' });
  });

  it('updates supported sorting through URL state', () => {
    create(); component.sort('firstName');
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { sortBy: 'firstName', order: 'ASC', page: 1 } }));
  });

  it('filters by status through URL state', () => {
    create(); component.filterStatus('ACTIVE');
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { status: 'ACTIVE', page: 1 } }));
  });

  it('validates required fields before creating', () => {
    create(); component.openCreate(); component.customerForm.controls.firstName.setValue(''); component.customerForm.controls.mobile.setValue(''); component.save();
    expect(service.createCustomer).not.toHaveBeenCalled(); expect(component.customerForm.controls.firstName.touched).toBeTrue();
  });

  it('creates a customer using the form and reloads the list', () => {
    create(); component.openCreate(); component.customerForm.patchValue({ firstName: 'Asha', mobile: '9999999999', email: 'asha@example.com' }); component.save();
    expect(service.createCustomer).toHaveBeenCalled(); expect(service.getCustomers).toHaveBeenCalledTimes(2); expect(component.editorOpen).toBeFalse();
  });

  it('edits with the complete customer payload', () => {
    create(); component.openEdit(customer); component.customerForm.controls.firstName.setValue('Anika'); component.save();
    expect(service.updateCustomer).toHaveBeenCalledWith('customer-id', jasmine.objectContaining({ firstName: 'Anika', mobile: '9999999999' }));
  });

  it('requires confirmation before deleting and reloads after success', fakeAsync(() => {
    create(); component.remove(customer); tick();
    expect(modalService.confirm).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'Delete Customer?',
      variant: 'danger',
    }));
    expect(service.deleteCustomer).toHaveBeenCalledWith('customer-id');
    expect(service.getCustomers).toHaveBeenCalledTimes(2);
    expect(toastService.success).toHaveBeenCalledWith('Customer deleted successfully.');
  }));

  it('validates and uploads the selected Excel file', () => {
    create(); const file = new File(['sheet'], 'customers.xlsx');
    component.selectImportFile({ target: { files: [file] } } as unknown as Event); component.importCustomers();
    expect(service.importCustomers).toHaveBeenCalledWith(file); expect(component.importResult?.imported).toBe(1);
  });

  it('downloads customer exports and revokes the temporary URL', () => {
    create(); spyOn(URL, 'createObjectURL').and.returnValue('blob:customers'); spyOn(URL, 'revokeObjectURL'); spyOn(HTMLAnchorElement.prototype, 'click');
    component.exportCustomers();
    expect(service.exportCustomers).toHaveBeenCalled(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:customers');
  });

  it('renders API errors and retries', () => {
    service.getCustomers.and.returnValues(throwError(() => new Error('offline')), of(listData([customer]))); create(); fixture.detectChanges();
    const retry = fixture.nativeElement.querySelector('app-error-state button') as HTMLButtonElement; retry.click(); fixture.detectChanges();
    expect(service.getCustomers).toHaveBeenCalledTimes(2);
  });

  function create(): void { fixture = TestBed.createComponent(CustomersComponent); component = fixture.componentInstance; fixture.detectChanges(); }
});

const customer: Customer = {
  id: 'customer-id', firstName: 'Asha', lastName: 'Rao', mobile: '9999999999', email: 'asha@example.com', country: 'India',
  tags: ['lead'], notes: null, status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};
function listData(customers: Customer[]): CustomerListData {
  return { customers, pagination: { page: 1, limit: 10, totalRecords: customers.length, totalPages: customers.length ? 1 : 0 } };
}
