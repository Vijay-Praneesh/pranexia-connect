import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { CreateTemplateRequest, Template, TemplateListData, TemplateListQuery, UpdateTemplateRequest } from './template.model';

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/templates`;

  getTemplates(query: TemplateListQuery = {}): Observable<TemplateListData> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ApiResponse<TemplateListData>>(this.endpoint, { params }).pipe(map((response) => response.data));
  }

  searchTemplates(keyword: string): Observable<Template[]> {
    return this.http.get<ApiResponse<Template[]>>(`${this.endpoint}/search`, { params: { keyword } }).pipe(map((response) => response.data));
  }

  getTemplate(id: string): Observable<Template> {
    return this.http.get<ApiResponse<Template>>(`${this.endpoint}/${id}`).pipe(map((response) => response.data));
  }

  syncTemplates(): Observable<{ templates: Template[]; synchronized: number }> {
    return this.http.post<ApiResponse<{ templates: Template[]; synchronized: number }>>(`${this.endpoint}/sync`, {}).pipe(map((response) => response.data));
  }

  createTemplate(data: CreateTemplateRequest): Observable<Template> {
    return this.http.post<ApiResponse<Template>>(this.endpoint, data).pipe(map((response) => response.data));
  }

  updateTemplate(id: string, data: UpdateTemplateRequest): Observable<Template> {
    return this.http.put<ApiResponse<Template>>(`${this.endpoint}/${id}`, data).pipe(map((response) => response.data));
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.endpoint}/${id}`).pipe(map(() => undefined));
  }
}
