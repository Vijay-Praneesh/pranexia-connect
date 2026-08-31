import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { UsageHistoryItem, UsageSummary } from './usage.model';
import { UsageService } from './usage.service';

describe('UsageService', () => {
  let service: UsageService;
  let httpTesting: HttpTestingController;
  const baseUrl = 'http://localhost:5000/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        UsageService,
      ],
    });

    service = TestBed.inject(UsageService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch usage summary with period parameter', () => {
    const mockSummary: UsageSummary = {
      period: {
        period: '2026-08',
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-31T23:59:59.999Z',
      },
      saas: {
        messages: { sent: 100, delivered: 90, read: 70, failed: 2 },
        campaigns: { created: 3, completed: 3 },
        media: { uploadedCount: 5, uploadedBytes: 1000000, activeFileCount: 4, activeStorageBytes: 800000 },
        templates: { used: 2 },
      },
      meta: {
        status: 'SYNCED',
        wabaId: 'waba-123',
        syncedAt: '2026-08-15T12:00:00.000Z',
        currency: null,
        amount: null,
        costAvailable: false,
        marketingConversations: 80,
        utilityConversations: 20,
        authenticationConversations: 0,
        serviceConversations: 5,
        totalConversations: 105,
      },
    };

    service.getSummary('2026-08').subscribe((data) => {
      expect(data).toEqual(mockSummary);
    });

    const req = httpTesting.expectOne(`${baseUrl}/usage/summary?period=2026-08`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: mockSummary } as ApiResponse<UsageSummary>);
  });

  it('should fetch usage history with limit parameter', () => {
    const mockHistory: UsageHistoryItem[] = [
      {
        period: '2026-08',
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-31T23:59:59.999Z',
        messages: { sent: 100, delivered: 90, read: 70, failed: 2 },
        campaigns: { created: 3, completed: 3 },
        media: { uploadedCount: 5, uploadedBytes: 1000000 },
        templates: { used: 2 },
        meta: { status: 'SYNCED', syncedAt: null, currency: null, amount: null, totalConversations: 100 },
      },
    ];

    service.getHistory(6).subscribe((data) => {
      expect(data.length).toBe(1);
      expect(data[0].period).toBe('2026-08');
    });

    const req = httpTesting.expectOne(`${baseUrl}/usage/history?limit=6`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'OK', data: mockHistory } as ApiResponse<UsageHistoryItem[]>);
  });

  it('should post to sync Meta usage', () => {
    service.syncMetaUsage('2026-08').subscribe((result) => {
      expect(result.status).toBe('SYNCED');
    });

    const req = httpTesting.expectOne(`${baseUrl}/usage/meta/sync`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ period: '2026-08' });
    req.flush({
      success: true,
      message: 'Meta synchronized',
      data: { status: 'SYNCED', message: 'Meta synchronized', syncedAt: '2026-08-15', data: {} },
    });
  });
});
