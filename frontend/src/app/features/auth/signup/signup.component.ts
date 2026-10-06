import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import { CompanyPlan, GoogleProfile } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { HttpErrorService } from '../../../core/services/http-error.service';
import { SeoService } from '../../../core/services/seo.service';
import { PaymentService } from '../../subscription/payment.service';
import { SubscriptionService } from '../../subscription/subscription.service';
import {
  ONBOARDING_PLANS,
  OnboardingBillingInterval,
  OnboardingPlanSummary,
  OnboardingStep,
  SignupFormData,
  SignupFormErrors,
} from './signup.model';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('googleBtnContainer') googleBtnContainer?: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly paymentService = inject(PaymentService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly httpErrors = inject(HttpErrorService);
  private readonly seo = inject(SeoService);

  private queryParamsSub?: Subscription;
  private googleCredSub?: Subscription;

  // Onboarding Step State
  currentStep: OnboardingStep = 1;
  isStep1Complete = false;
  isStep2Complete = false;
  isStep3Complete = false;

  // Selected Plan Configuration
  selectedPlanKey: 'STARTER' | 'BUSINESS' | 'PROFESSIONAL' = 'BUSINESS';
  selectedBilling: OnboardingBillingInterval = 'MONTHLY';
  selectedPlan: OnboardingPlanSummary = ONBOARDING_PLANS.BUSINESS;

  // Form Model
  formData: SignupFormData = {
    fullName: '',
    companyName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  };
  errors: SignupFormErrors = {};
  showPassword = false;
  showConfirmPassword = false;
  emailAlreadyExists = false;

  // Google Onboarding State
  isGoogleOnboardMode = false;
  isGoogleSubmitting = false;
  googleOnboardingToken = '';
  googleProfile: GoogleProfile | null = null;
  googleCompanyName = '';
  googleMobile = '';
  linkingRequiredMessage = '';

  // Loading & Action States
  isSubmittingAccount = false;
  isProcessingPayment = false;
  isCheckingSession = true;
  paymentErrorMessage = '';
  paymentSuccessMessage = '';

  // Active Razorpay Order details
  activeOrderId: string | null = null;
  activePaymentId: string | null = null;

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Sign Up & Get Started | Seyyon Connect',
      description: 'Start your customer engagement journey with Seyyon Connect. Choose your plan, create your account, and activate your WhatsApp broadcast workspace.',
      canonical: 'https://seyyonconnect.in/signup',
      ogTitle: 'Sign Up & Get Started | Seyyon Connect',
      ogDescription: 'Start your customer engagement journey with Seyyon Connect. Choose your plan, create your account, and activate your WhatsApp broadcast workspace.',
    });

    this.queryParamsSub = this.route.queryParams.subscribe((params) => {
      this.resolvePlanFromParams(params);
    });

    this.checkExistingSession();
  }

  ngAfterViewInit(): void {
    this.initGoogleAuth();
  }

  ngOnDestroy(): void {
    this.queryParamsSub?.unsubscribe();
    this.googleCredSub?.unsubscribe();
  }

  /**
   * Resolve authoritative plan & billing interval from query params
   */
  resolvePlanFromParams(params: Record<string, string>): void {
    const rawPlan = (params['plan'] || '').toUpperCase();
    if (rawPlan === 'STARTER' || rawPlan === 'BUSINESS' || rawPlan === 'PROFESSIONAL') {
      this.selectedPlanKey = rawPlan;
    } else {
      this.selectedPlanKey = 'BUSINESS';
    }

    const rawBilling = (params['billing'] || '').toUpperCase();
    if (rawBilling === 'YEARLY' || rawBilling === 'ANNUAL') {
      this.selectedBilling = 'YEARLY';
    } else {
      this.selectedBilling = 'MONTHLY';
    }

    this.selectedPlan = ONBOARDING_PLANS[this.selectedPlanKey];
  }

  /**
   * Checks if user already has an active or pending account
   */
  checkExistingSession(): void {
    this.isCheckingSession = true;
    if (this.auth.isAuthenticated()) {
      const user = this.auth.getCurrentUser();
      if (user) {
        this.formData.fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        this.formData.email = user.email || '';
        this.formData.mobile = user.mobile || '';
        this.formData.companyName = user.company?.companyName || '';

        this.isStep1Complete = true;
        this.isStep2Complete = true;

        // Check authoritative subscription status from backend
        this.subscriptionService.getCurrentSubscription().pipe(
          finalize(() => {
            this.isCheckingSession = false;
          })
        ).subscribe({
          next: (sub) => {
            if (sub?.subscription && (sub.subscription.status === 'ACTIVE' || sub.subscription.status === 'TRIALING')) {
              // User already has an active subscription; redirect to dashboard
              this.isStep3Complete = true;
              void this.router.navigate(['/dashboard']);
            } else {
              // Land directly on Step 3 for pending payment
              this.currentStep = 3;
            }
          },
          error: () => {
            // If subscription check fails, land on Step 3
            this.currentStep = 3;
          },
        });
        return;
      }
    }
    this.isCheckingSession = false;
  }

  setBillingInterval(interval: OnboardingBillingInterval): void {
    this.selectedBilling = interval;
  }

  goToStep(step: OnboardingStep): void {
    if (step === 1) {
      this.currentStep = 1;
    } else if (step === 2 && this.isStep1Complete) {
      this.currentStep = 2;
    } else if (step === 3 && this.isStep1Complete && this.isStep2Complete) {
      this.currentStep = 3;
    }
  }

  // ==========================================
  // STEP 1 ACTIONS
  // ==========================================
  confirmPlanSelection(): void {
    this.isStep1Complete = true;
    this.currentStep = 2;
    // Auto-focus first form field after rendering
    setTimeout(() => {
      document.getElementById('signup-fullName')?.focus();
    }, 100);
  }

  // ==========================================
  // STEP 2 ACTIONS: ACCOUNT CREATION
  // ==========================================
  onFieldInput(field: keyof SignupFormErrors): void {
    if (this.errors[field]) {
      delete this.errors[field];
    }
    this.errors.general = '';
    this.emailAlreadyExists = false;
    this.linkingRequiredMessage = '';
  }

  validateForm(): boolean {
    const errs: SignupFormErrors = {};
    const name = this.formData.fullName.trim();
    const company = this.formData.companyName.trim();
    const email = this.formData.email.trim();
    const mobile = this.formData.mobile.trim();
    const password = this.formData.password;
    const confirmPassword = this.formData.confirmPassword;

    if (!name) {
      errs.fullName = 'Full Name is required';
    } else if (name.length > 100) {
      errs.fullName = 'Full Name cannot exceed 100 characters';
    }

    if (!company) {
      errs.companyName = 'Business / Company Name is required';
    } else if (company.length < 3) {
      errs.companyName = 'Company name must be at least 3 characters';
    } else if (company.length > 150) {
      errs.companyName = 'Company name cannot exceed 150 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(email) || email.length > 254) {
      errs.email = 'Please enter a valid email address';
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobile) {
      errs.mobile = '10-digit mobile number is required';
    } else if (!mobileRegex.test(mobile)) {
      errs.mobile = 'Mobile number must be exactly 10 digits';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (password.length > 30) {
      errs.password = 'Password cannot exceed 30 characters';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    this.errors = errs;

    if (Object.keys(errs).length > 0) {
      // Focus first invalid field
      setTimeout(() => {
        if (errs.fullName) document.getElementById('signup-fullName')?.focus();
        else if (errs.companyName) document.getElementById('signup-companyName')?.focus();
        else if (errs.email) document.getElementById('signup-email')?.focus();
        else if (errs.mobile) document.getElementById('signup-mobile')?.focus();
        else if (errs.password) document.getElementById('signup-password')?.focus();
        else if (errs.confirmPassword) document.getElementById('signup-confirmPassword')?.focus();
      }, 50);
      return false;
    }

    return true;
  }

  submitAccountCreation(): void {
    if (!this.validateForm() || this.isSubmittingAccount) {
      return;
    }

    this.isSubmittingAccount = true;
    this.errors = {};
    this.emailAlreadyExists = false;
    this.linkingRequiredMessage = '';

    // Parse full name into firstName and lastName
    const fullNameTrimmed = this.formData.fullName.trim();
    const spaceIndex = fullNameTrimmed.indexOf(' ');
    let firstName = fullNameTrimmed;
    let lastName: string | undefined = undefined;

    if (spaceIndex > 0) {
      firstName = fullNameTrimmed.substring(0, spaceIndex).trim();
      lastName = fullNameTrimmed.substring(spaceIndex + 1).trim();
    }

    this.auth.register({
      firstName,
      lastName: lastName || undefined,
      companyName: this.formData.companyName.trim(),
      email: this.formData.email.trim(),
      mobile: this.formData.mobile.trim(),
      password: this.formData.password,
      plan: this.selectedPlanKey,
    }).pipe(
      finalize(() => {
        this.isSubmittingAccount = false;
      })
    ).subscribe({
      next: () => {
        this.isStep2Complete = true;
        this.currentStep = 3;
      },
      error: (err: unknown) => {
        const parsed = this.httpErrors.map(err);
        const msg = (parsed.message || '').toLowerCase();
        if (parsed.status === 409 || msg.includes('already exists') || msg.includes('email')) {
          this.emailAlreadyExists = true;
          this.errors.email = 'An account with this email already exists. Please sign in to continue.';
        } else {
          this.errors.general = parsed.message || 'Account creation failed. Please check your details and try again.';
        }
      },
    });
  }

  // ==========================================
  // GOOGLE ONBOARDING / SIGN-IN
  // ==========================================
  private initGoogleAuth(): void {
    this.googleCredSub = this.googleAuth.credential$.subscribe((credential) => {
      this.handleGoogleCredential(credential);
    });

    if (this.googleAuth.isConfigured()) {
      void this.googleAuth.initializeGoogleId((credential) => {
        this.handleGoogleCredential(credential);
      }).then(() => {
        if (this.googleBtnContainer?.nativeElement) {
          void this.googleAuth.renderButton(this.googleBtnContainer.nativeElement, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: 320,
          });
        }
      });
    }
  }

  /**
   * Trigger Google Sign-In manually (e.g. click on custom styled button)
   */
  signInWithGoogle(): void {
    if (this.isGoogleSubmitting || this.isSubmittingAccount) return;

    this.errors = {};
    this.emailAlreadyExists = false;
    this.linkingRequiredMessage = '';

    if (!this.googleAuth.isConfigured()) {
      this.errors.general = 'Google Sign-In is not configured. Please register with your work email below.';
      return;
    }

    this.isGoogleSubmitting = true;
    void this.googleAuth.initializeGoogleId((credential) => {
      this.handleGoogleCredential(credential);
    }).then((ready) => {
      if (!ready) {
        this.isGoogleSubmitting = false;
        this.errors.general = 'Could not load Google Sign-In. Please check your internet connection or register with email.';
      } else {
        const clicked = this.googleAuth.triggerRenderedButtonClick(this.googleBtnContainer?.nativeElement);
        if (!clicked) {
          this.googleAuth.prompt();
        }
        setTimeout(() => {
          if (this.isGoogleSubmitting && !this.isGoogleOnboardMode && this.currentStep === 2) {
            this.isGoogleSubmitting = false;
          }
        }, 2000);
      }
    });
  }

  handleGoogleCredential(credential: string): void {
    if (!credential || this.isSubmittingAccount) return;

    this.isGoogleSubmitting = true;
    this.errors = {};
    this.emailAlreadyExists = false;
    this.linkingRequiredMessage = '';

    this.auth.googleAuth(credential).pipe(
      finalize(() => {
        this.isGoogleSubmitting = false;
      })
    ).subscribe({
      next: (res) => {
        if ('onboardingRequired' in res && res.onboardingRequired) {
          this.isGoogleOnboardMode = true;
          this.googleOnboardingToken = res.onboardingToken;
          this.googleProfile = res.profile;
          this.googleCompanyName = `${res.profile.firstName || 'My'} Workspace`;
        } else if ('token' in res && 'user' in res) {
          // Existing Google User logged in
          this.subscriptionService.getCurrentSubscription().subscribe({
            next: (sub) => {
              if (sub?.subscription && (sub.subscription.status === 'ACTIVE' || sub.subscription.status === 'TRIALING')) {
                this.isStep1Complete = true;
                this.isStep2Complete = true;
                this.isStep3Complete = true;
                void this.router.navigate(['/dashboard']);
              } else {
                this.isStep1Complete = true;
                this.isStep2Complete = true;
                this.currentStep = 3;
              }
            },
            error: () => {
              this.isStep1Complete = true;
              this.isStep2Complete = true;
              this.currentStep = 3;
            },
          });
        }
      },
      error: (err: unknown) => {
        const httpErr = err as HttpErrorResponse;
        if (httpErr?.status === 409 && (httpErr.error?.code === 'LINKING_REQUIRED' || httpErr.error?.message?.includes('link your Google account'))) {
          this.linkingRequiredMessage = httpErr.error?.message || 'An account with this email already exists. Please sign in with your email and password to link your Google account in Account Settings.';
        } else {
          this.errors.general = this.httpErrors.map(err).message || 'Unable to sign in with Google. Please try again.';
        }
      },
    });
  }

  submitGoogleOnboard(): void {
    if (!this.googleCompanyName.trim()) {
      this.errors.companyName = 'Company name is required';
      return;
    }
    const mobileRegex = /^[0-9]{10}$/;
    if (!this.googleMobile.trim() || !mobileRegex.test(this.googleMobile.trim())) {
      this.errors.mobile = 'Valid 10-digit mobile number is required';
      return;
    }

    this.isSubmittingAccount = true;
    this.errors = {};

    this.auth.googleOnboard({
      onboardingToken: this.googleOnboardingToken,
      companyName: this.googleCompanyName.trim(),
      mobile: this.googleMobile.trim(),
      plan: this.selectedPlanKey,
    }).pipe(
      finalize(() => {
        this.isSubmittingAccount = false;
      })
    ).subscribe({
      next: () => {
        this.isGoogleOnboardMode = false;
        this.isStep2Complete = true;
        this.currentStep = 3;
      },
      error: (err) => {
        const mapped = this.httpErrors.map(err);
        this.errors.general = mapped.message || 'Failed to complete workspace registration. Please try again.';
      },
    });
  }

  cancelGoogleOnboard(): void {
    this.isGoogleOnboardMode = false;
    this.googleOnboardingToken = '';
    this.googleProfile = null;
    this.googleCompanyName = '';
    this.googleMobile = '';
    this.errors = {};
    this.linkingRequiredMessage = '';
  }

  // ==========================================
  // STEP 3 ACTIONS: RAZORPAY PAYMENT
  // ==========================================
  proceedToPayment(): void {
    if (this.isProcessingPayment) return;

    this.isProcessingPayment = true;
    this.paymentErrorMessage = '';
    this.paymentSuccessMessage = '';

    // Step 1: Create Order on Backend (authoritative pricing computed server-side)
    this.paymentService.createOrder({
      plan: this.selectedPlanKey,
      billingInterval: this.selectedBilling,
    }).subscribe({
      next: (order) => {
        this.activeOrderId = order.orderId;
        this.activePaymentId = order.paymentId;
        this.openRazorpayModal(order);
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.paymentErrorMessage = this.httpErrors.map(err).message || 'Unable to create payment order. Please try again.';
      },
    });
  }

  private openRazorpayModal(order: any): void {
    const rzpWindow = window as any;

    if (typeof rzpWindow.Razorpay === 'function') {
      const user = this.auth.getCurrentUser();
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Seyyon Connect',
        description: `${order.planDisplayName || this.selectedPlan.displayName} Plan (${this.selectedBilling})`,
        order_id: order.orderId,
        prefill: {
          name: user?.company?.companyName || user?.firstName || '',
          email: user?.email || '',
          contact: user?.mobile || '',
        },
        theme: {
          color: '#f96614',
        },
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          this.verifyPayment({
            paymentId: order.paymentId,
            orderId: response.razorpay_order_id,
            providerPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            this.isProcessingPayment = false;
            if (!this.paymentErrorMessage) {
              this.paymentErrorMessage = 'Payment was not completed. You can try again whenever you are ready.';
            }
          },
        },
      };

      const rzpInstance = new rzpWindow.Razorpay(options);

      if (typeof rzpInstance.on === 'function') {
        rzpInstance.on('payment.failed', (response: any) => {
          this.isProcessingPayment = false;
          this.paymentErrorMessage =
            response?.error?.description ||
            response?.error?.reason ||
            'Payment was declined or failed at gateway. Please try again.';
        });
      }

      rzpInstance.open();
    } else {
      // If Razorpay SDK not available (e.g. testing or blocked script), load script dynamically
      this.loadRazorpayScript(() => {
        if (typeof (window as any).Razorpay === 'function') {
          this.openRazorpayModal(order);
        } else {
          // Sandbox simulation for development/testing if SDK cannot load
          this.simulateTestPayment(order);
        }
      });
    }
  }

  private loadRazorpayScript(callback: () => void): void {
    const existing = document.getElementById('razorpay-checkout-js');
    if (existing) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => callback();
    script.onerror = () => {
      this.isProcessingPayment = false;
      this.paymentErrorMessage = 'Unable to load secure Razorpay Checkout SDK. Please check your network or try again.';
    };
    document.body.appendChild(script);
  }

  private simulateTestPayment(order: any): void {
    this.verifyPayment({
      paymentId: order.paymentId,
      orderId: order.orderId,
      providerPaymentId: `pay_sim_${Date.now()}`,
      signature: 'test_simulated_signature',
    });
  }

  private verifyPayment(payload: {
    paymentId: string;
    orderId: string;
    providerPaymentId: string;
    signature: string;
  }): void {
    this.paymentService.verifyPayment(payload).pipe(
      finalize(() => {
        this.isProcessingPayment = false;
      })
    ).subscribe({
      next: () => {
        this.isStep3Complete = true;
        this.paymentSuccessMessage = 'Payment verified and plan activated successfully!';
        setTimeout(() => {
          void this.router.navigate(['/dashboard']);
        }, 1200);
      },
      error: (err) => {
        this.paymentErrorMessage = this.httpErrors.map(err).message || 'Payment verification failed. Please contact support if amount was deducted.';
      },
    });
  }

  changePlan(): void {
    void this.router.navigate(['/pricing']);
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }
}
