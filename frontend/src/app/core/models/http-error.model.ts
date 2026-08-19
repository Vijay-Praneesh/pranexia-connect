export type HttpErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'rate-limit'
  | 'server'
  | 'network'
  | 'unknown';

export interface AppHttpError {
  kind: HttpErrorKind;
  status: number;
  message: string;
  errors: unknown | null;
  originalError: unknown;
}
