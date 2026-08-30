import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { AccountStatus } from '../../core/models/auth.model';
import {
  CompanyListData,
  CompanyListQuery,
  CompanyRecord,
  CreateCompanyResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from './company.model';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/companies`;

  getCompanies(query: CompanyListQuery = {}): Observable<CompanyListData> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '')
        params = params.set(key, String(value));
    }
    return this.http
      .get<ApiResponse<CompanyListData>>(this.endpoint, { params })
      .pipe(map((response) => response.data));
  }

  getCompany(id: string): Observable<CompanyRecord> {
    return this.http
      .get<ApiResponse<CompanyRecord>>(`${this.endpoint}/${id}`)
      .pipe(map((response) => response.data));
  }

  createCompany(data: CreateCompanyRequest): Observable<CreateCompanyResponse> {
    return this.http
      .post<ApiResponse<CreateCompanyResponse>>(this.endpoint, data)
      .pipe(map((response) => response.data));
  }

  updateCompany(
    id: string,
    data: UpdateCompanyRequest,
  ): Observable<CompanyRecord> {
    return this.http
      .put<ApiResponse<CompanyRecord>>(`${this.endpoint}/${id}`, data)
      .pipe(map((response) => response.data));
  }

  updateCompanyStatus(
    id: string,
    status: AccountStatus,
  ): Observable<CompanyRecord> {
    return this.http
      .patch<
        ApiResponse<CompanyRecord>
      >(`${this.endpoint}/${id}/status`, { status })
      .pipe(map((response) => response.data));
  }
}
