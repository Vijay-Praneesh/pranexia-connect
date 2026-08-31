import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  CurrentSubscriptionResponse,
  SubscriptionHistoryItem,
  SubscriptionInfo,
} from './subscription.model';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpTesting: HttpTestingController;
  const baseUrl = 'http://localhost:5000/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        SubscriptionService,
      ],
    });

    service = TestBed.inject(SubscriptionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch current subscription and plan overview', () => {
    const mockResponse: CurrentSubscriptionResponse = {
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
        plan: { name: 'BUSINESS', displayName: 'Business', tagline: 'Growing businesses', customLimits: null },
        metrics: [],
        availablePlans: [],
      },
    };

    service.getCurrentSubscription().subscribe((data) => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne(`${baseUrl}/subscriptions/current`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: mockResponse } as ApiResponse<CurrentSubscriptionResponse>);
  });

  it('should fetch subscription history', () => {
    const mockHistory: SubscriptionHistoryItem[] = [
      {
        id: 'hist-1',
        companyId: 'company-1',
        subscriptionId: 'sub-1',
        newPlan: 'BUSINESS',
        newStatus: 'ACTIVE',
        action: 'ACTIVATED',
        source: 'ADMIN',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ];

    service.getSubscriptionHistory(10).subscribe((data) => {
      expect(data).toEqual(mockHistory);
    });

    const req = httpTesting.expectOne(`${baseUrl}/subscriptions/history?limit=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: mockHistory } as ApiResponse<SubscriptionHistoryItem[]>);
  });

  it('should start trial for SUPER_ADMIN', () => {
    const mockSub: SubscriptionInfo = {
      id: 'sub-trial',
      companyId: 'comp-1',
      plan: 'PROFESSIONAL',
      status: 'TRIALING',
      startDate: '2026-08-01',
      currentPeriodStart: '2026-08-01',
      currentPeriodEnd: '2026-08-15',
      trialStart: '2026-08-01',
      trialEnd: '2026-08-15',
      cancelAtPeriodEnd: false,
    };

    service.startTrial('comp-1', { plan: 'PROFESSIONAL', trialDays: 14 }).subscribe((data) => {
      expect(data).toEqual(mockSub);
    });

    const req = httpTesting.expectOne(`${baseUrl}/subscriptions/company/comp-1/trial`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ plan: 'PROFESSIONAL', trialDays: 14 });
    req.flush({ success: true, message: 'OK', data: mockSub } as ApiResponse<SubscriptionInfo>);
  });
});
