import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api-config.token';
import { ApiResponse } from '../../core/models/api-response.model';
import { CustomerStatus } from '../../core/models/domain-status.model';
import { CreateCustomerRequest, Customer, CustomerImportResult, CustomerListData, CustomerListQuery, UpdateCustomerRequest } from './customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/customers`;

  getCustomers(query: CustomerListQuery = {}): Observable<CustomerListData> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ApiResponse<CustomerListData>>(this.endpoint, { params }).pipe(map((response) => response.data));
  }

  searchCustomers(q: string): Observable<Customer[]> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.endpoint}/search`, { params: { q } }).pipe(map((response) => response.data));
  }

  getCustomer(id: string): Observable<Customer> {
    return this.http.get<ApiResponse<Customer>>(`${this.endpoint}/${id}`).pipe(map((response) => response.data));
  }

  createCustomer(data: CreateCustomerRequest): Observable<Customer> {
    return this.http.post<ApiResponse<Customer>>(this.endpoint, data).pipe(map((response) => response.data));
  }

  updateCustomer(id: string, data: UpdateCustomerRequest): Observable<Customer> {
    return this.http.put<ApiResponse<Customer>>(`${this.endpoint}/${id}`, data).pipe(map((response) => response.data));
  }

  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.endpoint}/${id}`).pipe(map(() => undefined));
  }

  bulkDelete(customerIds: string[]): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.endpoint}/bulk-delete`, { body: { customerIds } }).pipe(map(() => undefined));
  }

  bulkStatus(customerIds: string[], status: CustomerStatus): Observable<void> {
    return this.http.put<ApiResponse<null>>(`${this.endpoint}/bulk-status`, { customerIds, status }).pipe(map(() => undefined));
  }

  importCustomers(file: File): Observable<CustomerImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<CustomerImportResult>>(`${this.endpoint}/import`, formData).pipe(map((response) => response.data));
  }

  exportCustomers(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.endpoint}/export`, { observe: 'response', responseType: 'blob' });
  }

  downloadImportTemplate(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.endpoint}/template`, { observe: 'response', responseType: 'blob' });
  }
}
