import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { CompanyPlanOverview, PlanDefinition } from './plan.model';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Get all standard plan definitions
   */
  getPlans(): Observable<PlanDefinition[]> {
    return this.http
      .get<ApiResponse<PlanDefinition[]>>(`${this.baseUrl}/plans`)
      .pipe(map((res) => res.data));
  }

  /**
   * Get current company plan and metric limits overview
   */
  getCurrentPlanOverview(period?: string): Observable<CompanyPlanOverview> {
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }

    return this.http
      .get<ApiResponse<CompanyPlanOverview>>(`${this.baseUrl}/plans/current`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Assign / update company plan (SUPER_ADMIN only)
   */
  assignCompanyPlan(
    companyId: string,
    plan: string,
    customLimits?: Record<string, number | null>
  ): Observable<CompanyPlanOverview> {
    return this.http
      .patch<ApiResponse<CompanyPlanOverview>>(
        `${this.baseUrl}/plans/assign/${companyId}`,
        { plan, customLimits }
      )
      .pipe(map((res) => res.data));
  }
}
