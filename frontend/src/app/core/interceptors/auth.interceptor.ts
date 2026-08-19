import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api-config.token';
import { ApiErrorResponse } from '../models/api-response.model';
import { AuthService } from '../services/auth.service';
import { AuthorizationFeedbackService } from '../services/authorization-feedback.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const feedback = inject(AuthorizationFeedbackService);
  const apiBaseUrl = inject(API_BASE_URL);
  const isApiRequest = request.url === apiBaseUrl || request.url.startsWith(`${apiBaseUrl}/`);
  const token = auth.getToken();

  const authenticatedRequest = isApiRequest && token && !request.headers.has('Authorization')
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isApiRequest) {
        const isLoginRequest = request.url === `${apiBaseUrl}/auth/login`;
        if (error.status === 401 && token && !isLoginRequest && !router.url.startsWith('/login')) {
          auth.handleUnauthorized(router.url);
        } else if (error.status === 403 && !isLoginRequest) {
          const response = error.error as Partial<ApiErrorResponse> | null;
          feedback.show(response?.message ?? 'You do not have permission to perform this action.');
        }
      }

      return throwError(() => error);
    }),
  );
};
