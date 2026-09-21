/**
 * Central contact email configuration for Seyyon Connect.
 *
 * All Gmail and Outlook drafts use this configurable recipient constant.
 */
export const CONTACT_EMAIL = 'REPLACE_WITH_SEYYON_CONTACT_EMAIL';

/**
 * UI State Model for the Seyyon Connect Contact Form card.
 */
export type ContactFormState = 'form' | 'provider-selection' | 'confirmation';

/**
 * Supported email provider options.
 */
export type EmailProvider = 'gmail' | 'outlook';

/**
 * Contact form input data model.
 */
export interface ContactFormData {
  fullName: string;
  email: string;
  phone: string;
  message: string;
  website: string;
}

/**
 * Contact form inline validation errors model.
 */
export interface ContactFormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  message?: string;
}

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
