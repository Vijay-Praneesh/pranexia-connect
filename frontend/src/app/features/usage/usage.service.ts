import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { MetaSyncResult, UsageHistoryItem, UsageSummary } from './usage.model';

@Injectable({ providedIn: 'root' })
export class UsageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/usage`;

  /**
   * Fetch company usage summary for a specified period (default current month).
   */
  getSummary(period?: string): Observable<UsageSummary> {
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }

    return this.http
      .get<ApiResponse<UsageSummary>>(`${this.baseUrl}/summary`, { params })
      .pipe(map((response) => response.data));
  }

  /**
   * Fetch company usage history across past billing periods.
   */
  getHistory(limit = 12): Observable<UsageHistoryItem[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http
      .get<ApiResponse<UsageHistoryItem[]>>(`${this.baseUrl}/history`, { params })
      .pipe(map((response) => response.data));
  }

  /**
   * Trigger synchronization with Meta Graph API for conversation analytics & billing.
   */
  syncMetaUsage(period?: string): Observable<MetaSyncResult> {
    return this.http
      .post<ApiResponse<MetaSyncResult>>(`${this.baseUrl}/meta/sync`, { period })
      .pipe(map((response) => response.data));
  }
}
