import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { CompanyPlanOverview, PlanDefinition } from './plan.model';
import { PlanService } from './plan.service';

describe('PlanService', () => {
  let service: PlanService;
  let httpTesting: HttpTestingController;
  const baseUrl = 'http://localhost:5000/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        PlanService,
      ],
    });

    service = TestBed.inject(PlanService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch standard plan definitions', () => {
    const mockPlans: PlanDefinition[] = [
      {
        name: 'STARTER',
        displayName: 'Starter',
        tagline: 'Essential',
        limits: { MONTHLY_MESSAGES: 5000 },
      },
    ];

    service.getPlans().subscribe((data) => {
      expect(data).toEqual(mockPlans);
    });

    const req = httpTesting.expectOne(`${baseUrl}/plans`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: mockPlans } as ApiResponse<PlanDefinition[]>);
  });

  it('should fetch current company plan overview with period param', () => {
    const mockOverview: CompanyPlanOverview = {
      plan: { name: 'STARTER', displayName: 'Starter', tagline: 'Essential', customLimits: null },
      metrics: [],
      availablePlans: [],
    };

    service.getCurrentPlanOverview('2026-08').subscribe((data) => {
      expect(data).toEqual(mockOverview);
    });

    const req = httpTesting.expectOne(`${baseUrl}/plans/current?period=2026-08`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: mockOverview } as ApiResponse<CompanyPlanOverview>);
  });

  it('should assign company plan for SUPER_ADMIN', () => {
    const mockOverview: CompanyPlanOverview = {
      plan: { name: 'BUSINESS', displayName: 'Business', tagline: 'Growing', customLimits: null },
      metrics: [],
      availablePlans: [],
    };

    service.assignCompanyPlan('company-1', 'BUSINESS', { MONTHLY_MESSAGES: 30000 }).subscribe((data) => {
      expect(data).toEqual(mockOverview);
    });

    const req = httpTesting.expectOne(`${baseUrl}/plans/assign/company-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ plan: 'BUSINESS', customLimits: { MONTHLY_MESSAGES: 30000 } });
    req.flush({ success: true, message: 'OK', data: mockOverview } as ApiResponse<CompanyPlanOverview>);
  });
});
