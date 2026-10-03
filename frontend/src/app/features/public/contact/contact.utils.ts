import { ContactFormData, ContactFormErrors } from './contact.model';

/**
 * Standard email validation regular expression.
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates an email address format.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Generates the email subject.
 * Uses the user-provided subject if present; falls back to full name or default.
 */
export function buildEmailSubject(subject?: string, fullName?: string): string {
  const trimmedSubject = (subject || '').trim();
  const trimmedName = (fullName || '').trim();

  if (trimmedSubject) {
    return trimmedSubject;
  }
  if (trimmedName) {
    return `New website enquiry from ${trimmedName}`;
  }
  return 'New website enquiry';
}

/**
 * Generates the standardized email body.
 *
 * Format:
 * Hello Seyyon Connect Team,
 *
 * You have received a new website enquiry.
 *
 * Name: ${fullName}
 * Email: ${email}
 * Phone: ${phone || "Not provided"}
 * Subject: ${subject}
 *
 * Message:
 * ${message}
 *
 * Regards,
 * ${fullName}
 */
export function buildEmailBody(data: {
  fullName: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): string {
  const trimmedName = (data.fullName || '').trim();
  const trimmedEmail = (data.email || '').trim();
  const trimmedPhone = (data.phone || '').trim();
  const trimmedSubject = (data.subject || '').trim();
  const trimmedMessage = (data.message || '').trim();

  const lines = [
    'Hello Seyyon Connect Team,',
    '',
    'You have received a new website enquiry.',
    '',
    `Name: ${trimmedName}`,
    `Email: ${trimmedEmail}`,
    `Phone: ${trimmedPhone || 'Not provided'}`,
  ];

  if (trimmedSubject) {
    lines.push(`Subject: ${trimmedSubject}`);
  }

  lines.push(
    '',
    'Message:',
    trimmedMessage,
    '',
    'Regards,',
    trimmedName || 'Website Visitor'
  );

  return lines.join('\n');
}

/**
 * Generates the Gmail compose URL with URLSearchParams and %20 space encoding.
 */
export function buildGmailComposeUrl(
  recipient: string,
  subject: string,
  body: string
): string {
  const params = new URLSearchParams();
  params.set('su', subject);
  params.set('body', body);

  const encodedQuery = params.toString().replace(/\+/g, '%20');
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&${encodedQuery}`;
}

/**
 * Wraps the Gmail compose URL using Google's Account Chooser.
 * URL: https://accounts.google.com/AccountChooser?service=mail&continue=ENCODED_GMAIL_COMPOSE_URL
 */
export function buildGmailUrl(
  recipient: string,
  subject: string,
  body: string
): string {
  const gmailComposeUrl = buildGmailComposeUrl(recipient, subject, body);
  return `https://accounts.google.com/AccountChooser?service=mail&continue=${encodeURIComponent(
    gmailComposeUrl
  )}`;
}

/**
 * Generates the Outlook compose deep link URL with URLSearchParams and %20 space encoding.
 * URL: https://outlook.office.com/mail/deeplink/compose?to=...&subject=...&body=...
 */
export function buildOutlookUrl(
  recipient: string,
  subject: string,
  body: string
): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);

  const encodedQuery = params.toString().replace(/\+/g, '%20');
  return `https://outlook.office.com/mail/deeplink/compose?to=${recipient}&${encodedQuery}`;
}

/**
 * Validates contact form data according to Seyyon Connect specifications:
 * - Full Name: required, max 100 chars
 * - Email Address: required, valid email format, max 254 chars
 * - Phone Number: optional, max 30 chars
 * - Subject: required, max 200 chars
 * - Message: required, max 2000 chars
 */
export function validateContactForm(
  data: Partial<ContactFormData>
): ContactFormErrors {
  const errors: ContactFormErrors = {};

  const fullName = (data.fullName || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const subject = (data.subject || '').trim();
  const message = (data.message || '').trim();

  // Full Name validation
  if (!fullName) {
    errors.fullName = 'This field is required.';
  } else if (fullName.length > 100) {
    errors.fullName = 'Full Name must not exceed 100 characters.';
  }

  // Email Address validation
  if (!email) {
    errors.email = 'This field is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  } else if (email.length > 254) {
    errors.email = 'Email address must not exceed 254 characters.';
  }

  // Phone Number validation (optional)
  if (phone && phone.length > 30) {
    errors.phone = 'Phone number must not exceed 30 characters.';
  }

  // Subject validation
  if (!subject) {
    errors.subject = 'Please enter a subject.';
  } else if (subject.length > 200) {
    errors.subject = 'Subject must not exceed 200 characters.';
  }

  // Message validation
  if (!message) {
    errors.message = 'Please write a message.';
  } else if (message.length > 2000) {
    errors.message = 'Message must not exceed 2000 characters.';
  }

  return errors;
}
