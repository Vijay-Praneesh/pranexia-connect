import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeoService } from '../../../core/services/seo.service';
import {
  PricingPlan,
  BillingIntervalType,
  ComparisonCategory,
  FaqItem,
  ProductValueItem,
  DecisionGuideItem,
} from './pricing.model';

@Component({
  selector: 'app-public-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss'],
})
export class PricingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private fragmentSub?: Subscription;

  billingInterval: BillingIntervalType = 'monthly';

  readonly plans: PricingPlan[] = [
    {
      id: 'STARTER',
      name: 'STARTER',
      displayName: 'Starter',
      tagline: 'Essential WhatsApp messaging for small businesses and startups.',
      pricing: {
        monthly: {
          amount: 999,
          formatted: '₹999/mo',
          billingText: 'Billed monthly',
        },
        yearly: {
          amount: 9990,
          formatted: '₹9,990/yr',
          equivalentMonthly: '₹832.50',
          billingText: 'Billed annually',
        },
      },
      keyLimits: {
        messages: '5,000',
        contacts: '1,000',
        campaigns: '20',
        templates: '10',
        storage: '1 GB',
        users: '2',
      },
      highlightFeatures: [
        'Official Meta Cloud API Direct Gateway',
        'Bulk CSV & Excel Contact Ingestion',
        'Dynamic Parameter Variables ({{1}}, {{2}})',
        'Standard Campaign Delivery Analytics',
        '50 Monthly Media Uploads',
        'Standard Email & In-App Support',
      ],
      cta: {
        text: 'Get Started',
        route: '/login',
        isPrimary: false,
      },
    },
    {
      id: 'BUSINESS',
      name: 'BUSINESS',
      displayName: 'Business',
      tagline: 'Growing businesses scaling campaigns and customer engagement.',
      isPopular: true,
      badge: 'MOST POPULAR',
      pricing: {
        monthly: {
          amount: 2499,
          formatted: '₹2,499/mo',
          billingText: 'Billed monthly',
        },
        yearly: {
          amount: 24990,
          formatted: '₹24,990/yr',
          equivalentMonthly: '₹2,082.50',
          billingText: 'Billed annually',
        },
      },
      keyLimits: {
        messages: '25,000',
        contacts: '10,000',
        campaigns: '100',
        templates: '50',
        storage: '5 GB',
        users: '10',
      },
      highlightFeatures: [
        'Everything in Starter included',
        'Priority Message Queue Processing',
        'Audience Tag Filtering & VIP Segments',
        'Rich Media Headers (Images, PDFs, Video)',
        'Interactive CTA & Quick Reply Buttons',
        'Real-Time Read Receipts & Telemetry',
        '250 Monthly Media Uploads',
      ],
      cta: {
        text: 'Get Started',
        route: '/login',
        isPrimary: true,
      },
    },
    {
      id: 'PROFESSIONAL',
      name: 'PROFESSIONAL',
      displayName: 'Professional',
      tagline: 'High-volume marketing and enterprise-grade multi-agent operations.',
      pricing: {
        monthly: {
          amount: 5999,
          formatted: '₹5,999/mo',
          billingText: 'Billed monthly',
        },
        yearly: {
          amount: 59990,
          formatted: '₹59,990/yr',
          equivalentMonthly: '₹4,999.16',
          billingText: 'Billed annually',
        },
      },
      keyLimits: {
        messages: '100,000',
        contacts: '50,000',
        campaigns: '500',
        templates: '200',
        storage: '20 GB',
        users: '25',
      },
      highlightFeatures: [
        'Everything in Business included',
        '2 Active WhatsApp Business Connections',
        'High-Throughput Asynchronous Queue Engine',
        'Meta Error Code Diagnostics & Fix Prompts',
        'Exportable Campaign CSV Audit Logs',
        '1,000 Monthly Media Uploads',
        'Priority Phone & Technical Support',
      ],
      cta: {
        text: 'Get Started',
        route: '/login',
        isPrimary: false,
      },
    },
    {
      id: 'ENTERPRISE',
      name: 'ENTERPRISE',
      displayName: 'Enterprise',
      tagline: 'Custom limits, dedicated infrastructure, and unlimited scale.',
      pricing: {
        monthly: {
          amount: 0,
          formatted: 'Custom',
          billingText: 'Custom agreement',
        },
        yearly: {
          amount: 0,
          formatted: 'Custom',
          billingText: 'Custom agreement',
        },
        isCustom: true,
      },
      keyLimits: {
        messages: 'Custom / High',
        contacts: 'Unlimited',
        campaigns: 'Unlimited',
        templates: 'Unlimited',
        storage: 'Dedicated',
        users: 'Unlimited',
      },
      highlightFeatures: [
        'Custom Monthly Message Allocations',
        'Multi-WABA Dedicated Architecture',
        'Custom Webhooks & Internal Integrations',
        '99.99% Uptime Service Level Agreement (SLA)',
        'Dedicated Cloud Telemetry & NOC Monitoring',
        'Dedicated Enterprise Account Architect',
      ],
      cta: {
        text: 'Contact Sales',
        route: '/contact',
        isPrimary: false,
      },
    },
  ];

  readonly comparisonCategories: ComparisonCategory[] = [
    {
      category: 'Resource Quotas & Monthly Limits',
      rows: [
        {
          name: 'Monthly WhatsApp Messages',
          description: 'Billable messages dispatched to recipient devices',
          starter: '5,000 / mo',
          business: '25,000 / mo',
          professional: '100,000 / mo',
          enterprise: 'Custom Volume',
        },
        {
          name: 'Saved Customer Contacts',
          description: 'Total active contact records in CRM directory',
          starter: '1,000',
          business: '10,000',
          professional: '50,000',
          enterprise: 'Unlimited',
        },
        {
          name: 'Monthly Broadcast Campaigns',
          description: 'Scheduled or instant campaign dispatches',
          starter: '20 / mo',
          business: '100 / mo',
          professional: '500 / mo',
          enterprise: 'Unlimited',
        },
        {
          name: 'WhatsApp Message Templates',
          description: 'Meta-approved templates stored in library',
          starter: '10',
          business: '50',
          professional: '200',
          enterprise: 'Unlimited',
        },
        {
          name: 'Media File Storage',
          description: 'Flyers, PDFs, catalogs, and video attachments',
          starter: '1 GB',
          business: '5 GB',
          professional: '20 GB',
          enterprise: 'Dedicated Storage',
        },
        {
          name: 'Monthly Media Uploads',
          description: 'New media asset ingestion per billing period',
          starter: '50 / mo',
          business: '250 / mo',
          professional: '1,000 / mo',
          enterprise: 'Unlimited',
        },
        {
          name: 'Team Member Accounts',
          description: 'User seats with role-based access control',
          starter: '2 users',
          business: '10 users',
          professional: '25 users',
          enterprise: 'Unlimited',
        },
        {
          name: 'WhatsApp Business Connections',
          description: 'Simultaneous WABA phone numbers connected',
          starter: '1 Number',
          business: '1 Number',
          professional: '2 Numbers',
          enterprise: 'Multi-WABA',
        },
      ],
    },
    {
      category: 'Messaging & Campaign Capabilities',
      rows: [
        {
          name: 'Official Meta Cloud API Direct Gateway',
          description: 'Zero middleware latency and verified delivery',
          starter: true,
          business: true,
          professional: true,
          enterprise: true,
        },
        {
          name: 'Dynamic Variable Placeholders',
          description: 'Parameter mapping (e.g. {{1}} Customer Name)',
          starter: true,
          business: true,
          professional: true,
          enterprise: true,
        },
        {
          name: 'Audience Tag Filtering & Segmentation',
          description: 'Filter recipients by custom contact tags',
          starter: false,
          business: true,
          professional: true,
          enterprise: true,
        },
        {
          name: 'Rich Media Headers (PDF / Image / Video)',
          description: 'Attach multimedia headers to certified templates',
          starter: false,
          business: true,
          professional: true,
          enterprise: true,
        },
        {
          name: 'Interactive CTA & Quick Reply Buttons',
          description: 'One-tap website links and phone dialer buttons',
          starter: false,
          business: true,
          professional: true,
          enterprise: true,
        },
        {
          name: 'High-Throughput Asynchronous Queue',
          description: 'High TPS dispatching with pause/resume controls',
          starter: false,
          business: false,
          professional: true,
          enterprise: true,
        },
      ],
    },
    {
      category: 'Analytics, Telemetry & Support',
      rows: [
        {
          name: 'Real-Time Delivery & Read Receipts',
          description: 'Accurate sent, delivered, and read timestamps',
          starter: 'Basic Counts',
          business: 'Full Telemetry',
          professional: 'Full Telemetry',
          enterprise: 'Full Telemetry + Webhooks',
        },
        {
          name: 'Official Meta Error Code Diagnostics',
          description: 'Detailed failure explanations and fix prompts',
          starter: false,
          business: true,
          professional: true,
          enterprise: true,
        },
        {
          name: 'Exportable CSV Audit Logs',
          description: 'Downloadable campaign dispatch records',
          starter: false,
          business: false,
          professional: true,
          enterprise: true,
        },
        {
          name: 'Customer Support SLA',
          description: 'Technical support response channels',
          starter: 'Standard Email',
          business: 'Priority In-App',
          professional: 'Priority Phone & Chat',
          enterprise: 'Dedicated 24/7 NOC + SLA',
        },
      ],
    },
  ];

  readonly productValues: ProductValueItem[] = [
    {
      icon: 'bi-people-fill',
      title: 'Customer Management',
      description: 'Keep customer information organized and accessible.',
      highlights: [
        'Centralized contact database',
        'Custom tagging and categorization',
        'Bulk CSV & Excel file ingestion',
      ],
    },
    {
      icon: 'bi-megaphone-fill',
      title: 'Campaign Management',
      description: 'Create and manage customer communication campaigns from one platform.',
      highlights: [
        'Asynchronous queue-based dispatches',
        'Instant or scheduled execution',
        'Live progress bar monitoring',
      ],
    },
    {
      icon: 'bi-whatsapp',
      title: 'WhatsApp Templates',
      description: 'Organize reusable WhatsApp message templates for your communication workflows.',
      highlights: [
        'Meta Cloud API approval synchronization',
        'Header media attachment support',
        'Interactive CTA & Quick Reply buttons',
      ],
    },
    {
      icon: 'bi-graph-up-arrow',
      title: 'Reports & Analytics',
      description: 'Understand campaign activity and performance through meaningful reports.',
      highlights: [
        'Delivery and read receipt ratios',
        'Official Meta failure diagnostics',
        'Transparent credit & quota meters',
      ],
    },
  ];

  readonly decisionGuides: DecisionGuideItem[] = [
    {
      title: 'Startups & Boutique Stores',
      subtitle: 'Starter Plan (₹999/mo)',
      planName: 'Starter',
      description:
        'Ideal for businesses launching their first WhatsApp communication channel. Send up to 5,000 messages per month, organize 1,000 customer contacts, and manage 10 approved message templates.',
      bestFor: 'Small businesses with up to 1,000 active contacts.',
    },
    {
      title: 'Growing Brands & Multi-Agent Teams',
      subtitle: 'Business Plan (₹2,499/mo)',
      planName: 'Business',
      description:
        'Designed for scaling companies with regular broadcast schedules. Includes 25,000 monthly messages, 10,000 contacts, audience tag filtering, rich media headers, and real-time read telemetry.',
      bestFor: 'Growing marketing teams and customer support desks.',
    },
    {
      title: 'High-Volume Operations & Enterprises',
      subtitle: 'Professional & Enterprise Plans',
      planName: 'Professional / Enterprise',
      description:
        'Engineered for high-volume broadcast operations requiring 100,000+ messages per month, 50,000+ contacts, multi-number WhatsApp Business connections, and priority engineering support.',
      bestFor: 'High-throughput commercial retailers and enterprise SaaS.',
    },
  ];

  readonly faqs: FaqItem[] = [
    {
      id: 'included',
      question: '1. What is included in a Seyyon Connect plan?',
      answer:
        'Every plan includes direct connection to the official Meta Cloud API, customer directory storage, campaign broadcast scheduling, template management, media storage, and real-time delivery telemetry based on your tier limits.',
      isOpen: true,
    },
    {
      id: 'change-plan',
      question: '2. Can I change my plan later?',
      answer:
        'Yes. You can upgrade or downgrade your plan at any time from your Account Settings. Upgrades take effect immediately with prorated billing, while downgrades take effect at the end of the current billing cycle.',
      isOpen: false,
    },
    {
      id: 'upgrade-downgrade',
      question: '3. Can I upgrade or downgrade my plan?',
      answer:
        'Yes. Our platform provides a clear upgrade preview that displays your new limits, price adjustment, and effective date before you confirm any plan change.',
      isOpen: false,
    },
    {
      id: 'billing-work',
      question: '4. How does billing work?',
      answer:
        'Seyyon Connect offers transparent monthly and annual billing. Annual subscriptions receive an automatic discount equal to approximately 2 months free (~17% off). We accept all major cards, UPI, and bank transfers.',
      isOpen: false,
    },
    {
      id: 'reach-limit',
      question: '5. What happens if I reach my plan limit?',
      answer:
        'Our system provides advance warning thresholds at 80% and 90% usage. If your message or contact limit is reached, campaigns will pause to prevent overages until you upgrade or your monthly cycle resets.',
      isOpen: false,
    },
    {
      id: 'whatsapp-setup',
      question: '6. Is WhatsApp setup included?',
      answer:
        'Yes. We provide complete onboarding guidance to connect your verified Meta Business Account, register your business phone number, and generate your Cloud API credentials.',
      isOpen: false,
    },
    {
      id: 'cancel-sub',
      question: '7. Can I cancel my subscription?',
      answer:
        'Yes, you can cancel your subscription at any time from the Subscription management page in your dashboard. Your access will remain active until the end of your current paid billing period.',
      isOpen: false,
    },
    {
      id: 'manage-sub',
      question: '8. Where can I manage my subscription?',
      answer:
        'Authenticated company administrators can manage active plans, view past payment invoices, check live quota usage, and update billing methods in the Subscription section of the app.',
      isOpen: false,
    },
  ];

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Seyyon Connect Pricing | Plans & Transparent Pricing',
      description:
        'Choose the Seyyon Connect plan that fits your customer engagement needs. Transparent pricing for WhatsApp broadcast campaigns, customer CRM, and Meta Cloud API messaging.',
      keywords:
        'Seyyon Connect Pricing, WhatsApp Marketing Plans, Meta Cloud API Pricing, Campaign Automation Pricing, SaaS Messaging Plans',
      ogTitle: 'Seyyon Connect Pricing | Plans that Grow with Your Business',
      ogDescription:
        'Choose the Seyyon Connect plan that fits your customer engagement needs. Transparent pricing with no hidden fees.',
    });
  }

  ngAfterViewInit(): void {
    this.fragmentSub = this.route.fragment.subscribe((fragment) => {
      if (fragment === 'pricing-cards-section' || fragment === 'pricing-cards') {
        setTimeout(() => {
          const el =
            document.getElementById('pricing-cards-section') ||
            document.querySelector('section.pricing-cards-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      }
    });
  }

  ngOnDestroy(): void {
    this.fragmentSub?.unsubscribe();
  }

  setBillingInterval(interval: BillingIntervalType): void {
    this.billingInterval = interval;
  }

  isBoolean(val: string | boolean): boolean {
    return typeof val === 'boolean';
  }

  isTrue(val: string | boolean): boolean {
    return val === true;
  }

  toggleFaq(faqId: string): void {
    const faq = this.faqs.find((f) => f.id === faqId);
    if (faq) {
      faq.isOpen = !faq.isOpen;
    }
  }
}
