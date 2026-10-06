import { CompanyPlan } from '../../../core/models/auth.model';

export type OnboardingStep = 1 | 2 | 3;

export type OnboardingBillingInterval = 'MONTHLY' | 'YEARLY';

export interface OnboardingPlanSummary {
  id: CompanyPlan;
  displayName: string;
  tagline: string;
  badge?: string;
  monthlyAmount: number;
  yearlyAmount: number;
  formattedMonthly: string;
  formattedYearly: string;
  keyLimits: {
    messages: string;
    contacts: string;
    campaigns: string;
    templates: string;
    storage: string;
    users: string;
    connections: string;
  };
  features: string[];
}

export const ONBOARDING_PLANS: Record<'STARTER' | 'BUSINESS' | 'PROFESSIONAL', OnboardingPlanSummary> = {
  STARTER: {
    id: 'STARTER',
    displayName: 'Starter',
    tagline: 'Essential WhatsApp messaging for small businesses and startups.',
    monthlyAmount: 999,
    yearlyAmount: 9990,
    formattedMonthly: '₹999 / month',
    formattedYearly: '₹9,990 / year',
    keyLimits: {
      messages: '5,000 / mo',
      contacts: '1,000',
      campaigns: '20 / mo',
      templates: '10',
      storage: '1 GB',
      users: '2 users',
      connections: '1 number',
    },
    features: [
      'Official Meta Cloud API Direct Gateway',
      'Bulk CSV & Excel Contact Ingestion',
      'Dynamic Parameter Variables ({{1}}, {{2}})',
      'Standard Campaign Delivery Analytics',
      '50 Monthly Media Uploads',
      'Standard Email & In-App Support',
    ],
  },
  BUSINESS: {
    id: 'BUSINESS',
    displayName: 'Business',
    tagline: 'Growing businesses scaling campaigns and customer engagement.',
    badge: 'MOST POPULAR',
    monthlyAmount: 2499,
    yearlyAmount: 24990,
    formattedMonthly: '₹2,499 / month',
    formattedYearly: '₹24,990 / year',
    keyLimits: {
      messages: '25,000 / mo',
      contacts: '10,000',
      campaigns: '100 / mo',
      templates: '50',
      storage: '5 GB',
      users: '10 users',
      connections: '1 number',
    },
    features: [
      'Everything in Starter included',
      'Priority Message Queue Processing',
      'Audience Tag Filtering & VIP Segments',
      'Rich Media Headers (Images, PDFs, Video)',
      'Interactive CTA & Quick Reply Buttons',
      'Real-Time Read Receipts & Telemetry',
      '250 Monthly Media Uploads',
    ],
  },
  PROFESSIONAL: {
    id: 'PROFESSIONAL',
    displayName: 'Professional',
    tagline: 'High-volume marketing and enterprise-grade multi-agent operations.',
    monthlyAmount: 5999,
    yearlyAmount: 59990,
    formattedMonthly: '₹5,999 / month',
    formattedYearly: '₹59,990 / year',
    keyLimits: {
      messages: '100,000 / mo',
      contacts: '50,000',
      campaigns: '500 / mo',
      templates: '200',
      storage: '20 GB',
      users: '25 users',
      connections: '2 numbers',
    },
    features: [
      'Everything in Business included',
      '2 Active WhatsApp Business Connections',
      'High-Throughput Asynchronous Queue Engine',
      'Meta Error Code Diagnostics & Fix Prompts',
      'Exportable Campaign CSV Audit Logs',
      '1,000 Monthly Media Uploads',
      'Priority Phone & Technical Support',
    ],
  },
};

export interface SignupFormData {
  fullName: string;
  companyName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

export interface SignupFormErrors {
  fullName?: string;
  companyName?: string;
  email?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}
