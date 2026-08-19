import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] }));

  it('allows authenticated navigation', () => {
    auth.isAuthenticated.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/dashboard' } as RouterStateSnapshot));
    expect(result).toBeTrue();
  });

  it('redirects unauthenticated users to login with the return URL', () => {
    auth.isAuthenticated.and.returnValue(false);
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/campaigns/123' } as RouterStateSnapshot)) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fcampaigns%2F123');
  });
});
