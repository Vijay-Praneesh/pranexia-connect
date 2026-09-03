import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { OwnerDashboardComponent } from './owner-dashboard.component';
import { OwnerDashboardSummary } from './owner-dashboard.model';
import { OwnerDashboardService } from './owner-dashboard.service';

describe('OwnerDashboardComponent', () => {
  let fixture: ComponentFixture<OwnerDashboardComponent>;
  let component: OwnerDashboardComponent;
  let service: jasmine.SpyObj<OwnerDashboardService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<OwnerDashboardService>('OwnerDashboardService', ['getSummary']);
    await TestBed.configureTestingModule({
      imports: [OwnerDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: OwnerDashboardService, useValue: service },
      ],
    }).compileComponents();
  });

  it('renders loading state while API request is pending', () => {
    service.getSummary.and.returnValue(new Subject<OwnerDashboardSummary>());
    createComponent();
    expect(fixture.nativeElement.querySelector('app-loading-state')).toBeTruthy();
  });

  it('renders error state and retries on failure', () => {
    service.getSummary.and.returnValues(
      throwError(() => new Error('Service Unavailable')),
      of(createOwnerSummary())
    );
    createComponent();
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeTruthy();

    const retryBtn = fixture.nativeElement.querySelector('app-error-state button') as HTMLButtonElement;
    retryBtn.click();
    fixture.detectChanges();

    expect(service.getSummary).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Owner Dashboard');
  });

  it('renders real KPI metrics and plan distribution', () => {
    service.getSummary.and.returnValue(of(createOwnerSummary()));
    createComponent();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('TOTAL CLIENTS');
    expect(text).toContain('ACTIVE CLIENTS');
    expect(text).toContain('INACTIVE CLIENTS');
    expect(text).toContain('TOTAL USERS');
    expect(text).toContain('Plans Overview');
    expect(text).toContain('User Overview');
    expect(text).toContain('Recent Clients');
    expect(text).toContain('Acme Corp');
    expect(text).toContain('acme@example.com');
  });

  it('renders empty state when there are no recent companies', () => {
    service.getSummary.and.returnValue(of(createOwnerSummary({ recentCompanies: [] })));
    createComponent();

    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('No recent clients');
  });

  it('computes correct plan percentages and handles zero safe cases', () => {
    service.getSummary.and.returnValue(of(createOwnerSummary()));
    createComponent();

    expect(component.getPlanPercentage('STARTER')).toBe(75); // 3 of 4 = 75%
    expect(component.getPlanPercentage('BUSINESS')).toBe(25); // 1 of 4 = 25%
    expect(component.getPlanPercentage('PROFESSIONAL')).toBe(0);
    expect(component.getPlanPercentage('ENTERPRISE')).toBe(0);

    // With zero total
    component.summary = createOwnerSummary({ companies: { total: 0, active: 0, inactive: 0 } });
    expect(component.getPlanPercentage('STARTER')).toBe(0);
  });

  it('computes active user percentage safely', () => {
    service.getSummary.and.returnValue(of(createOwnerSummary()));
    createComponent();

    expect(component.getActiveUserPercentage()).toBe(80); // 8 of 10 = 80%
    expect(component.getInactiveUsers()).toBe(2);

    // With zero users
    component.summary = createOwnerSummary({ overview: { totalUsers: 0, activeUsers: 0 } });
    expect(component.getActiveUserPercentage()).toBe(0);
    expect(component.getInactiveUsers()).toBe(0);
  });

  it('computes active client percentage and average users per client', () => {
    service.getSummary.and.returnValue(of(createOwnerSummary()));
    createComponent();

    expect(component.getActiveClientPercentage()).toBe(75); // 3 of 4 = 75%
    expect(component.getAvgUsersPerClient()).toBe('2.5'); // 10 / 4 = 2.5

    // Zero cases
    component.summary = createOwnerSummary({ companies: { total: 0, active: 0, inactive: 0 } });
    expect(component.getActiveClientPercentage()).toBe(0);
    expect(component.getAvgUsersPerClient()).toBe('0.0');
  });

  it('returns appropriate time-based greeting', () => {
    service.getSummary.and.returnValue(of(createOwnerSummary()));
    createComponent();

    const greeting = component.getGreeting();
    expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(greeting);
  });

  it('generates proper company initials and badge classes', () => {
    service.getSummary.and.returnValue(of(createOwnerSummary()));
    createComponent();

    expect(component.getCompanyInitials('Acme Corporation')).toBe('AC');
    expect(component.getCompanyInitials('Pranexia')).toBe('PR');
    expect(component.getCompanyInitials('')).toBe('CO');

    expect(component.getPlanBadgeClass('STARTER')).toBe('plan-badge-starter');
    expect(component.getPlanBadgeClass('BUSINESS')).toBe('plan-badge-business');
    expect(component.getPlanBadgeClass('PROFESSIONAL')).toBe('plan-badge-professional');
    expect(component.getPlanBadgeClass('ENTERPRISE')).toBe('plan-badge-enterprise');
  });

  it('triggers refresh when refresh button is clicked', () => {
    service.getSummary.and.returnValue(of(createOwnerSummary()));
    createComponent();

    const refreshBtn = fixture.nativeElement.querySelector('.btn-refresh') as HTMLButtonElement;
    refreshBtn.click();
    fixture.detectChanges();

    expect(service.getSummary).toHaveBeenCalledTimes(2);
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(OwnerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
});

function createOwnerSummary(overrides: Partial<OwnerDashboardSummary> = {}): OwnerDashboardSummary {
  return {
    companies: { total: 4, active: 3, inactive: 1 },
    plans: { STARTER: 3, BUSINESS: 1, PROFESSIONAL: 0, ENTERPRISE: 0 },
    recentCompanies: [
      {
        id: 'comp-1',
        companyName: 'Acme Corp',
        email: 'acme@example.com',
        mobile: '9876543210',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'comp-2',
        companyName: 'Globex Ltd',
        email: 'contact@globex.com',
        mobile: '9876543211',
        plan: 'BUSINESS',
        status: 'INACTIVE',
        createdAt: '2026-08-15T12:00:00.000Z',
      },
    ],
    overview: { totalUsers: 10, activeUsers: 8 },
    ...overrides,
  };
}
