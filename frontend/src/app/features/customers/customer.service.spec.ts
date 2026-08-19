import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { Customer, CustomerWriteRequest } from './customer.model';
import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  const apiBaseUrl = 'https://configured.example/api/v1';
  const endpoint = `${apiBaseUrl}/customers`;
  let service: CustomerService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: apiBaseUrl }] });
    service = TestBed.inject(CustomerService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists with supported pagination and sorting and unwraps the response', () => {
    service.getCustomers({ page: 2, limit: 10, sortBy: 'firstName', order: 'ASC' }).subscribe((data) => expect(data.customers).toEqual([customer]));
    const request = http.expectOne((req) => req.url === endpoint);
    expect(request.request.params.get('page')).toBe('2'); expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('sortBy')).toBe('firstName'); expect(request.request.params.get('order')).toBe('ASC');
    expect(request.request.params.has('companyId')).toBeFalse();
    request.flush({ success: true, message: 'ok', data: { customers: [customer], pagination: { page: 2, limit: 10, totalRecords: 11, totalPages: 2 } } });
  });

  it('searches using the exact q parameter', () => {
    service.searchCustomers('Asha').subscribe();
    const request = http.expectOne(`${endpoint}/search?q=Asha`);
    expect(request.request.params.get('q')).toBe('Asha');
    request.flush({ success: true, message: 'ok', data: [] });
  });

  it('creates without sending companyId', () => {
    service.createCustomer(writeRequest).subscribe();
    const request = http.expectOne(endpoint); expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(writeRequest); expect(request.request.body.companyId).toBeUndefined();
    request.flush({ success: true, message: 'created', data: customer });
  });

  it('updates with PUT and the complete validated payload', () => {
    service.updateCustomer('customer-id', writeRequest).subscribe();
    const request = http.expectOne(`${endpoint}/customer-id`); expect(request.request.method).toBe('PUT'); expect(request.request.body).toEqual(writeRequest);
    request.flush({ success: true, message: 'updated', data: customer });
  });

  it('deletes the customer endpoint', () => {
    service.deleteCustomer('customer-id').subscribe();
    const request = http.expectOne(`${endpoint}/customer-id`); expect(request.request.method).toBe('DELETE');
    request.flush({ success: true, message: 'deleted', data: null });
  });

  it('imports multipart FormData using the file field', () => {
    const file = new File(['sheet'], 'customers.xlsx'); service.importCustomers(file).subscribe();
    const request = http.expectOne(`${endpoint}/import`); expect(request.request.body instanceof FormData).toBeTrue();
    expect((request.request.body as FormData).get('file')).toBe(file); expect(request.request.headers.has('Content-Type')).toBeFalse();
    request.flush({ success: true, message: 'imported', data: { imported: 1, skipped: 0, errors: [] } });
  });

  it('exports customers as a Blob response', () => {
    service.exportCustomers().subscribe((response) => expect(response.body instanceof Blob).toBeTrue());
    const request = http.expectOne(`${endpoint}/export`); expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['excel']));
  });

  it('sends only supported bulk fields', () => {
    service.bulkStatus(['one'], 'BLOCKED').subscribe();
    const request = http.expectOne(`${endpoint}/bulk-status`); expect(request.request.body).toEqual({ customerIds: ['one'], status: 'BLOCKED' });
    expect(request.request.body.companyId).toBeUndefined(); request.flush({ success: true, message: 'ok', data: null });
  });

  it('propagates API errors', () => {
    let status = 0; service.getCustomers().subscribe({ error: (error) => { status = error.status; } });
    http.expectOne(endpoint).flush({}, { status: 500, statusText: 'Server Error' }); expect(status).toBe(500);
  });
});

const writeRequest: CustomerWriteRequest = { firstName: 'Asha', lastName: 'Rao', mobile: '9999999999', email: 'asha@example.com', country: 'India', tags: ['lead'], notes: null, status: 'ACTIVE' };
const customer: Customer = { id: 'customer-id', ...writeRequest, tags: ['lead'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
