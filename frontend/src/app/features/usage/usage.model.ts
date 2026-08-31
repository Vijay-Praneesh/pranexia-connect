export interface PeriodInfo {
  period: string;
  periodStart: string;
  periodEnd: string;
}

export interface MessageUsage {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface CampaignUsage {
  created: number;
  completed: number;
}

export interface MediaUsage {
  uploadedCount: number;
  uploadedBytes: number;
  activeFileCount?: number;
  activeStorageBytes?: number;
}

export interface TemplateUsage {
  used: number;
}

export interface MetaUsageInfo {
  status: 'NOT_SYNCED' | 'SYNCED' | 'UNAVAILABLE' | 'ERROR';
  wabaId: string | null;
  syncedAt: string | null;
  currency: string | null;
  amount: number | null;
  costAvailable: boolean;
  marketingConversations: number;
  utilityConversations: number;
  authenticationConversations: number;
  serviceConversations: number;
  totalConversations: number;
  notice?: string;
}

export interface SaaSUsage {
  messages: MessageUsage;
  campaigns: CampaignUsage;
  media: MediaUsage;
  templates: TemplateUsage;
}

export interface UsageSummary {
  period: PeriodInfo;
  saas: SaaSUsage;
  meta: MetaUsageInfo;
}

export interface UsageHistoryItem {
  period: string;
  periodStart: string;
  periodEnd: string;
  messages: MessageUsage;
  campaigns: CampaignUsage;
  media: MediaUsage;
  templates: TemplateUsage;
  meta: {
    status: string;
    syncedAt: string | null;
    currency: string | null;
    amount: number | null;
    totalConversations: number;
  };
}

export interface MetaSyncResult {
  status: string;
  message: string;
  syncedAt: string;
  data: unknown;
}
