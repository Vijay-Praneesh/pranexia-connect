import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  AdminCompanySubscriptionResponse,
  CurrentSubscriptionResponse,
  SubscriptionHistoryItem,
  SubscriptionInfo,
} from './subscription.model';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Get current subscription and plan limits for the authenticated company
   */
  getCurrentSubscription(): Observable<CurrentSubscriptionResponse> {
    return this.http
      .get<ApiResponse<CurrentSubscriptionResponse>>(`${this.baseUrl}/subscriptions/current`)
      .pipe(map((res) => res.data));
  }

  /**
   * Get chronological subscription transition history
   */
  getSubscriptionHistory(limit = 50): Observable<SubscriptionHistoryItem[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http
      .get<ApiResponse<SubscriptionHistoryItem[]>>(`${this.baseUrl}/subscriptions/history`, {
        params,
      })
      .pipe(map((res) => res.data));
  }

  /**
   * SUPER_ADMIN: Get subscription and overview for a specific company
   */
  getCompanySubscription(companyId: string): Observable<AdminCompanySubscriptionResponse> {
    return this.http
      .get<ApiResponse<AdminCompanySubscriptionResponse>>(
        `${this.baseUrl}/subscriptions/company/${companyId}`
      )
      .pipe(map((res) => res.data));
  }

  /**
   * SUPER_ADMIN: Start a trial for a company
   */
  startTrial(
    companyId: string,
    payload: { plan?: string; trialDays?: number; reason?: string }
  ): Observable<SubscriptionInfo> {
    return this.http
      .post<ApiResponse<SubscriptionInfo>>(
        `${this.baseUrl}/subscriptions/company/${companyId}/trial`,
        payload
      )
      .pipe(map((res) => res.data));
  }

  /**
   * SUPER_ADMIN: Activate a subscription
   */
  activateSubscription(
    companyId: string,
    payload: { plan?: string; periodDays?: number; reason?: string }
  ): Observable<SubscriptionInfo> {
    return this.http
      .post<ApiResponse<SubscriptionInfo>>(
        `${this.baseUrl}/subscriptions/company/${companyId}/activate`,
        payload
      )
      .pipe(map((res) => res.data));
  }

  /**
   * SUPER_ADMIN: Change plan
   */
  changePlan(
    companyId: string,
    payload: { plan: string; customLimits?: Record<string, number | null>; reason?: string }
  ): Observable<SubscriptionInfo> {
    return this.http
      .post<ApiResponse<SubscriptionInfo>>(
        `${this.baseUrl}/subscriptions/company/${companyId}/change-plan`,
        payload
      )
      .pipe(map((res) => res.data));
  }

  /**
   * SUPER_ADMIN: Cancel subscription
   */
  cancelSubscription(
    companyId: string,
    payload: { cancelAtPeriodEnd?: boolean; immediate?: boolean; reason?: string }
  ): Observable<SubscriptionInfo> {
    return this.http
      .post<ApiResponse<SubscriptionInfo>>(
        `${this.baseUrl}/subscriptions/company/${companyId}/cancel`,
        payload
      )
      .pipe(map((res) => res.data));
  }

  /**
   * SUPER_ADMIN: Expire subscription
   */
  expireSubscription(
    companyId: string,
    payload?: { reason?: string }
  ): Observable<SubscriptionInfo> {
    return this.http
      .post<ApiResponse<SubscriptionInfo>>(
        `${this.baseUrl}/subscriptions/company/${companyId}/expire`,
        payload || {}
      )
      .pipe(map((res) => res.data));
  }
}
