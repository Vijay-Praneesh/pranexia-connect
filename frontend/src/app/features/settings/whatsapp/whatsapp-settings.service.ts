import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api-config.token';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  WhatsAppConnectRequest,
  WhatsAppConnection,
  WhatsAppConnectionStatusResponse,
} from './whatsapp-settings.model';

@Injectable({ providedIn: 'root' })
export class WhatsAppSettingsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/whatsapp`;

  getStatus(): Observable<WhatsAppConnectionStatusResponse> {
    return this.http
      .get<
        ApiResponse<WhatsAppConnectionStatusResponse>
      >(`${this.endpoint}/status`)
      .pipe(map((response) => response.data));
  }

  connect(data: WhatsAppConnectRequest): Observable<WhatsAppConnection> {
    return this.http
      .post<ApiResponse<WhatsAppConnection>>(`${this.endpoint}/connect`, data)
      .pipe(map((response) => response.data));
  }

  disconnect(): Observable<WhatsAppConnection | null> {
    return this.http
      .post<
        ApiResponse<WhatsAppConnection | null>
      >(`${this.endpoint}/disconnect`, {})
      .pipe(map((response) => response.data));
  }
}
