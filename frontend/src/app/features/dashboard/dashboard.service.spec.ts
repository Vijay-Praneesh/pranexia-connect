import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { DashboardSummary } from './dashboard.model';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const apiBaseUrl = 'https://configured.example/api/v1';
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: apiBaseUrl }],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('calls the summary endpoint from centralized API configuration and unwraps the response', () => {
    const summary = createSummary();
    service.getSummary().subscribe((result) => expect(result).toEqual(summary));
    const request = http.expectOne(`${apiBaseUrl}/dashboard/summary`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ success: true, message: 'Dashboard summary fetched successfully', data: summary });
  });

  it('passes API errors to the caller', () => {
    let status = 0;
    service.getSummary().subscribe({ error: (error) => { status = error.status; } });
    http.expectOne(`${apiBaseUrl}/dashboard/summary`).flush({}, { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
  });
});

export function createSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    campaigns: { total: 6, draft: 1, scheduled: 1, running: 1, completed: 1, failed: 1, cancelled: 1 },
    messages: { totalRecipients: 20, sent: 16, delivered: 12, read: 8, failed: 4 },
    performance: { deliveryRate: 60, readRate: 40, failureRate: 20 },
    ...overrides,
  };
}
