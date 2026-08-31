import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  CreatePaymentOrderRequest,
  PaymentHistoryResponse,
  PaymentOrderResponse,
  PaymentRecord,
  PricingMatrixResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from './payment.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Get public commercial pricing matrix
   */
  getPricingMatrix(): Observable<PricingMatrixResponse> {
    return this.http
      .get<ApiResponse<PricingMatrixResponse>>(`${this.baseUrl}/payments/pricing`)
      .pipe(map((res) => res.data));
  }

  /**
   * Create a server-side payment order
   */
  createOrder(payload: CreatePaymentOrderRequest): Observable<PaymentOrderResponse> {
    return this.http
      .post<ApiResponse<PaymentOrderResponse>>(`${this.baseUrl}/payments/order`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * Cryptographically verify payment and activate subscription
   */
  verifyPayment(payload: VerifyPaymentRequest): Observable<VerifyPaymentResponse> {
    return this.http
      .post<ApiResponse<VerifyPaymentResponse>>(`${this.baseUrl}/payments/verify`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * Get tenant-scoped payment history
   */
  getPaymentHistory(limit = 20, offset = 0): Observable<PaymentHistoryResponse> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http
      .get<ApiResponse<PaymentHistoryResponse>>(`${this.baseUrl}/payments/history`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Get single payment details
   */
  getPaymentById(paymentId: string): Observable<PaymentRecord> {
    return this.http
      .get<ApiResponse<PaymentRecord>>(`${this.baseUrl}/payments/${paymentId}`)
      .pipe(map((res) => res.data));
  }

  /**
   * SUPER_ADMIN: Get all platform payments
   */
  getPlatformPayments(
    limit = 50,
    offset = 0,
    filter: { status?: string; plan?: string; companyId?: string } = {}
  ): Observable<PaymentHistoryResponse> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.plan) params = params.set('plan', filter.plan);
    if (filter.companyId) params = params.set('companyId', filter.companyId);

    return this.http
      .get<ApiResponse<PaymentHistoryResponse>>(`${this.baseUrl}/payments/admin/all`, { params })
      .pipe(map((res) => res.data));
  }
}
