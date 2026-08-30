import {
  AccountStatus,
  CompanyPlan,
  UserRole,
} from '../../core/models/auth.model';
import { PaginationMeta } from '../../core/models/pagination.model';

export { AccountStatus, CompanyPlan, UserRole };

export interface CompanyUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string;
  role: UserRole;
  status: AccountStatus;
}

export interface CompanyRecord {
  id: string;
  companyName: string;
  email: string;
  mobile: string;
  plan: CompanyPlan;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  users: CompanyUser[];
}

export interface CompanyListData {
  companies: CompanyRecord[];
  pagination: PaginationMeta;
}

export interface CompanyListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: AccountStatus;
  plan?: CompanyPlan;
}

export interface CreateCompanyRequest {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  plan: CompanyPlan;
}

export interface UpdateCompanyRequest {
  companyName: string;
  email: string;
  mobile: string;
  plan: CompanyPlan;
}

export interface CreateCompanyResponse {
  company: CompanyRecord;
  user: CompanyUser;
}
