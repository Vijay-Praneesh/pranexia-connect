import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { AuthenticatedUser } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { DistributionChartComponent } from './components/distribution-chart/distribution-chart.component';
import { DashboardComponent } from './dashboard.component';
import { DashboardSummary } from './dashboard.model';
import { DashboardService } from './dashboard.service';

@Component({ selector: 'app-distribution-chart', standalone: true, template: '' })
class ChartStubComponent {
  @Input() labels: string[] = [];
  @Input() values: number[] = [];
  @Input() colors: string[] = [];
  @Input() ariaLabel = '';
}

const user: AuthenticatedUser = {
  id: 'user', companyId: 'tenant-from-session', firstName: 'Asha', lastName: null, email: 'asha@example.com', mobile: '9999999999',
  role: 'COMPANY_ADMIN', status: 'ACTIVE', createdAt: '', updatedAt: '',
  company: { id: 'tenant-from-session', companyName: 'Acme Connect', email: 'acme@example.com', mobile: '9999999999', plan: 'STARTER', status: 'ACTIVE', createdAt: '', updatedAt: '' },
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let service: jasmine.SpyObj<DashboardService>;
  const currentUser = new BehaviorSubject<AuthenticatedUser | null>(user);

  beforeEach(async () => {
    service = jasmine.createSpyObj<DashboardService>('DashboardService', ['getSummary']);
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardService, useValue: service },
        { provide: AuthService, useValue: { currentUser$: currentUser.asObservable() } },
      ],
    }).overrideComponent(DashboardComponent, {
      remove: { imports: [DistributionChartComponent] },
      add: { imports: [ChartStubComponent] },
    }).compileComponents();
  });

  it('renders the loading state while the API request is pending', () => {
    service.getSummary.and.returnValue(new Subject<DashboardSummary>());
    createComponent();
    expect(fixture.nativeElement.querySelector('app-loading-state')).toBeTruthy();
  });

  it('renders real dashboard values', () => {
    service.getSummary.and.returnValue(of(createSummary()));
    createComponent();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Total campaigns');
    expect(text).toContain('Total recipients');
    expect(text).toContain('Delivery rate');
  });

  it('renders a valid zero-data response as an empty state', () => {
    service.getSummary.and.returnValue(of(createSummary({
      campaigns: { total: 0, draft: 0, scheduled: 0, running: 0, completed: 0, failed: 0, cancelled: 0 },
      messages: { totalRecipients: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
      performance: { deliveryRate: 0, readRate: 0, failureRate: 0 },
    })));
    createComponent();
    expect(fixture.nativeElement.textContent).toContain('No campaign activity yet');
  });

  it('retries after an initial API error', () => {
    service.getSummary.and.returnValues(throwError(() => new Error('offline')), of(createSummary()));
    createComponent();
    const retry = fixture.nativeElement.querySelector('app-error-state button') as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    expect(service.getSummary).toHaveBeenCalledTimes(2);
  });

  it('displays authenticated user and company context', () => {
    service.getSummary.and.returnValue(of(createSummary()));
    createComponent();
    expect(fixture.nativeElement.textContent).toContain('Welcome, Asha · Acme Connect');
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
  }
});

function createSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    campaigns: { total: 6, draft: 1, scheduled: 1, running: 1, completed: 1, failed: 1, cancelled: 1 },
    messages: { totalRecipients: 20, sent: 16, delivered: 12, read: 8, failed: 4 },
    performance: { deliveryRate: 60, readRate: 40, failureRate: 20 },
    ...overrides,
  };
}
