import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { CustomerListData } from '../customers/customer.model';
import { CustomerActivityData } from './notification.model';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService; let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }] }); service = TestBed.inject(NotificationsService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('loads customers from the centralized tenant-scoped endpoint', () => { const data: CustomerListData = { customers: [], pagination: { page: 1, limit: 100, totalRecords: 0, totalPages: 0 } }; service.getCustomers().subscribe((result) => expect(result).toEqual(data)); const req = http.expectOne((request) => request.url === '/api/v1/customers'); expect(req.request.params.get('page')).toBe('1'); expect(req.request.params.get('limit')).toBe('100'); expect(req.request.params.has('companyId')).toBeFalse(); req.flush({ success: true, message: 'ok', data } as ApiResponse<CustomerListData>); });
  it('loads and unwraps the exact customer history endpoint', () => { const data = { customer: { id: 'u1' }, history: [] } as unknown as CustomerActivityData; service.getCustomerActivity('u1').subscribe((result) => expect(result).toEqual(data)); const req = http.expectOne('/api/v1/customers/u1/history'); expect(req.request.method).toBe('GET'); expect(req.request.params.has('companyId')).toBeFalse(); expect(req.request.body).toBeNull(); req.flush({ success: true, message: 'Customer history fetched successfully', data } as ApiResponse<CustomerActivityData>); });
  it('propagates API errors', () => { let status = 0; service.getCustomerActivity('missing').subscribe({ error: (error) => status = error.status }); http.expectOne('/api/v1/customers/missing/history').flush({ success: false, message: 'Not found', errors: null }, { status: 404, statusText: 'Not Found' }); expect(status).toBe(404); });
});

