import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api-config.token';
import { ApiResponse } from '../models/api-response.model';
import {
  AuthenticatedUser,
  AuthenticationJwtPayload,
  AuthSession,
  GoogleAuthResponse,
  GoogleOnboardRequest,
  LoginRequest,
  LoginResponse,
} from '../models/auth.model';
import { AuthStorageService } from './auth-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(AuthStorageService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  private handlingUnauthorized = false;

  readonly session$ = this.sessionSubject.asObservable();
  readonly currentUser$ = this.session$.pipe(map((session) => session?.user ?? null));

  login(credentials: LoginRequest): Observable<AuthSession> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiBaseUrl}/auth/login`, credentials).pipe(
      map((response) => response.data),
      tap((session) => this.setSession(session)),
    );
  }

  googleAuth(credential: string): Observable<GoogleAuthResponse> {
    return this.http
      .post<ApiResponse<GoogleAuthResponse>>(`${this.apiBaseUrl}/auth/google`, { credential })
      .pipe(
        map((response) => response.data),
        tap((data) => {
          if ('token' in data && 'user' in data) {
            this.setSession(data as AuthSession);
          }
        }),
      );
  }

  googleOnboard(data: GoogleOnboardRequest): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${this.apiBaseUrl}/auth/google/onboard`, data)
      .pipe(
        map((response) => response.data),
        tap((session) => this.setSession(session)),
      );
  }

  linkGoogle(credential: string): Observable<AuthenticatedUser> {
    return this.http
      .post<ApiResponse<AuthenticatedUser>>(`${this.apiBaseUrl}/auth/google/link`, { credential })
      .pipe(
        map((response) => response.data),
        tap((user) => {
          const current = this.sessionSubject.value;
          if (current) {
            this.setSession({ ...current, user });
          }
        }),
      );
  }

  unlinkGoogle(): Observable<AuthenticatedUser> {
    return this.http
      .post<ApiResponse<AuthenticatedUser>>(`${this.apiBaseUrl}/auth/google/unlink`, {})
      .pipe(
        map((response) => response.data),
        tap((user) => {
          const current = this.sessionSubject.value;
          if (current) {
            this.setSession({ ...current, user });
          }
        }),
      );
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const session = this.sessionSubject.value ?? this.storage.read();
    return session !== null && !this.isTokenExpired(session.token);
  }

  getToken(): string | null {
    return (this.sessionSubject.value ?? this.storage.read())?.token ?? null;
  }

  getCurrentUser(): AuthenticatedUser | null {
    return this.sessionSubject.value?.user ?? null;
  }

  restoreSession(): Observable<boolean> {
    const stored = this.storage.read();
    if (!stored || this.isTokenExpired(stored.token)) {
      this.clearSession();
      return of(false);
    }

    this.sessionSubject.next(stored);
    return this.http.get<ApiResponse<AuthenticatedUser>>(`${this.apiBaseUrl}/auth/me`).pipe(
      tap((response) => this.setSession({ token: stored.token, user: response.data })),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  clearSession(): void {
    this.storage.clear();
    this.sessionSubject.next(null);
  }

  handleUnauthorized(returnUrl: string): void {
    if (this.handlingUnauthorized) return;
    this.handlingUnauthorized = true;
    this.clearSession();
    const safeReturnUrl = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/dashboard';
    void this.router.navigate(['/login'], { queryParams: { returnUrl: safeReturnUrl } }).finally(() => {
      this.handlingUnauthorized = false;
    });
  }

  private setSession(session: AuthSession): void {
    this.storage.write(session);
    this.sessionSubject.next(session);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = jwtDecode<AuthenticationJwtPayload>(token);
      return !payload.exp || payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
