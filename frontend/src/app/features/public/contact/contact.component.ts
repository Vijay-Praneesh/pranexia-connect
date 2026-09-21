import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';
import {
  CONTACT_EMAIL,
  ContactFormState,
  EmailProvider,
  ContactFormData,
  ContactFormErrors,
  ContactInfoBlock,
  QuickLinkItem,
} from './contact.model';
import {
  buildEmailSubject,
  buildEmailBody,
  buildGmailUrl,
  buildOutlookUrl,
  validateContactForm,
} from './contact.utils';

/**
 * Public Contact Us Component with Client-Side Email Provider Flow.
 * Preserves the exact visual design while providing seamless Gmail & Outlook draft generation.
 */
@Component({
  selector: 'app-public-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
})
export class ContactComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly contactEmail = CONTACT_EMAIL;

  /**
   * UI State Model: 'form' | 'provider-selection' | 'confirmation'
   */
  formState: ContactFormState = 'form';

  /**
   * Currently selected provider: 'gmail' | 'outlook' | null
   */
  selectedProvider: EmailProvider | null = null;

  /**
   * Submission lock to prevent duplicate actions.
   */
  isSubmitting = false;

  /**
   * Contact form values model.
   */
  formData: ContactFormData = {
    fullName: '',
    email: '',
    phone: '',
    message: '',
    website: '', // Honeypot field
  };

  /**
   * Form inline validation errors.
   */
  errors: ContactFormErrors = {};

  readonly contactBlocks: ContactInfoBlock[] = [
    {
      icon: 'bi-envelope-at-fill',
      title: 'Email',
      description:
        'Send us an email directly or use the contact form to reach our inbox.',
      actionText: CONTACT_EMAIL,
      actionHref: `mailto:${CONTACT_EMAIL}`,
      isEmail: true,
    },
    {
      icon: 'bi-briefcase-fill',
      title: 'Business Enquiries',
      description:
        'Explore customized plans, high-volume broadcast tiers, or partnership opportunities.',
    },
    {
      icon: 'bi-headset',
      title: 'Product Support',
      description:
        'Get assistance with WhatsApp template approvals, contact management, and Meta Cloud API integration.',
    },
  ];

  readonly quickLinks: QuickLinkItem[] = [
    {
      icon: 'bi-grid-fill',
      title: 'Product Overview',
      description:
        'Explore WhatsApp broadcasts, customer CRM, and template approvals.',
      route: '/products',
    },
    {
      icon: 'bi-tags-fill',
      title: 'Pricing & Plans',
      description:
        'Review transparent Starter, Business, Professional, and Enterprise tiers.',
      route: '/pricing',
    },
    {
      icon: 'bi-journal-text',
      title: 'Guides & Insights',
      description:
        'Read the latest best practices on Meta Cloud API deliverability.',
      route: '/blogs',
    },
    {
      icon: 'bi-shield-check',
      title: 'About Seyyon Connect',
      description:
        'Learn about our platform infrastructure, security standards, and mission.',
      route: '/about',
    },
  ];

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Contact Seyyon Connect | Get in Touch',
      description:
        'Get in touch with Seyyon Connect to learn more about customer engagement, WhatsApp campaigns, templates, analytics, and business communication.',
      keywords:
        'Contact Seyyon Connect, WhatsApp Marketing Support, Meta Cloud API Help, Seyyon Connect Inquiries, Business Messaging Support',
      ogTitle: 'Contact Seyyon Connect | Let’s Build Better Customer Connections',
      ogDescription:
        'Have a question about Seyyon Connect, our features, or how it can fit your business? Send us a message and our team will get back to you.',
    });
  }

  /**
   * Clears an individual field's validation error immediately when that field becomes valid.
   */
  onFieldInput(field: keyof ContactFormErrors): void {
    if (this.errors[field]) {
      const currentValidation = validateContactForm(this.formData);
      if (!currentValidation[field]) {
        delete this.errors[field];
      }
    }
  }

  /**
   * Handles contact form submission:
   * 1. Check honeypot (silent bail if filled)
   * 2. Prevent duplicates via submission lock
   * 3. Trim values
   * 4. Run validation & focus first invalid field if invalid
   * 5. Transition to 'provider-selection' state while retaining all entered values
   */
  onSubmitInquiry(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    if (this.isSubmitting) {
      return;
    }

    // Honeypot bot protection check: if filled, do nothing silently
    if (this.formData.website && this.formData.website.trim().length > 0) {
      return;
    }

    this.isSubmitting = true;

    // Trim all values
    this.formData.fullName = this.formData.fullName.trim();
    this.formData.email = this.formData.email.trim();
    this.formData.phone = this.formData.phone.trim();
    this.formData.message = this.formData.message.trim();

    // Run custom validation
    const validationErrors = validateContactForm(this.formData);
    this.errors = validationErrors;

    if (Object.keys(validationErrors).length > 0) {
      this.isSubmitting = false;

      // Focus the first invalid field
      setTimeout(() => {
        if (typeof document !== 'undefined') {
          if (validationErrors.fullName) {
            document.getElementById('contact-fullName')?.focus();
          } else if (validationErrors.email) {
            document.getElementById('contact-email')?.focus();
          } else if (validationErrors.phone) {
            document.getElementById('contact-phone')?.focus();
          } else if (validationErrors.message) {
            document.getElementById('contact-message')?.focus();
          }
        }
      }, 50);

      return;
    }

    // Valid: preserve values and switch form card to provider selection
    this.formState = 'provider-selection';
    this.isSubmitting = false;
  }

  /**
   * Restores the original form state with all entered values preserved.
   */
  backToForm(): void {
    this.formState = 'form';
    this.isSubmitting = false;
  }

  /**
   * Opens the selected provider (Gmail or Outlook) compose tab with pre-filled content.
   * Then transitions form card content to confirmation state.
   */
  selectProvider(provider: EmailProvider): void {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    const subject = buildEmailSubject(this.formData.fullName);
    const body = buildEmailBody(this.formData);

    let composeUrl = '';
    if (provider === 'gmail') {
      composeUrl = buildGmailUrl(CONTACT_EMAIL, subject, body);
    } else if (provider === 'outlook') {
      composeUrl = buildOutlookUrl(CONTACT_EMAIL, subject, body);
    }

    if (typeof window !== 'undefined' && composeUrl) {
      window.open(composeUrl, '_blank', 'noopener,noreferrer');
    }

    this.selectedProvider = provider;
    this.formState = 'confirmation';
    this.isSubmitting = false;
  }

  /**
   * Resets all form fields and validation errors, returns to form state,
   * and focuses the Full Name input field.
   */
  prepareAnotherEnquiry(): void {
    this.formData = {
      fullName: '',
      email: '',
      phone: '',
      message: '',
      website: '',
    };
    this.errors = {};
    this.selectedProvider = null;
    this.formState = 'form';
    this.isSubmitting = false;

    setTimeout(() => {
      if (typeof document !== 'undefined') {
        document.getElementById('contact-fullName')?.focus();
      }
    }, 50);
  }
}
