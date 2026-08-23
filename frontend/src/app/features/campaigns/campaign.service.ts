import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { AssignRecipientsRequest, AssignRecipientsResult, Campaign, CampaignCancelResult, CampaignListData, CampaignListQuery, CampaignRecipient, CampaignRecipientListData, CampaignRecipientListQuery, CampaignReport, CampaignSendResult, CreateCampaignRequest, UpdateCampaignRequest } from './campaign.model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly http = inject(HttpClient);
  private readonly campaigns = `${inject(API_BASE_URL)}/campaigns`;
  private readonly recipients = `${inject(API_BASE_URL)}/campaign-recipients`;

  getCampaigns(query: CampaignListQuery = {}): Observable<CampaignListData> { return this.getWithParams<CampaignListData>(this.campaigns, query); }
  searchCampaigns(
    keyword: string,
    filters: Pick<CampaignListQuery, 'status' | 'sendType' | 'templateId'> = {}
  ): Observable<Campaign[]> {
    return this.getWithParams<Campaign[]>(`${this.campaigns}/search`, { keyword, ...filters });
  }
  getCampaign(id: string): Observable<Campaign> { return this.http.get<ApiResponse<Campaign>>(`${this.campaigns}/${id}`).pipe(map((response) => response.data)); }
  createCampaign(data: CreateCampaignRequest): Observable<Campaign> { return this.http.post<ApiResponse<Campaign>>(this.campaigns, data).pipe(map((response) => response.data)); }
  updateCampaign(id: string, data: UpdateCampaignRequest): Observable<Campaign> { return this.http.put<ApiResponse<Campaign>>(`${this.campaigns}/${id}`, data).pipe(map((response) => response.data)); }
  deleteCampaign(id: string): Observable<void> { return this.http.delete<ApiResponse<null>>(`${this.campaigns}/${id}`).pipe(map(() => undefined)); }
  sendCampaign(id: string): Observable<CampaignSendResult> { return this.http.post<ApiResponse<CampaignSendResult>>(`${this.campaigns}/${id}/send`, {}).pipe(map((response) => response.data)); }
  cancelCampaign(id: string): Observable<CampaignCancelResult> { return this.http.post<ApiResponse<CampaignCancelResult>>(`${this.campaigns}/${id}/cancel`, {}).pipe(map((response) => response.data)); }
  getCampaignReport(id: string): Observable<CampaignReport> { return this.http.get<ApiResponse<CampaignReport>>(`${this.campaigns}/${id}/report`).pipe(map((response) => response.data)); }
  assignRecipients(data: AssignRecipientsRequest): Observable<AssignRecipientsResult> { return this.http.post<ApiResponse<AssignRecipientsResult>>(`${this.recipients}/assign`, data).pipe(map((response) => response.data)); }
  getCampaignRecipients(query: CampaignRecipientListQuery): Observable<CampaignRecipientListData> { return this.getWithParams<CampaignRecipientListData>(this.recipients, query); }
  getCampaignRecipient(id: string): Observable<CampaignRecipient> { return this.http.get<ApiResponse<CampaignRecipient>>(`${this.recipients}/${id}`).pipe(map((response) => response.data)); }

  private getWithParams<T>(url: string, query: object): Observable<T> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    return this.http.get<ApiResponse<T>>(url, { params }).pipe(map((response) => response.data));
  }
}
