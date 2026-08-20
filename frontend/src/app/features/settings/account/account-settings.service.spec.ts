import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/config/api-config.token';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuthenticatedUser } from '../../../core/models/auth.model';
import { AccountSettingsService } from './account-settings.service';

describe('AccountSettingsService', () => {
  let service: AccountSettingsService; let http: HttpTestingController;
  const user = { id: 'u1', companyId: 'c1', firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', mobile: '1234567890', role: 'COMPANY_ADMIN', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z', company: { id: 'c1', companyName: 'Pranexia', email: 'company@example.com', mobile: '1234567890', plan: 'STARTER', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' } } as AuthenticatedUser;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }] }); service = TestBed.inject(AccountSettingsService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());

  it('loads and unwraps the exact current-user endpoint', () => { service.getCurrentUser().subscribe((result) => expect(result).toEqual(user)); const req = http.expectOne('/api/v1/auth/me'); expect(req.request.method).toBe('GET'); expect(req.request.params.has('companyId')).toBeFalse(); expect(req.request.body).toBeNull(); const response: ApiResponse<AuthenticatedUser> = { success: true, message: 'User fetched successfully', data: user }; req.flush(response); });
  it('propagates authorization errors', () => { let status = 0; service.getCurrentUser().subscribe({ error: (error) => status = error.status }); http.expectOne('/api/v1/auth/me').flush({ success: false, message: 'Forbidden', errors: null }, { status: 403, statusText: 'Forbidden' }); expect(status).toBe(403); });
});

