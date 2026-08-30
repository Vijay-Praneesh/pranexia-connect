import { ApiErrorResponse } from '../../core/models/api-response.model';
import { PaginationMeta, PaginationQuery } from '../../core/models/pagination.model';
import { Customer } from '../customers/customer.model';
import { Template } from '../templates/template.model';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type CampaignSendType = 'NOW' | 'SCHEDULED';
export type CampaignSortField = 'created_at' | 'updated_at' | 'name' | 'status' | 'send_type' | 'scheduled_at';
export type CampaignRecipientStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type CampaignApiError = ApiErrorResponse;

export interface Campaign {
  id: string;
  templateId: string;
  name: string;
  description: string | null;
  sendType: CampaignSendType;
  scheduledAt: string | null;
  mediaId?: string | null;
  variableMappings?: Record<string, string> | null;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  template?: Template;
}

export interface CampaignListData { campaigns: Campaign[]; pagination: PaginationMeta; }
export interface CampaignListQuery extends PaginationQuery {
  status?: CampaignStatus;
  sendType?: CampaignSendType;
  templateId?: string;
  sortBy?: CampaignSortField;
}

export interface CampaignWriteRequest {
  templateId: string;
  name: string;
  description: string | null;
  sendType: CampaignSendType;
  scheduledAt: string | null;
  mediaId?: string | null;
  variableMappings?: Record<string, string> | null;
}
export type CreateCampaignRequest = CampaignWriteRequest;
export type UpdateCampaignRequest = CampaignWriteRequest;
export interface ScheduleCampaignRequest extends CampaignWriteRequest { sendType: 'SCHEDULED'; scheduledAt: string; }

export interface AssignRecipientsRequest { campaignId: string; customerIds: string[]; }
export interface AssignRecipientsResult { message: string; totalRecipients: number; }

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  customerId: string;
  status: CampaignRecipientStatus;
  whatsappMessageId: string | null;
  failureReason: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: Campaign;
  customer?: Customer;
}
export interface CampaignRecipientListData { recipients: CampaignRecipient[]; pagination: PaginationMeta; }
export interface CampaignRecipientListQuery extends PaginationQuery { campaignId?: string; customerId?: string; status?: CampaignRecipientStatus; }

export interface CampaignReport {
  campaignId: string;
  campaignName: string;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  progress: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CampaignSendResult extends CampaignReport {
  success: boolean;
  message: string;
  successRecipients: { customerId: string; mobile: string; whatsappMessageId: string }[];
  failedRecipients: { customerId: string | null; mobile: string | null; reason: string }[];
}
export interface CampaignCancelResult { campaignId: string; name: string; status: 'CANCELLED'; message: string; }
