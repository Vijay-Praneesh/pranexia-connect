export type PlanTier = 'STARTER' | 'BUSINESS' | 'PROFESSIONAL' | 'ENTERPRISE';

export type WarningThresholdStatus =
  | 'NORMAL'
  | 'WARNING'
  | 'CRITICAL'
  | 'EXHAUSTED'
  | 'OVER_LIMIT';

export interface PlanDefinition {
  name: PlanTier;
  displayName: string;
  tagline: string;
  limits: Record<string, number | null>;
}

export interface MetricOverviewItem {
  metric: string;
  label: string;
  description: string;
  unit: string;
  isMonthly: boolean;
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
  percentage: number | null;
  status: WarningThresholdStatus;
}

export interface CompanyPlanInfo {
  name: PlanTier;
  displayName: string;
  tagline: string;
  customLimits: Record<string, number | null> | null;
}

export interface CompanyPlanOverview {
  plan: CompanyPlanInfo;
  metrics: MetricOverviewItem[];
  availablePlans: PlanDefinition[];
}
