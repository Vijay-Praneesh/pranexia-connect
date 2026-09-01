import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { API_BASE_URL } from '../../../core/config/api-config.token';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { AuthSession, AuthenticatedUser } from '../../../core/models/auth.model';
import { LoginComponent } from './login.component';

const mockUser: AuthenticatedUser = {
  id: 'usr-1',
  companyId: 'comp-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  mobile: '9876543210',
  role: 'COMPANY_ADMIN',
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
  company: {
    id: 'comp-1',
    companyName: 'Acme Corp',
    email: 'test@example.com',
    mobile: '9876543210',
    plan: 'STARTER',
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
  },
};

const mockSession: AuthSession = {
  token: 'mock.jwt.token',
  user: mockUser,
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let googleAuthService: jasmine.SpyObj<GoogleAuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'googleAuth',
      'googleOnboard',
      'isAuthenticated',
      'getCurrentUser',
    ]);
    googleAuthService = jasmine.createSpyObj<GoogleAuthService>('GoogleAuthService', [
      'isConfigured',
      'initializeGoogleId',
      'renderButton',
    ], {
      credential$: of(),
      error$: of(),
    });

    authService.isAuthenticated.and.returnValue(false);
    authService.getCurrentUser.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://api.test/api/v1' },
        { provide: AuthService, useValue: authService },
        { provide: GoogleAuthService, useValue: googleAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates component and renders login form and Google button', () => {
    expect(component).toBeTruthy();
    expect(component.viewState).toBe('login');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#google-signin-btn')).toBeTruthy();
    expect(compiled.querySelector('#email')).toBeTruthy();
    expect(compiled.querySelector('#password')).toBeTruthy();
  });

  it('submits email and password login successfully and navigates to dashboard', () => {
    authService.login.and.returnValue(of(mockSession));

    component.form.setValue({
      email: 'test@example.com',
      password: 'valid-password',
    });

    component.submit();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'valid-password',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('handles Google login success and navigates to dashboard', () => {
    authService.googleAuth.and.returnValue(of(mockSession));

    component.handleGoogleCredential('google-id-token-abc');

    expect(authService.googleAuth).toHaveBeenCalledWith('google-id-token-abc');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(component.viewState).toBe('login');
  });

  it('handles Google onboardingRequired response and switches to onboarding view', () => {
    authService.googleAuth.and.returnValue(
      of({
        onboardingRequired: true,
        onboardingToken: 'signed-onboarding-token',
        profile: {
          email: 'newgoogle@example.com',
          firstName: 'New',
          lastName: 'User',
        },
      })
    );

    component.handleGoogleCredential('new-google-credential');

    expect(component.viewState).toBe('onboard');
    expect(component.onboardingToken).toBe('signed-onboarding-token');
    expect(component.googleProfile?.email).toBe('newgoogle@example.com');

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#companyName')).toBeTruthy();
    expect(compiled.querySelector('#mobile')).toBeTruthy();
  });

  it('submits onboarding form and completes workspace setup', () => {
    component.viewState = 'onboard';
    component.onboardingToken = 'signed-onboarding-token';
    component.googleProfile = {
      email: 'newgoogle@example.com',
      firstName: 'New',
      lastName: 'User',
    };
    fixture.detectChanges();

    authService.googleOnboard.and.returnValue(of(mockSession));

    component.onboardForm.setValue({
      companyName: 'New Google Company',
      mobile: '9876543210',
    });

    component.submitOnboard();

    expect(authService.googleOnboard).toHaveBeenCalledWith({
      onboardingToken: 'signed-onboarding-token',
      companyName: 'New Google Company',
      mobile: '9876543210',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('displays linking required warning message when Google email exists on password account', () => {
    const errorResponse = new HttpErrorResponse({
      status: 409,
      error: {
        code: 'LINKING_REQUIRED',
        message: 'An account with this email already exists. Please log in with your email and password to link your Google account in Account Settings.',
      },
    });

    authService.googleAuth.and.returnValue(throwError(() => errorResponse));

    component.handleGoogleCredential('unlinked-token');

    expect(component.linkingRequiredMessage).toContain('link your Google account');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Account Linking Required');
  });

  it('cancels onboarding and returns to login view', () => {
    component.viewState = 'onboard';
    component.onboardingToken = 'signed-onboarding-token';

    component.cancelOnboard();

    expect(component.viewState).toBe('login');
    expect(component.onboardingToken).toBe('');
  });
});
