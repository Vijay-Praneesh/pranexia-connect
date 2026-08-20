import { CampaignRecipient } from '../campaigns/campaign.model';
import { Customer } from '../customers/customer.model';
export type CustomerActivityRecord = CampaignRecipient;
export interface CustomerActivityData { customer: Customer; history: CustomerActivityRecord[]; }
export interface NotificationCapabilities { notifications: false; unreadState: false; unreadCount: false; generalActivity: false; customerCampaignHistory: true; }
