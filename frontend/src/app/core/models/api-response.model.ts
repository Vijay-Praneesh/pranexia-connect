export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: unknown | null;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;
