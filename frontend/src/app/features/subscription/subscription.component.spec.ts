import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionComponent } from './subscription.component';
import {
  CurrentSubscriptionResponse,
  SubscriptionHistoryItem,
} from './subscription.model';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionComponent', () => {
  let component: SubscriptionComponent;
  let fixture: ComponentFixture<SubscriptionComponent>;
  let subscriptionService: SubscriptionService;

  const mockCurrentResponse: CurrentSubscriptionResponse = {
    subscription: {
      id: 'sub-1',
      companyId: 'company-1',
      plan: 'BUSINESS',
      status: 'ACTIVE',
      startDate: '2026-08-01T00:00:00.000Z',
      currentPeriodStart: '2026-08-01T00:00:00.000Z',
      currentPeriodEnd: '2026-08-31T23:59:59.999Z',
      cancelAtPeriodEnd: false,
    },
    planOverview: {
      plan: {
        name: 'BUSINESS',
        displayName: 'Business',
        tagline: 'Growing business plan',
        customLimits: null,
      },
      metrics: [
        {
          metric: 'MONTHLY_MESSAGES',
          label: 'WhatsApp Messages',
          description: 'Monthly messages',
          unit: 'messages',
          isMonthly: true,
          currentUsage: 5000,
          limit: 25000,
          remaining: 20000,
          percentage: 20,
          status: 'NORMAL',
        },
      ],
      availablePlans: [
        {
          name: 'STARTER',
          displayName: 'Starter',
          tagline: 'Starter tier',
          limits: { MONTHLY_MESSAGES: 5000 },
        },
        {
          name: 'BUSINESS',
          displayName: 'Business',
          tagline: 'Business tier',
          limits: { MONTHLY_MESSAGES: 25000 },
        },
      ],
    },
  };

  const mockHistory: SubscriptionHistoryItem[] = [
    {
      id: 'hist-1',
      companyId: 'company-1',
      subscriptionId: 'sub-1',
      previousPlan: 'STARTER',
      newPlan: 'BUSINESS',
      newStatus: 'ACTIVE',
      action: 'PLAN_CHANGED',
      source: 'ADMIN',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  const mockUser = {
    id: 'user-1',
    role: 'COMPANY_ADMIN',
    company: { id: 'company-1', companyName: 'Acme Corp' },
  };

  const mockAuthService = {
    getCurrentUser: () => mockUser,
    currentUser$: of(mockUser),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000/api/v1' },
        { provide: AuthService, useValue: mockAuthService },
        SubscriptionService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionComponent);
    component = fixture.componentInstance;
    subscriptionService = TestBed.inject(SubscriptionService);
  });

  it('should create and load initial subscription details and history', () => {
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(
      of(mockCurrentResponse)
    );
    spyOn(subscriptionService, 'getSubscriptionHistory').and.returnValue(
      of(mockHistory)
    );

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.subscription).toEqual(mockCurrentResponse.subscription);
    expect(component.planOverview).toEqual(mockCurrentResponse.planOverview);
    expect(component.history).toEqual(mockHistory);
    expect(component.isTrialing).toBe(false);
    expect(component.isCancelled).toBe(false);
    expect(component.isExpired).toBe(false);
    expect(component.loading).toBe(false);
  });

  it('should handle error when fetching subscription fails', () => {
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Server Error' } }))
    );
    spyOn(subscriptionService, 'getSubscriptionHistory').and.returnValue(
      of([])
    );

    fixture.detectChanges();

    expect(component.errorMessage).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it('should toggle plan comparison view', () => {
    expect(component.showPlanComparison).toBe(false);
    component.togglePlanComparison();
    expect(component.showPlanComparison).toBe(true);
    component.togglePlanComparison();
    expect(component.showPlanComparison).toBe(false);
  });

  it('should map threshold status to correct progress bar class', () => {
    expect(component.getProgressBarClass('NORMAL')).toBe('bg-primary');
    expect(component.getProgressBarClass('WARNING')).toBe('bg-info text-dark');
    expect(component.getProgressBarClass('CRITICAL')).toBe('bg-warning text-dark');
    expect(component.getProgressBarClass('EXHAUSTED')).toBe('bg-danger');
    expect(component.getProgressBarClass('OVER_LIMIT')).toBe('bg-danger');
  });

  it('should format bytes accurately', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
    expect(component.formatBytes(1073741824)).toBe('1 GB');
  });
});
