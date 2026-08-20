import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api-config.token';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AccountSettingsUser } from './account-settings.model';

@Injectable({ providedIn: 'root' })
export class AccountSettingsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/auth/me`;

  getCurrentUser(): Observable<AccountSettingsUser> {
    return this.http.get<ApiResponse<AccountSettingsUser>>(this.endpoint).pipe(map((response) => response.data));
  }
}

