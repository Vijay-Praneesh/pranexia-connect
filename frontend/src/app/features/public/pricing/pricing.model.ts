export type BillingIntervalType = 'monthly' | 'yearly';

export interface PlanPriceTier {
  amount: number; // in Rupees
  formatted: string;
  equivalentMonthly?: string;
  billingText: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  tagline: string;
  isPopular?: boolean;
  badge?: string;
  pricing: {
    monthly: PlanPriceTier;
    yearly: PlanPriceTier;
    isCustom?: boolean;
  };
  keyLimits: {
    messages: string;
    contacts: string;
    campaigns: string;
    templates: string;
    storage: string;
    users: string;
  };
  highlightFeatures: string[];
  cta: {
    text: string;
    route: string;
    isPrimary?: boolean;
  };
}

export interface ComparisonFeatureRow {
  name: string;
  description?: string;
  starter: string | boolean;
  business: string | boolean;
  professional: string | boolean;
  enterprise: string | boolean;
}

export interface ComparisonCategory {
  category: string;
  rows: ComparisonFeatureRow[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  isOpen?: boolean;
}

export interface ProductValueItem {
  icon: string;
  title: string;
  description: string;
  highlights: string[];
}

export interface DecisionGuideItem {
  title: string;
  subtitle: string;
  planName: string;
  description: string;
  bestFor: string;
}
