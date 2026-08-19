import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API_BASE_URL } from '../config/api-config.token';
import { AuthenticatedUser } from '../models/auth.model';
import { AuthService } from './auth.service';

const apiBaseUrl = 'http://api.test/api/v1';
const token = createToken(Date.now() + 60_000);
const user: AuthenticatedUser = {
  id: 'user-id', companyId: 'company-id', firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com',
  mobile: '9999999999', role: 'COMPANY_ADMIN', status: 'ACTIVE', createdAt: '', updatedAt: '',
  company: { id: 'company-id', companyName: 'Example Co', email: 'team@example.com', mobile: '9999999999', plan: 'STARTER', status: 'ACTIVE', createdAt: '', updatedAt: '' },
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: API_BASE_URL, useValue: apiBaseUrl }],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('logs in and stores the returned session', () => {
    service.login({ email: 'asha@example.com', password: 'secret' }).subscribe((session) => expect(session.user).toEqual(user));
    const request = http.expectOne(`${apiBaseUrl}/auth/login`);
    expect(request.request.body).toEqual({ email: 'asha@example.com', password: 'secret' });
    request.flush({ success: true, message: 'Login successful', data: { token, user } });
    expect(service.getToken()).toBe(token);
    expect(service.getCurrentUser()).toEqual(user);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('passes login failures to the caller without creating a session', () => {
    let received: HttpErrorResponse | undefined;
    service.login({ email: 'asha@example.com', password: 'wrong' }).subscribe({ error: (error) => { received = error; } });
    http.expectOne(`${apiBaseUrl}/auth/login`).flush(
      { success: false, message: 'Invalid email or password', errors: null },
      { status: 401, statusText: 'Unauthorized' },
    );
    expect(received?.status).toBe(401);
    expect(service.getToken()).toBeNull();
  });

  it('retrieves a valid stored token', () => {
    localStorage.setItem('pranexia-connect.auth-session', JSON.stringify({ token, user }));
    expect(service.getToken()).toBe(token);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('logs out, clears the session, and navigates to login', () => {
    localStorage.setItem('pranexia-connect.auth-session', JSON.stringify({ token, user }));
    spyOn(router, 'navigate').and.resolveTo(true);
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});

function createToken(expiresAt: number): string {
  const payload = btoa(JSON.stringify({ id: 'user-id', companyId: 'company-id', role: 'COMPANY_ADMIN', exp: Math.floor(expiresAt / 1000), iat: 1 }));
  return `header.${payload}.signature`;
}
