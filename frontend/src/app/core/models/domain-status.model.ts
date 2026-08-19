export type CustomerStatus = 'ACTIVE' | 'BLOCKED';

export type TemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type CampaignSendType = 'NOW' | 'SCHEDULED';

export type CampaignRecipientStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED';
