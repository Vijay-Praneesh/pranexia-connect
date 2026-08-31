import { PlanTier } from '../plans/plan.model';

export type BillingInterval = 'MONTHLY' | 'YEARLY';

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentType =
  | 'INITIAL_SUBSCRIPTION'
  | 'RENEWAL'
  | 'PLAN_CHANGE';

export interface PlanPricingDetail {
  amount: number; // minor units (paise)
  displayAmount: number; // major units (rupees)
  formatted: string;
}

export interface PricingPlanItem {
  name: PlanTier;
  displayName: string;
  tagline: string;
  limits: Record<string, number | null>;
  isPurchasable: boolean;
  pricing: {
    MONTHLY: PlanPricingDetail | null;
    YEARLY: PlanPricingDetail | null;
  };
}

export interface PricingMatrixResponse {
  currency: string;
  intervals: {
    MONTHLY: string;
    YEARLY: string;
  };
  plans: PricingPlanItem[];
}

export interface CreatePaymentOrderRequest {
  plan: PlanTier;
  billingInterval?: BillingInterval;
  paymentType?: PaymentType;
  customLimits?: Record<string, number | null>;
}

export interface PaymentOrderResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: PlanTier;
  planDisplayName: string;
  billingInterval: BillingInterval;
  displayAmount: string;
  companyName: string;
  companyEmail: string;
}

export interface VerifyPaymentRequest {
  paymentId?: string;
  orderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  payment: PaymentRecord;
  subscription: any;
  alreadyCaptured?: boolean;
}

export interface PaymentRecord {
  id: string;
  companyId: string;
  subscriptionId?: string | null;
  provider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentType: PaymentType;
  plan: PlanTier;
  billingInterval: BillingInterval;
  metadata?: any;
  paidAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    companyName: string;
    email: string;
    plan: string;
  };
}

export interface PaymentHistoryResponse {
  count: number;
  rows: PaymentRecord[];
}
