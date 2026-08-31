import { CompanyPlanOverview, PlanTier } from '../plans/plan.model';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED';

export interface SubscriptionInfo {
  id: string;
  companyId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string | null;
  trialEnd?: string | null;
  cancelledAt?: string | null;
  cancelAtPeriodEnd: boolean;
  endedAt?: string | null;
  externalSubscriptionId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionHistoryItem {
  id: string;
  companyId: string;
  subscriptionId: string;
  previousPlan?: string | null;
  newPlan: string;
  previousStatus?: string | null;
  newStatus: string;
  action: string;
  source: string;
  reason?: string | null;
  performedBy?: string | null;
  createdAt: string;
}

export interface CurrentSubscriptionResponse {
  subscription: SubscriptionInfo;
  planOverview: CompanyPlanOverview;
}

export interface AdminCompanySubscriptionResponse {
  subscription: SubscriptionInfo;
  planOverview: CompanyPlanOverview;
  history: SubscriptionHistoryItem[];
}
