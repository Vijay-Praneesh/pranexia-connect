import { CompanyPlanOverview, PlanTier, WarningThresholdStatus } from '../plans/plan.model';
import { BillingInterval } from './payment.model';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED';

export type PlanChangeDirection = 'UPGRADE' | 'DOWNGRADE' | 'SAME';

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
  pendingPlan?: string | null;
  pendingBillingInterval?: string | null;
  pendingPlanEffectiveAt?: string | null;
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

export interface OverLimitMetricPreview {
  metric: string;
  label: string;
  unit: string;
  currentUsage: number;
  targetLimit: number;
  overBy: number;
  impact: string;
}

export interface MetricComparisonItem {
  metric: string;
  label: string;
  unit: string;
  isMonthly: boolean;
  currentUsage: number;
  currentLimit: number | null;
  targetLimit: number | null;
  targetStatus: WarningThresholdStatus;
  isOverLimit: boolean;
  overBy: number;
  impact?: string | null;
}

export interface PlanChangePreview {
  companyId: string;
  currentPlan: PlanTier;
  currentDisplayName: string;
  targetPlan: PlanTier;
  targetDisplayName: string;
  targetTagline: string;
  direction: PlanChangeDirection;
  isPurchasable: boolean;
  paymentRequired: boolean;
  billingInterval: BillingInterval;
  price: {
    amount: number;
    displayAmount: number;
    formatted: string;
  } | null;
  currentPeriodEnd: string;
  effectiveDate: string;
  pendingPlan?: string | null;
  pendingPlanEffectiveAt?: string | null;
  hasOverLimitMetrics: boolean;
  overLimitMetrics: OverLimitMetricPreview[];
  metricsComparison: MetricComparisonItem[];
}

export interface PlanChangeRequest {
  plan: PlanTier;
  interval?: BillingInterval;
  reason?: string;
  immediate?: boolean;
}
