import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API_BASE_URL } from '../config/api-config.token';
import { AuthService } from '../services/auth.service';
import { AuthorizationFeedbackService } from '../services/authorization-feedback.service';
import { authInterceptor } from './auth.interceptor';
import { HttpClient } from '@angular/common/http';

describe('authInterceptor', () => {
  const apiBaseUrl = 'http://api.test/api/v1';
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['getToken', 'handleUnauthorized']);
  const feedback = jasmine.createSpyObj<AuthorizationFeedbackService>('AuthorizationFeedbackService', ['show']);
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    auth.getToken.and.returnValue('jwt-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([]),
        { provide: API_BASE_URL, useValue: apiBaseUrl }, { provide: AuthService, useValue: auth },
        { provide: AuthorizationFeedbackService, useValue: feedback },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('attaches authorization to backend API requests', () => {
    client.get(`${apiBaseUrl}/auth/me`).subscribe();
    expect(http.expectOne(`${apiBaseUrl}/auth/me`).request.headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('does not attach authorization to external requests', () => {
    client.get('https://cdn.example.com/image.png').subscribe();
    expect(http.expectOne('https://cdn.example.com/image.png').request.headers.has('Authorization')).toBeFalse();
  });

  it('handles authenticated 401 responses with the current return URL', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/customers');
    client.get(`${apiBaseUrl}/customers`).subscribe({ error: () => undefined });
    http.expectOne(`${apiBaseUrl}/customers`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.handleUnauthorized).toHaveBeenCalledWith('/customers');
  });

  it('reports 403 responses without clearing the session', () => {
    client.get(`${apiBaseUrl}/customers`).subscribe({ error: () => undefined });
    http.expectOne(`${apiBaseUrl}/customers`).flush(
      { success: false, message: 'Forbidden', errors: null }, { status: 403, statusText: 'Forbidden' },
    );
    expect(feedback.show).toHaveBeenCalledWith('Forbidden');
    expect(auth.handleUnauthorized).not.toHaveBeenCalled();
  });
});
