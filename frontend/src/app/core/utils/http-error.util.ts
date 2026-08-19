import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse } from '../models/api-response.model';
import { AppHttpError, HttpErrorKind } from '../models/http-error.model';

const statusKinds: Readonly<Record<number, HttpErrorKind>> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  422: 'validation',
  429: 'rate-limit',
};

export function mapHttpError(error: unknown): AppHttpError {
  if (!(error instanceof HttpErrorResponse)) {
    return createError('unknown', 0, 'An unexpected error occurred.', null, error);
  }

  const apiError = isApiErrorResponse(error.error) ? error.error : null;
  const kind = error.status === 0
    ? 'network'
    : statusKinds[error.status] ?? (error.status >= 500 ? 'server' : 'unknown');

  return createError(
    kind,
    error.status,
    apiError?.message ?? defaultMessage(kind),
    apiError?.errors ?? null,
    error,
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Partial<ApiErrorResponse>;
  return response.success === false && typeof response.message === 'string';
}

function createError(
  kind: HttpErrorKind,
  status: number,
  message: string,
  errors: unknown | null,
  originalError: unknown,
): AppHttpError {
  return { kind, status, message, errors, originalError };
}

function defaultMessage(kind: HttpErrorKind): string {
  const messages: Record<HttpErrorKind, string> = {
    unauthorized: 'Authentication is required.',
    forbidden: 'You do not have permission to perform this action.',
    'not-found': 'The requested resource was not found.',
    validation: 'Please review the submitted information.',
    'rate-limit': 'Too many requests. Please try again shortly.',
    server: 'The server could not complete the request.',
    network: 'Unable to reach the server. Check your connection and try again.',
    unknown: 'An unexpected error occurred.',
  };

  return messages[kind];
}
