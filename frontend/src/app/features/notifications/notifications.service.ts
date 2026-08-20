import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { CustomerListData } from '../customers/customer.model';
import { CustomerActivityData } from './notification.model';
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient); private readonly customers = `${inject(API_BASE_URL)}/customers`;
  getCustomers(): Observable<CustomerListData> { const params = new HttpParams().set('page', 1).set('limit', 100).set('sortBy', 'firstName').set('order', 'ASC'); return this.http.get<ApiResponse<CustomerListData>>(this.customers, { params }).pipe(map((response) => response.data)); }
  getCustomerActivity(customerId: string): Observable<CustomerActivityData> { return this.http.get<ApiResponse<CustomerActivityData>>(`${this.customers}/${customerId}/history`).pipe(map((response) => response.data)); }
}
