import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { OwnerDashboardSummary } from './owner-dashboard.model';

@Injectable({ providedIn: 'root' })
export class OwnerDashboardService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/dashboard/owner-summary`;

  getSummary(): Observable<OwnerDashboardSummary> {
    return this.http
      .get<ApiResponse<OwnerDashboardSummary>>(this.endpoint)
      .pipe(map((response) => response.data));
  }
}
