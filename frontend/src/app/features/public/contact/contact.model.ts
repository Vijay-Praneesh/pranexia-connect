/**
 * Central contact email configuration for Seyyon Connect.
 * 
 * TODO: Replace this placeholder with the official Seyyon Connect contact email address.
 */
export const CONTACT_EMAIL = 'your-email@example.com';

export type EnquiryType =
  | 'General Enquiry'
  | 'Product Information'
  | 'Sales'
  | 'Technical Question'
  | 'Partnership'
  | 'Other';

export interface ContactFormModel {
  name: string;
  email: string;
  company: string;
  phone: string;
  enquiryType: EnquiryType;
  subject: string;
  message: string;
}

export interface ContactInfoBlock {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  isEmail?: boolean;
}

export interface QuickLinkItem {
  icon: string;
  title: string;
  description: string;
  route: string;
  badge?: string;
}
