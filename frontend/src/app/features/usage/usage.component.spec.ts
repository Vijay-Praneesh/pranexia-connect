import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { AuthService } from '../../core/services/auth.service';
import { CompanyPlanOverview } from '../plans/plan.model';
import { PlanService } from '../plans/plan.service';
import { UsageComponent } from './usage.component';
import { UsageSummary } from './usage.model';
import { UsageService } from './usage.service';

describe('UsageComponent', () => {
  let component: UsageComponent;
  let fixture: ComponentFixture<UsageComponent>;
  let usageService: UsageService;
  let planService: PlanService;

  const mockSummary: UsageSummary = {
    period: {
      period: '2026-08',
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-08-31T23:59:59.999Z',
    },
    saas: {
      messages: { sent: 200, delivered: 180, read: 140, failed: 5 },
      campaigns: { created: 4, completed: 4 },
      media: { uploadedCount: 2, uploadedBytes: 4000000, activeFileCount: 6, activeStorageBytes: 12000000 },
      templates: { used: 3 },
    },
    meta: {
      status: 'SYNCED',
      wabaId: 'waba-test',
      syncedAt: '2026-08-15T12:00:00.000Z',
      currency: null,
      amount: null,
      costAvailable: false,
      marketingConversations: 160,
      utilityConversations: 20,
      authenticationConversations: 0,
      serviceConversations: 0,
      totalConversations: 180,
    },
  };

  const mockPlanOverview: CompanyPlanOverview = {
    plan: {
      name: 'STARTER',
      displayName: 'Starter',
      tagline: 'Essential WhatsApp messaging',
      customLimits: null,
    },
    metrics: [
      {
        metric: 'MONTHLY_MESSAGES',
        label: 'WhatsApp Messages',
        description: 'Monthly messages',
        unit: 'messages',
        isMonthly: true,
        currentUsage: 200,
        limit: 5000,
        remaining: 4800,
        percentage: 4,
        status: 'NORMAL',
      },
      {
        metric: 'CUSTOMERS',
        label: 'Contacts / Customers',
        description: 'Total contacts',
        unit: 'contacts',
        isMonthly: false,
        currentUsage: 850,
        limit: 1000,
        remaining: 150,
        percentage: 85,
        status: 'WARNING',
      },
    ],
    availablePlans: [
      {
        name: 'STARTER',
        displayName: 'Starter',
        tagline: 'Starter tier',
        limits: { MONTHLY_MESSAGES: 5000, CUSTOMERS: 1000 },
      },
      {
        name: 'BUSINESS',
        displayName: 'Business',
        tagline: 'Business tier',
        limits: { MONTHLY_MESSAGES: 25000, CUSTOMERS: 10000 },
      },
    ],
  };

  const mockUser = {
    id: 'user-1',
    role: 'COMPANY_ADMIN',
    company: { id: 'company-a', companyName: 'Acme Corp' },
  };

  const mockAuthService = {
    getCurrentUser: () => mockUser,
    currentUser$: of(mockUser),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000/api/v1' },
        { provide: AuthService, useValue: mockAuthService },
        UsageService,
        PlanService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsageComponent);
    component = fixture.componentInstance;
    usageService = TestBed.inject(UsageService);
    planService = TestBed.inject(PlanService);
  });

  it('should create and load initial usage summary, plan overview and history', () => {
    spyOn(usageService, 'getSummary').and.returnValue(of(mockSummary));
    spyOn(planService, 'getCurrentPlanOverview').and.returnValue(of(mockPlanOverview));
    spyOn(usageService, 'getHistory').and.returnValue(of([]));

    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.summary).toEqual(mockSummary);
    expect(component.planOverview).toEqual(mockPlanOverview);
    expect(component.deliveryRate).toBe(90);
    expect(component.readRate).toBe(70);
    expect(component.loading).toBe(false);
  });

  it('should toggle plan comparison view', () => {
    expect(component.showPlanComparison).toBe(false);
    component.togglePlanComparison();
    expect(component.showPlanComparison).toBe(true);
    component.togglePlanComparison();
    expect(component.showPlanComparison).toBe(false);
  });

  it('should map threshold status to correct progress bar class and badge tone', () => {
    expect(component.getProgressBarClass('NORMAL')).toBe('bg-primary');
    expect(component.getProgressBarClass('WARNING')).toBe('bg-info text-dark');
    expect(component.getProgressBarClass('CRITICAL')).toBe('bg-warning text-dark');
    expect(component.getProgressBarClass('EXHAUSTED')).toBe('bg-danger');
    expect(component.getProgressBarClass('OVER_LIMIT')).toBe('bg-danger');

    expect(component.getStatusBadgeTone('NORMAL')).toBe('success');
    expect(component.getStatusBadgeTone('WARNING')).toBe('warning');
    expect(component.getStatusBadgeTone('CRITICAL')).toBe('warning');
    expect(component.getStatusBadgeTone('EXHAUSTED')).toBe('danger');
    expect(component.getStatusBadgeTone('OVER_LIMIT')).toBe('danger');
  });

  it('should handle error when fetching usage summary or plan fails', () => {
    spyOn(usageService, 'getSummary').and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'Server Error' } }))
    );
    spyOn(planService, 'getCurrentPlanOverview').and.returnValue(of(mockPlanOverview));
    spyOn(usageService, 'getHistory').and.returnValue(of([]));

    fixture.detectChanges();

    expect(component.errorMessage).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it('should trigger Meta sync and reload on success', () => {
    spyOn(usageService, 'getSummary').and.returnValue(of(mockSummary));
    spyOn(planService, 'getCurrentPlanOverview').and.returnValue(of(mockPlanOverview));
    spyOn(usageService, 'getHistory').and.returnValue(of([]));
    spyOn(usageService, 'syncMetaUsage').and.returnValue(
      of({
        status: 'SYNCED',
        message: 'Synced',
        syncedAt: '2026-08-15',
        data: {},
      })
    );

    fixture.detectChanges();
    component.syncMeta();

    expect(usageService.syncMetaUsage).toHaveBeenCalledWith(component.selectedPeriod);
    expect(component.metaFeedbackMessage).toBe('Synced');
  });

  it('should format bytes accurately', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
    expect(component.formatBytes(1073741824)).toBe('1 GB');
  });
});
