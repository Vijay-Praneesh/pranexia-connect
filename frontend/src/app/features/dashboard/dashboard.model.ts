export interface CampaignStatistics {
  total: number;
  draft: number;
  scheduled: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface MessageStatistics {
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface PerformanceStatistics {
  deliveryRate: number;
  readRate: number;
  failureRate: number;
}

export interface DashboardSummary {
  campaigns: CampaignStatistics;
  messages: MessageStatistics;
  performance: PerformanceStatistics;
}
