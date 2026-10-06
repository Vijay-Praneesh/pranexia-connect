import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api-config.token';
import { AuthenticatedUser, AuthSession } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { HttpErrorService } from '../../../core/services/http-error.service';
import { SeoService } from '../../../core/services/seo.service';
import { PaymentService } from '../../subscription/payment.service';
import { SubscriptionService } from '../../subscription/subscription.service';
import { PaymentOrderResponse, VerifyPaymentResponse } from '../../subscription/payment.model';
import { CurrentSubscriptionResponse } from '../../subscription/subscription.model';
import { SignupComponent } from './signup.component';
import { ONBOARDING_PLANS } from './signup.model';

describe('SignupComponent — Multi-Step Onboarding Test Suite', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let router: Router;
  let authService: AuthService;
  let paymentService: PaymentService;
  let subscriptionService: SubscriptionService;
  let googleAuthService: GoogleAuthService;

  let queryParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockUser: AuthenticatedUser = {
    id: 'usr-signup-1',
    companyId: 'comp-signup-1',
    firstName: 'Vijay',
    lastName: 'Praneesh',
    email: 'vijay@example.com',
    mobile: '9876543210',
    role: 'COMPANY_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    company: {
      id: 'comp-signup-1',
      companyName: 'Acme Media',
      email: 'vijay@example.com',
      mobile: '9876543210',
      plan: 'BUSINESS',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  };

  const mockSession: AuthSession = {
    token: 'jwt.mock.token.signup',
    user: mockUser,
  };

  const mockOrderResponse: PaymentOrderResponse = {
    paymentId: 'pay-ord-101',
    orderId: 'order_rzp_mock_101',
    amount: 249900,
    currency: 'INR',
    keyId: 'rzp_test_placeholder',
    plan: 'BUSINESS',
    planDisplayName: 'Business',
    billingInterval: 'MONTHLY',
    displayAmount: '2499.00',
    companyName: 'Acme Media',
    companyEmail: 'vijay@example.com',
  };

  const mockVerifyResponse: VerifyPaymentResponse = {
    success: true,
    payment: {
      id: 'pay-ord-101',
      companyId: 'comp-signup-1',
      provider: 'RAZORPAY',
      providerOrderId: 'order_rzp_mock_101',
      providerPaymentId: 'pay_rzp_mock_101',
      amount: 249900,
      currency: 'INR',
      status: 'CAPTURED',
      paymentType: 'INITIAL_SUBSCRIPTION',
      plan: 'BUSINESS',
      billingInterval: 'MONTHLY',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    subscription: {
      id: 'sub-101',
      companyId: 'comp-signup-1',
      plan: 'BUSINESS',
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
  };

  const mockActiveSubscription: CurrentSubscriptionResponse = {
    subscription: {
      id: 'sub-active',
      companyId: 'comp-signup-1',
      plan: 'BUSINESS',
      status: 'ACTIVE',
      startDate: '2026-09-01T00:00:00Z',
      currentPeriodStart: '2026-09-01T00:00:00Z',
      currentPeriodEnd: '2026-10-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      trialStart: null,
      trialEnd: null,
      pendingPlan: null,
      pendingBillingInterval: null,
      pendingPlanEffectiveAt: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    planOverview: {
      plan: {
        name: 'BUSINESS',
        displayName: 'Business',
        tagline: 'Scale with automation',
        customLimits: null,
      },
      metrics: [],
      availablePlans: [],
    },
  };

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<Record<string, string>>({
      plan: 'business',
      billing: 'monthly',
    });

    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:5000/api/v1' },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable(),
          },
        },
        HttpErrorService,
        SeoService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    paymentService = TestBed.inject(PaymentService);
    subscriptionService = TestBed.inject(SubscriptionService);
    googleAuthService = TestBed.inject(GoogleAuthService);

    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  it('1. Initializes on Step 1 with default Business Monthly plan from query params', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();

    expect(component.currentStep).toBe(1);
    expect(component.selectedPlanKey).toBe('BUSINESS');
    expect(component.selectedBilling).toBe('MONTHLY');
    expect(component.selectedPlan.displayName).toBe('Business');
    expect(component.selectedPlan.formattedMonthly).toBe('₹2,499 / month');
  });

  it('2. Correctly reads Starter plan and Yearly billing from route query params', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    queryParamsSubject.next({ plan: 'starter', billing: 'yearly' });
    fixture.detectChanges();

    expect(component.selectedPlanKey).toBe('STARTER');
    expect(component.selectedBilling).toBe('YEARLY');
    expect(component.selectedPlan.displayName).toBe('Starter');
    expect(component.selectedPlan.formattedYearly).toBe('₹9,990 / year');
  });

  it('3. Correctly reads Professional plan from route query params', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    queryParamsSubject.next({ plan: 'professional', billing: 'monthly' });
    fixture.detectChanges();

    expect(component.selectedPlanKey).toBe('PROFESSIONAL');
    expect(component.selectedBilling).toBe('MONTHLY');
    expect(component.selectedPlan.displayName).toBe('Professional');
    expect(component.selectedPlan.formattedMonthly).toBe('₹5,999 / month');
  });

  it('4. Allows switching billing interval between Monthly and Yearly on Step 1', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();

    component.setBillingInterval('YEARLY');
    expect(component.selectedBilling).toBe('YEARLY');

    component.setBillingInterval('MONTHLY');
    expect(component.selectedBilling).toBe('MONTHLY');
  });

  it('5. Transitions from Step 1 to Step 2 when plan is confirmed', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();

    component.confirmPlanSelection();
    tick(150);

    expect(component.isStep1Complete).toBeTrue();
    expect(component.currentStep).toBe(2);
  }));

  it('6. Step 2 validates required form fields before registration', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();
    component.confirmPlanSelection();

    component.formData = {
      fullName: '',
      companyName: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
    };

    const isValid = component.validateForm();
    expect(isValid).toBeFalse();
    expect(component.errors.fullName).toBe('Full Name is required');
    expect(component.errors.companyName).toBe('Business / Company Name is required');
    expect(component.errors.email).toBe('Email address is required');
    expect(component.errors.mobile).toBe('10-digit mobile number is required');
    expect(component.errors.password).toBe('Password is required');
  });

  it('7. Step 2 validates email format, mobile 10-digit format, and password mismatch', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();
    component.confirmPlanSelection();

    component.formData = {
      fullName: 'Vijay Praneesh',
      companyName: 'Acme Corporation',
      email: 'invalid-email-address',
      mobile: '12345',
      password: 'password123',
      confirmPassword: 'different-password',
    };

    const isValid = component.validateForm();
    expect(isValid).toBeFalse();
    expect(component.errors.email).toBe('Please enter a valid email address');
    expect(component.errors.mobile).toBe('Mobile number must be exactly 10 digits');
    expect(component.errors.confirmPassword).toBe('Passwords do not match');
  });

  it('8. Successfully creates account and advances to Step 3 (Payment Pending)', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(authService, 'register').and.returnValue(of(mockSession));
    fixture.detectChanges();
    component.confirmPlanSelection();

    component.formData = {
      fullName: 'Vijay Praneesh',
      companyName: 'Acme Corporation',
      email: 'vijay@example.com',
      mobile: '9876543210',
      password: 'StrongPassword123',
      confirmPassword: 'StrongPassword123',
    };

    component.submitAccountCreation();

    expect(authService.register).toHaveBeenCalledWith({
      firstName: 'Vijay',
      lastName: 'Praneesh',
      companyName: 'Acme Corporation',
      email: 'vijay@example.com',
      mobile: '9876543210',
      password: 'StrongPassword123',
      plan: 'BUSINESS',
    });
    expect(component.isStep2Complete).toBeTrue();
    expect(component.currentStep).toBe(3);
  });

  it('9. Handles existing email error (409) with helpful message and signin prompt', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(authService, 'register').and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { success: false, message: 'User email already exists' },
          })
      )
    );
    fixture.detectChanges();
    component.confirmPlanSelection();

    component.formData = {
      fullName: 'Vijay Praneesh',
      companyName: 'Acme Corporation',
      email: 'existing@example.com',
      mobile: '9876543210',
      password: 'StrongPassword123',
      confirmPassword: 'StrongPassword123',
    };

    component.submitAccountCreation();

    expect(component.isStep2Complete).toBeFalse();
    expect(component.currentStep).toBe(2);
    expect(component.emailAlreadyExists).toBeTrue();
    expect(component.errors.email).toContain('already exists');
  });

  it('10. Creates Razorpay order and proceeds to payment verification in Step 3', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(true);
    spyOn(authService, 'getCurrentUser').and.returnValue(mockUser);
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(
      of({ ...mockActiveSubscription, subscription: { ...mockActiveSubscription.subscription, status: 'PAST_DUE' } })
    );
    spyOn(paymentService, 'createOrder').and.returnValue(of(mockOrderResponse));
    spyOn(paymentService, 'verifyPayment').and.returnValue(of(mockVerifyResponse));

    (window as any).Razorpay = function (options: any) {
      return {
        open: () => {
          options.handler({
            razorpay_payment_id: 'pay_rzp_mock_101',
            razorpay_order_id: 'order_rzp_mock_101',
            razorpay_signature: 'sig_valid_test',
          });
        },
      };
    };

    fixture.detectChanges();
    tick();

    expect(component.currentStep).toBe(3);

    // Call proceed to payment
    component.proceedToPayment();
    tick(1500);

    expect(paymentService.createOrder).toHaveBeenCalledWith({
      plan: 'BUSINESS',
      billingInterval: 'MONTHLY',
    });
    expect(paymentService.verifyPayment).toHaveBeenCalled();
    expect(component.isStep3Complete).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);

    delete (window as any).Razorpay;
  }));

  it('11. Handles Razorpay payment failure safely without deleting created account', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(true);
    spyOn(authService, 'getCurrentUser').and.returnValue(mockUser);
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(
      of({ ...mockActiveSubscription, subscription: { ...mockActiveSubscription.subscription, status: 'PAST_DUE' } })
    );
    spyOn(paymentService, 'createOrder').and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { success: false, message: 'Gateway timeout' },
          })
      )
    );

    fixture.detectChanges();
    component.proceedToPayment();

    expect(component.isStep3Complete).toBeFalse();
    expect(component.currentStep).toBe(3);
    expect(component.paymentErrorMessage).toBe('Gateway timeout');
  });

  it('12. Survives page refresh: restores Step 2 completed & Payment Pending for authenticated user', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(true);
    spyOn(authService, 'getCurrentUser').and.returnValue(mockUser);
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(
      of({ ...mockActiveSubscription, subscription: { ...mockActiveSubscription.subscription, status: 'EXPIRED' } })
    );

    fixture.detectChanges();
    tick();

    expect(component.isStep1Complete).toBeTrue();
    expect(component.isStep2Complete).toBeTrue();
    expect(component.currentStep).toBe(3);
  }));

  it('13. Automatically redirects to /dashboard if existing authenticated user already has ACTIVE subscription', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(true);
    spyOn(authService, 'getCurrentUser').and.returnValue(mockUser);
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(of(mockActiveSubscription));

    fixture.detectChanges();
    tick();

    expect(component.isStep3Complete).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('14. Change Plan button navigates back to /pricing', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();

    component.changePlan();
    expect(router.navigate).toHaveBeenCalledWith(['/pricing']);
  });

  it('15. Go to Dashboard button navigates to /dashboard', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();

    component.goToDashboard();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('16. Step 2 renders Continue with Google button and OR REGISTER WITH WORK EMAIL divider', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();
    component.confirmPlanSelection();
    tick(150);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const googleBtn = compiled.querySelector('#google-signup-btn');
    expect(googleBtn).toBeTruthy();
    expect(googleBtn?.textContent).toContain('Continue with Google');
    expect(compiled.textContent).toContain('OR REGISTER WITH WORK EMAIL');
  }));

  it('17. signInWithGoogle initializes GIS when configured and triggers Google sign in', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(googleAuthService, 'isConfigured').and.returnValue(true);
    spyOn(googleAuthService, 'initializeGoogleId').and.returnValue(Promise.resolve(true));

    fixture.detectChanges();
    component.confirmPlanSelection();
    tick(150);

    component.signInWithGoogle();
    tick(2500);

    expect(googleAuthService.initializeGoogleId).toHaveBeenCalled();
  }));

  it('18. Handles Google onboardingRequired response for new user and preserves selected Business plan', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(authService, 'googleAuth').and.returnValue(
      of({
        onboardingRequired: true,
        onboardingToken: 'token-google-biz-onboard',
        profile: {
          email: 'founder@newbiz.com',
          firstName: 'Siddharth',
          lastName: 'Sundar',
        },
      })
    );

    fixture.detectChanges();
    component.confirmPlanSelection();
    tick(150);

    component.handleGoogleCredential('google-cred-token-123');
    tick();
    fixture.detectChanges();

    expect(component.isGoogleOnboardMode).toBeTrue();
    expect(component.googleOnboardingToken).toBe('token-google-biz-onboard');
    expect(component.googleProfile?.email).toBe('founder@newbiz.com');
    expect(component.selectedPlanKey).toBe('BUSINESS');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('founder@newbiz.com');
    expect(compiled.querySelector('#google-companyName')).toBeTruthy();
    expect(compiled.querySelector('#google-mobile')).toBeTruthy();
  }));

  it('19. Completes Google onboarding with preserved Business plan and advances to Step 3 (Payment Pending)', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(authService, 'googleOnboard').and.returnValue(of(mockSession));

    fixture.detectChanges();
    component.confirmPlanSelection();
    tick(150);

    component.isGoogleOnboardMode = true;
    component.googleOnboardingToken = 'token-google-biz-onboard';
    component.googleProfile = {
      email: 'founder@newbiz.com',
      firstName: 'Siddharth',
      lastName: 'Sundar',
    };
    component.googleCompanyName = 'Sundar Enterprises';
    component.googleMobile = '9876543210';
    component.selectedPlanKey = 'BUSINESS';

    component.submitGoogleOnboard();
    tick();

    expect(authService.googleOnboard).toHaveBeenCalledWith({
      onboardingToken: 'token-google-biz-onboard',
      companyName: 'Sundar Enterprises',
      mobile: '9876543210',
      plan: 'BUSINESS',
    });
    expect(component.isGoogleOnboardMode).toBeFalse();
    expect(component.isStep2Complete).toBeTrue();
    expect(component.currentStep).toBe(3);
  }));

  it('20. Handles existing Google user with ACTIVE subscription by redirecting to dashboard', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(authService, 'googleAuth').and.returnValue(of(mockSession));
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(of(mockActiveSubscription));

    fixture.detectChanges();
    component.confirmPlanSelection();
    tick(150);

    component.handleGoogleCredential('existing-google-user-token');
    tick();

    expect(component.isStep3Complete).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('21. Handles existing Google user with PAST_DUE subscription by advancing to Step 3 (Payment Pending)', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(authService, 'googleAuth').and.returnValue(of(mockSession));
    spyOn(subscriptionService, 'getCurrentSubscription').and.returnValue(
      of({ ...mockActiveSubscription, subscription: { ...mockActiveSubscription.subscription, status: 'PAST_DUE' } })
    );

    fixture.detectChanges();
    component.confirmPlanSelection();
    tick(150);

    component.handleGoogleCredential('existing-unpaid-google-token');
    tick();

    expect(component.isStep2Complete).toBeTrue();
    expect(component.currentStep).toBe(3);
  }));

  it('22. Displays linking required warning when Google email belongs to unlinked password account', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    const errorResponse = new HttpErrorResponse({
      status: 409,
      error: {
        code: 'LINKING_REQUIRED',
        message: 'An account with this email already exists. Please sign in with your email and password to link your Google account in Account Settings.',
      },
    });
    spyOn(authService, 'googleAuth').and.returnValue(throwError(() => errorResponse));

    fixture.detectChanges();
    component.confirmPlanSelection();
    tick(150);

    component.handleGoogleCredential('unlinked-email-token');
    tick();
    fixture.detectChanges();

    expect(component.linkingRequiredMessage).toContain('link your Google account');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Account Linking Required');
    expect(compiled.querySelector('a[routerlink="/signin"]')).toBeTruthy();
  }));

  it('23. Cancels Google onboarding and returns to standard Step 2 registration form', fakeAsync(() => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    fixture.detectChanges();
    component.confirmPlanSelection();
    tick(150);

    component.isGoogleOnboardMode = true;
    component.googleOnboardingToken = 'token-to-cancel';
    component.googleProfile = {
      email: 'user@cancel.com',
      firstName: 'Cancel',
      lastName: 'User',
    };

    component.cancelGoogleOnboard();
    tick();
    fixture.detectChanges();

    expect(component.isGoogleOnboardMode).toBeFalse();
    expect(component.googleOnboardingToken).toBe('');
    expect(component.googleProfile).toBeNull();
  }));
});
