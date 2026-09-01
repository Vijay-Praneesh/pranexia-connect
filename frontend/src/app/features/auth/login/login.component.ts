import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import { HttpErrorService } from '../../../core/services/http-error.service';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { GoogleProfile } from '../../../core/models/auth.model';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, ErrorStateComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleBtnContainer') googleBtnContainer?: ElementRef<HTMLElement>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly errors = inject(HttpErrorService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private googleCredSub?: Subscription;

  // View state: 'login' | 'onboard'
  viewState: 'login' | 'onboard' = 'login';

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly onboardForm = this.formBuilder.nonNullable.group({
    companyName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
  });

  submitting = false;
  googleSubmitting = false;
  showPassword = false;
  errorMessage = '';
  linkingRequiredMessage = '';

  // Stored for onboarding
  onboardingToken = '';
  googleProfile: GoogleProfile | null = null;

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl(this.safeReturnUrl(this.auth.getCurrentUser()?.role));
    }
  }

  ngAfterViewInit(): void {
    // Listen for credentials emitted from Google Identity Services
    this.googleCredSub = this.googleAuthService.credential$.subscribe((credential) => {
      this.handleGoogleCredential(credential);
    });

    // Initialize GIS if configured
    if (this.googleAuthService.isConfigured()) {
      void this.googleAuthService.initializeGoogleId((credential) => {
        this.handleGoogleCredential(credential);
      }).then(() => {
        if (this.googleBtnContainer?.nativeElement) {
          void this.googleAuthService.renderButton(this.googleBtnContainer.nativeElement, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: 320,
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.googleCredSub?.unsubscribe();
  }

  submit(): void {
    if (this.form.invalid || this.submitting || this.googleSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.linkingRequiredMessage = '';

    this.auth.login(this.form.getRawValue()).pipe(
      finalize(() => { this.submitting = false; }),
    ).subscribe({
      next: (session) => void this.router.navigateByUrl(this.safeReturnUrl(session.user.role)),
      error: (error: HttpErrorResponse) => {
        const mapped = this.errors.map(error);
        this.errorMessage = error.status === 401 ? 'Invalid email or password.' : mapped.message;
      },
    });
  }

  /**
   * Trigger Google Sign-In manually (e.g. click on custom styled button)
   */
  signInWithGoogle(): void {
    if (this.googleSubmitting || this.submitting) return;

    this.errorMessage = '';
    this.linkingRequiredMessage = '';

    if (!this.googleAuthService.isConfigured()) {
      this.errorMessage = 'Google Sign-In is not configured. Please sign in with your email and password.';
      return;
    }

    this.googleSubmitting = true;
    void this.googleAuthService.initializeGoogleId((credential) => {
      this.handleGoogleCredential(credential);
    }).then((ready) => {
      if (!ready) {
        this.googleSubmitting = false;
        this.errorMessage = 'Could not load Google Sign-In. Please check your internet connection.';
      }
    });
  }

  /**
   * Process verified Google ID credential
   */
  handleGoogleCredential(credential: string): void {
    if (!credential || this.submitting) return;

    this.googleSubmitting = true;
    this.errorMessage = '';
    this.linkingRequiredMessage = '';

    this.auth.googleAuth(credential).pipe(
      finalize(() => { this.googleSubmitting = false; }),
    ).subscribe({
      next: (res) => {
        if ('onboardingRequired' in res && res.onboardingRequired) {
          // Switch to onboarding flow
          this.onboardingToken = res.onboardingToken;
          this.googleProfile = res.profile;
          this.viewState = 'onboard';
        } else if ('token' in res && 'user' in res) {
          // Successful login
          void this.router.navigateByUrl(this.safeReturnUrl(res.user.role));
        }
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 409 && (error.error?.code === 'LINKING_REQUIRED' || error.error?.message?.includes('link your Google account'))) {
          this.linkingRequiredMessage = error.error?.message || 'An account with this email already exists. Please log in with your email and password to connect your Google account in Account Settings.';
        } else {
          const mapped = this.errors.map(error);
          this.errorMessage = mapped.message || 'Google Sign-In failed. Please try again.';
        }
      },
    });
  }

  /**
   * Submit Google Onboarding form to create company and admin user
   */
  submitOnboard(): void {
    if (this.onboardForm.invalid || this.submitting) {
      this.onboardForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const payload = {
      onboardingToken: this.onboardingToken,
      companyName: this.onboardForm.controls.companyName.value,
      mobile: this.onboardForm.controls.mobile.value,
    };

    this.auth.googleOnboard(payload).pipe(
      finalize(() => { this.submitting = false; }),
    ).subscribe({
      next: (session) => {
        void this.router.navigateByUrl(this.safeReturnUrl(session.user.role));
      },
      error: (error: HttpErrorResponse) => {
        const mapped = this.errors.map(error);
        this.errorMessage = mapped.message || 'Failed to complete company setup. Please check the details and try again.';
      },
    });
  }

  /**
   * Cancel onboarding and return to normal login screen
   */
  cancelOnboard(): void {
    this.viewState = 'login';
    this.onboardingToken = '';
    this.googleProfile = null;
    this.errorMessage = '';
    this.linkingRequiredMessage = '';
    this.onboardForm.reset();
  }

  private safeReturnUrl(role = this.auth.getCurrentUser()?.role): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) return returnUrl;
    return role === 'SUPER_ADMIN' ? '/owner-dashboard' : '/dashboard';
  }
}

