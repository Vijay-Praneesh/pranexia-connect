import { Campaign, CampaignListData, CampaignRecipient, CampaignRecipientListData, CampaignRecipientStatus, CampaignReport } from '../campaigns/campaign.model';

export type ReportCampaign = Campaign;
export type ReportCampaignList = CampaignListData;
export type ReportStatistics = CampaignReport;
export type RecipientReportRow = CampaignRecipient;
export type RecipientReportData = CampaignRecipientListData;
export type RecipientReportStatus = CampaignRecipientStatus;

export interface RecipientReportQuery {
  campaignId: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'created_at' | 'updated_at' | 'status';
  order?: 'ASC' | 'DESC';
  status?: RecipientReportStatus;
}

