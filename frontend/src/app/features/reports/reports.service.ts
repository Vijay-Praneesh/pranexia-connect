import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { ReportCampaignList, ReportStatistics, RecipientReportData, RecipientReportQuery } from './report.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE_URL);

  getCampaigns(): Observable<ReportCampaignList> {
    const params = new HttpParams().set('page', 1).set('limit', 100).set('sortBy', 'created_at').set('order', 'DESC');
    return this.http.get<ApiResponse<ReportCampaignList>>(`${this.apiBase}/campaigns`, { params }).pipe(map((response) => response.data));
  }

  getCampaignReport(campaignId: string): Observable<ReportStatistics> {
    return this.http.get<ApiResponse<ReportStatistics>>(`${this.apiBase}/campaigns/${campaignId}/report`).pipe(map((response) => response.data));
  }

  getRecipients(query: RecipientReportQuery): Observable<RecipientReportData> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    return this.http.get<ApiResponse<RecipientReportData>>(`${this.apiBase}/campaign-recipients`, { params }).pipe(map((response) => response.data));
  }
}

