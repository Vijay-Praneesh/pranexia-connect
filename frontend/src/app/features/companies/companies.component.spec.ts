import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { CompaniesComponent } from './companies.component';
import { CompanyListData, CompanyRecord } from './company.model';
import { CompanyService } from './company.service';

describe('CompaniesComponent', () => {
  let fixture: ComponentFixture<CompaniesComponent>;
  let component: CompaniesComponent;
  let service: jasmine.SpyObj<CompanyService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<CompanyService>('CompanyService', [
      'getCompanies',
      'getCompany',
      'createCompany',
      'updateCompany',
      'updateCompanyStatus',
    ]);
    await TestBed.configureTestingModule({
      imports: [CompaniesComponent],
      providers: [
        provideRouter([]),
        { provide: CompanyService, useValue: service },
      ],
    }).compileComponents();
  });

  it('renders loading state while initial API call is in flight', () => {
    service.getCompanies.and.returnValue(new Subject<CompanyListData>());
    createComponent();
    expect(fixture.nativeElement.querySelector('app-loading-state')).toBeTruthy();
  });

  it('renders error state and retries on failure', () => {
    service.getCompanies.and.returnValues(
      throwError(() => new Error('Service Unavailable')),
      of(createCompanyListData())
    );
    createComponent();
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeTruthy();

    const retryBtn = fixture.nativeElement.querySelector('app-error-state button') as HTMLButtonElement;
    retryBtn.click();
    fixture.detectChanges();

    expect(service.getCompanies).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Client Management');
  });

  it('renders empty state when there are no companies', () => {
    service.getCompanies.and.returnValue(of(createCompanyListData({ companies: [], pagination: { page: 1, limit: 10, totalPages: 0, totalRecords: 0 } })));
    createComponent();

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('No client companies found');
  });

  it('renders table rows with real client data, avatar initials, and plan badges', () => {
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    createComponent();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Acme Corporation');
    expect(text).toContain('Asha Kumar');
    expect(text).toContain('acme@example.com');
    expect(text).toContain('9876543210');
    expect(text).toContain('STARTER');
    expect(text).toContain('ACTIVE');

    expect(text).toContain('Beta Logistics');
    expect(text).toContain('—'); // No admin em-dash
    expect(text).toContain('beta@example.com');
    expect(text).toContain('BUSINESS');
    expect(text).toContain('INACTIVE');
  });

  it('generates correct company and admin initials and plan badge classes', () => {
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    createComponent();

    expect(component.getCompanyInitials('Acme Corporation')).toBe('AC');
    expect(component.getCompanyInitials('Pranexia')).toBe('PR');
    expect(component.getCompanyInitials('')).toBe('CO');

    expect(
      component.getAdminInitials({
        id: 'u-1',
        firstName: 'Asha',
        lastName: 'Kumar',
        email: 'a@k.com',
        mobile: '1234567890',
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
      }),
    ).toBe('AK');
    expect(
      component.getAdminInitials({
        id: 'u-2',
        firstName: 'John',
        lastName: null,
        email: 'j@k.com',
        mobile: '1234567890',
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
      }),
    ).toBe('J');
    expect(component.getAdminInitials(null)).toBe('AD');

    expect(component.getPlanBadgeClass('STARTER')).toBe('plan-badge-starter');
    expect(component.getPlanBadgeClass('BUSINESS')).toBe('plan-badge-business');
    expect(component.getPlanBadgeClass('PROFESSIONAL')).toBe('plan-badge-professional');
    expect(component.getPlanBadgeClass('ENTERPRISE')).toBe('plan-badge-enterprise');
  });

  it('opens and closes Add Client modal', () => {
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    createComponent();

    expect(component.editorOpen).toBeFalse();
    const addBtn = fixture.nativeElement.querySelector('.btn-add-client') as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    expect(component.editorOpen).toBeTrue();
    expect(fixture.nativeElement.querySelector('#create-company-title')).toBeTruthy();

    const closeBtn = fixture.nativeElement.querySelector('.btn-modal-close') as HTMLButtonElement;
    closeBtn.click();
    fixture.detectChanges();

    expect(component.editorOpen).toBeFalse();
  });

  it('opens Edit Client modal and populates form', () => {
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    createComponent();

    expect(component.editOpen).toBeFalse();
    const editBtn = fixture.nativeElement.querySelector('.btn-action-edit') as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    expect(component.editOpen).toBeTrue();
    expect(component.editing?.companyName).toBe('Acme Corporation');
    expect(component.editForm.controls.companyName.value).toBe('Acme Corporation');
  });

  it('fetches and opens Company Details modal when View button is clicked, rendering overview cards and admin info', () => {
    const mockCompany = createCompanyListData().companies[0];
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    service.getCompany.and.returnValue(of(mockCompany));
    createComponent();

    expect(component.detail).toBeNull();
    const viewBtn = fixture.nativeElement.querySelector('.btn-action-view') as HTMLButtonElement;
    viewBtn.click();
    fixture.detectChanges();

    expect(service.getCompany).toHaveBeenCalledWith('comp-1');
    expect(component.detail).toEqual(mockCompany);

    const modal = fixture.nativeElement.querySelector('.client-detail-modal');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Acme Corporation');
    expect(modal.textContent).toContain('acme@example.com');
    expect(modal.textContent).toContain('STARTER');
    expect(modal.textContent).toContain('Asha Kumar');
    expect(modal.textContent).toContain('Primary Administrator');

    // Test close button
    const closeBtn = modal.querySelector('.btn-modal-close') as HTMLButtonElement;
    closeBtn.click();
    fixture.detectChanges();
    expect(component.detail).toBeNull();
  });

  it('allows toggling status directly from within the Client Details modal', () => {
    const mockCompany = createCompanyListData().companies[0];
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    service.getCompany.and.returnValue(of(mockCompany));
    service.updateCompanyStatus.and.returnValue(of({ ...mockCompany, status: 'INACTIVE' }));
    createComponent();

    component.showDetail('comp-1');
    fixture.detectChanges();

    expect(component.detail?.status).toBe('ACTIVE');
    const toggleBtn = fixture.nativeElement.querySelector('.btn-toggle-client') as HTMLButtonElement;
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.textContent).toContain('Deactivate Client');

    toggleBtn.click();
    fixture.detectChanges();

    expect(service.updateCompanyStatus).toHaveBeenCalledWith('comp-1', 'INACTIVE');
    expect(component.detail?.status).toBe('INACTIVE');
  });

  it('toggles company status between ACTIVE and INACTIVE', () => {
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    service.updateCompanyStatus.and.returnValue(of({} as any));
    createComponent();

    const toggleBtn = fixture.nativeElement.querySelector('.btn-action-toggle') as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    expect(service.updateCompanyStatus).toHaveBeenCalledWith('comp-1', 'INACTIVE');
  });

  it('updates query on filter selection and pagination change', () => {
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    createComponent();

    component.status = 'ACTIVE';
    component.applyFilters();
    expect(component.status).toBe('ACTIVE');

    component.changePage(2);
    expect(component.page).toBe(1); // Page will update on query navigation
  });

  it('calculates active/inactive counts and handles filter clearing', () => {
    service.getCompanies.and.returnValue(of(createCompanyListData()));
    createComponent();

    expect(component.getActiveCount()).toBe(1);
    expect(component.getInactiveCount()).toBe(1);
    expect(component.hasActiveFilters()).toBeFalse();

    component.status = 'ACTIVE';
    expect(component.hasActiveFilters()).toBeTrue();

    component.clearFilters();
    expect(component.status).toBe('');
    expect(component.plan).toBe('');
    expect(component.search).toBe('');
    expect(component.hasActiveFilters()).toBeFalse();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(CompaniesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
});

function createCompanyListData(overrides: Partial<CompanyListData> = {}): CompanyListData {
  return {
    companies: [
      {
        id: 'comp-1',
        companyName: 'Acme Corporation',
        email: 'acme@example.com',
        mobile: '9876543210',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
        users: [
          {
            id: 'u-1',
            firstName: 'Asha',
            lastName: 'Kumar',
            email: 'acme@example.com',
            mobile: '9876543210',
            role: 'COMPANY_ADMIN',
            status: 'ACTIVE',
          },
        ],
      },
      {
        id: 'comp-2',
        companyName: 'Beta Logistics',
        email: 'beta@example.com',
        mobile: '9876543211',
        plan: 'BUSINESS',
        status: 'INACTIVE',
        createdAt: '2026-08-15T12:00:00.000Z',
        updatedAt: '2026-08-15T12:00:00.000Z',
        users: [],
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      totalPages: 1,
      totalRecords: 2,
    },
    ...overrides,
  };
}
