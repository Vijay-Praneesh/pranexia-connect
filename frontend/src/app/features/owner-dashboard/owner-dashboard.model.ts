import { AccountStatus, CompanyPlan } from '../companies/company.model';

export interface RecentCompany {
  id: string;
  companyName: string;
  email: string;
  mobile: string;
  plan: CompanyPlan;
  status: AccountStatus;
  createdAt: string;
}

export interface OwnerDashboardSummary {
  companies: { total: number; active: number; inactive: number };
  plans: Record<CompanyPlan, number>;
  recentCompanies: RecentCompany[];
  overview: { totalUsers: number; activeUsers: number };
}
