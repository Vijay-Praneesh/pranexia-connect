import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';
import {
  CONTACT_EMAIL,
  EnquiryType,
  ContactInfoBlock,
  QuickLinkItem,
} from './contact.model';

/**
 * Public Contact Us Component with Reactive Forms & Mailto Dispatch
 */
@Component({
  selector: 'app-public-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
})
export class ContactComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  readonly contactEmail = CONTACT_EMAIL;

  readonly enquiryTypes: EnquiryType[] = [
    'General Enquiry',
    'Product Information',
    'Sales',
    'Technical Question',
    'Partnership',
    'Other',
  ];

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

  contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
      ],
    ],
    company: [''],
    phone: [''],
    enquiryType: ['General Enquiry', [Validators.required]],
    subject: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  hasAttemptedSubmit = false;
  mailClientTriggered = false;
  mailtoUrlFallback = '';
  hasTriggerError = false;

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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    if (!field) return false;
    return field.invalid && (field.dirty || field.touched || this.hasAttemptedSubmit);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      switch (fieldName) {
        case 'name':
          return 'Please enter your name.';
        case 'email':
          return 'Please enter your email address.';
        case 'subject':
          return 'Please enter a subject.';
        case 'message':
          return 'Please enter your message.';
        default:
          return 'This field is required.';
      }
    }

    if (field.errors['email'] || field.errors['pattern']) {
      return 'Please enter a valid email address.';
    }

    if (field.errors['minlength']) {
      const min = field.errors['minlength'].requiredLength;
      if (fieldName === 'name') return `Name must be at least ${min} characters.`;
      if (fieldName === 'subject') return `Subject must be at least ${min} characters.`;
      if (fieldName === 'message')
        return `Message must be at least ${min} characters (currently ${field.value?.length || 0}).`;
    }

    return 'Please check this field.';
  }

  onSubmit(): void {
    this.hasAttemptedSubmit = true;

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const formValues = this.contactForm.value;
    const name = (formValues.name || '').trim();
    const email = (formValues.email || '').trim();
    const company = (formValues.company || '').trim() || 'N/A';
    const phone = (formValues.phone || '').trim() || 'N/A';
    const enquiryType = formValues.enquiryType || 'General Enquiry';
    const enteredSubject = (formValues.subject || '').trim();
    const message = (formValues.message || '').trim();

    const emailSubject = `Contact Enquiry - ${enteredSubject}`;

    const emailBody = [
      'Hello Seyyon Connect Team,',
      '',
      'I would like to get in touch regarding the following:',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Company: ${company}`,
      `Phone: ${phone}`,
      `Enquiry Type: ${enquiryType}`,
      '',
      'Subject:',
      enteredSubject,
      '',
      'Message:',
      message,
      '',
      'Thank you,',
      name,
    ].join('\r\n');

    const mailtoUrl = `mailto:${this.contactEmail}?subject=${encodeURIComponent(
      emailSubject,
    )}&body=${encodeURIComponent(emailBody)}`;

    this.mailtoUrlFallback = mailtoUrl;

    try {
      if (typeof window !== 'undefined') {
        window.location.href = mailtoUrl;
      }
      this.mailClientTriggered = true;
      this.hasTriggerError = false;
    } catch {
      this.mailClientTriggered = true;
      this.hasTriggerError = true;
    }
  }

  resetForm(): void {
    this.contactForm.reset({
      name: '',
      email: '',
      company: '',
      phone: '',
      enquiryType: 'General Enquiry',
      subject: '',
      message: '',
    });
    this.hasAttemptedSubmit = false;
    this.mailClientTriggered = false;
    this.hasTriggerError = false;
    this.mailtoUrlFallback = '';
  }
}
