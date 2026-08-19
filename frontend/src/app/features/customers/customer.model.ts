import { CustomerStatus } from '../../core/models/domain-status.model';
import { PaginationMeta, PaginationQuery } from '../../core/models/pagination.model';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string | null;
  mobile: string;
  email: string | null;
  country: string;
  tags: string[] | null;
  notes: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListData {
  customers: Customer[];
  pagination: PaginationMeta;
}

export interface CustomerListQuery extends PaginationQuery {
  status?: CustomerStatus;
  country?: string;
}

export interface CustomerWriteRequest {
  firstName: string;
  lastName: string | null;
  mobile: string;
  email: string | null;
  country: string;
  tags?: string[];
  notes: string | null;
  status: CustomerStatus;
}

export type CreateCustomerRequest = CustomerWriteRequest;
export type UpdateCustomerRequest = CustomerWriteRequest;

export interface CustomerImportError {
  row: number;
  reason: string;
}

export interface CustomerImportResult {
  imported: number;
  skipped: number;
  errors: CustomerImportError[];
}

export interface CustomerDashboardStatistics {
  totalCustomers: number;
  activeCustomers: number;
  blockedCustomers: number;
  countries: number;
  newThisMonth: number;
}
