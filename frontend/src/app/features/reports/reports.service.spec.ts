import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { CampaignListData, CampaignRecipientListData, CampaignReport } from '../campaigns/campaign.model';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService; let http: HttpTestingController;
  const envelope = <T>(data: T): ApiResponse<T> => ({ success: true, message: 'ok', data });
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }] }); service = TestBed.inject(ReportsService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());

  it('loads campaigns using the centralized API and backend sorting', () => { const data: CampaignListData = { campaigns: [], pagination: { page: 1, limit: 100, totalRecords: 0, totalPages: 0 } }; service.getCampaigns().subscribe((result) => expect(result).toEqual(data)); const req = http.expectOne((request) => request.url === '/api/v1/campaigns'); expect(req.request.params.get('page')).toBe('1'); expect(req.request.params.get('limit')).toBe('100'); expect(req.request.params.get('sortBy')).toBe('created_at'); expect(req.request.params.get('order')).toBe('DESC'); expect(req.request.params.has('companyId')).toBeFalse(); req.flush(envelope(data)); });
  it('loads and unwraps the exact campaign report endpoint', () => { const report = { campaignId: 'c1', campaignName: 'Launch', status: 'COMPLETED', totalRecipients: 4, sentCount: 4, deliveredCount: 3, readCount: 2, failedCount: 0, progress: 100, deliveryRate: 75, readRate: 50, failureRate: 0, startedAt: null, completedAt: null } as CampaignReport; service.getCampaignReport('c1').subscribe((result) => expect(result).toEqual(report)); const req = http.expectOne('/api/v1/campaigns/c1/report'); expect(req.request.method).toBe('GET'); expect(req.request.params.has('companyId')).toBeFalse(); req.flush(envelope(report)); });
  it('loads recipients with exact pagination, campaign and status filters', () => { const data: CampaignRecipientListData = { recipients: [], pagination: { page: 2, limit: 10, totalRecords: 11, totalPages: 2 } }; service.getRecipients({ campaignId: 'c1', page: 2, limit: 10, sortBy: 'createdAt', order: 'DESC', status: 'READ' }).subscribe((result) => expect(result).toEqual(data)); const req = http.expectOne((request) => request.url === '/api/v1/campaign-recipients'); expect(req.request.params.get('campaignId')).toBe('c1'); expect(req.request.params.get('page')).toBe('2'); expect(req.request.params.get('limit')).toBe('10'); expect(req.request.params.get('sortBy')).toBe('createdAt'); expect(req.request.params.get('status')).toBe('READ'); expect(req.request.params.has('companyId')).toBeFalse(); req.flush(envelope(data)); });
  it('propagates API errors', () => { let status = 0; service.getCampaignReport('missing').subscribe({ error: (error) => status = error.status }); http.expectOne('/api/v1/campaigns/missing/report').flush({ success: false, message: 'Not found', errors: null }, { status: 404, statusText: 'Not Found' }); expect(status).toBe(404); });
});

