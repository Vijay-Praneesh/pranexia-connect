import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

export interface CoreCapability {
  id: string;
  icon: string;
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  linkText: string;
  linkRoute: string;
}

export interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  keyPoint: string;
}

export interface RegionalPillar {
  badge: string;
  title: string;
  description: string;
  context: string;
}

export interface AudienceSegment {
  icon: string;
  title: string;
  description: string;
  useCase: string;
}

export interface PhilosophyPillar {
  number: string;
  title: string;
  description: string;
}

export interface OperationalChallenge {
  challenge: string;
  solution: string;
}

@Component({
  selector: 'app-public-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly operationalChallenges: OperationalChallenge[] = [
    {
      challenge: 'Customer contact information scattered across disconnected spreadsheets, chat logs, and separate devices.',
      solution: 'A unified customer directory with custom tags, attributes, and structured audience segmentation.',
    },
    {
      challenge: 'Manual, one-by-one messaging that is slow, error-prone, and difficult to scale across growing customer lists.',
      solution: 'High-deliverability WhatsApp broadcast campaigns powered directly by official Meta Cloud API infrastructure.',
    },
    {
      challenge: 'Managing unapproved message templates and unorganized promotional media files across team members.',
      solution: 'Centralized WhatsApp template synchronization with parameter previews and organized media asset storage.',
    },
    {
      challenge: 'Zero operational visibility into message delivery rates, read confirmations, or campaign failures.',
      solution: 'Real-time campaign telemetry, status tracking, and granular delivery reports with actionable insights.',
    },
  ];

  readonly coreCapabilities: CoreCapability[] = [
    {
      id: 'customer-management',
      icon: 'bi-people-fill',
      badge: 'Audience Directory',
      title: 'Customer Management',
      description:
        'Maintain a clean, organized directory of customer contacts. Group and segment recipients using custom tags, track customer attributes, and prepare targeted recipient lists for campaigns.',
      highlights: [
        'Centralized contact directory and profiles',
        'Custom tagging and audience filtering',
        'Bulk contact imports and recipient segmentation',
      ],
      linkText: 'Explore customer management in our products',
      linkRoute: '/products',
    },
    {
      id: 'whatsapp-campaigns',
      icon: 'bi-broadcast-pin',
      badge: 'Broadcast Studio',
      title: 'WhatsApp Campaigns',
      description:
        'Create, configure, and broadcast targeted message campaigns to defined customer segments. Built directly on official Meta Cloud API infrastructure for high deliverability and compliance.',
      highlights: [
        'Direct Meta Cloud API broadcast engine',
        'Scheduled and instant campaign dispatches',
        'Targeted group dispatches with personalized variables',
      ],
      linkText: 'Explore WhatsApp campaign features',
      linkRoute: '/products',
    },
    {
      id: 'whatsapp-templates',
      icon: 'bi-chat-left-text-fill',
      badge: 'Template Sync',
      title: 'WhatsApp Templates',
      description:
        'Manage and synchronize Meta-approved WhatsApp message templates. Support dynamic variable placeholders, quick-reply buttons, and call-to-action links to engage customers effectively.',
      highlights: [
        'Meta-approved template catalog and sync',
        'Dynamic placeholder variables and header previews',
        'Interactive quick replies and call-to-action buttons',
      ],
      linkText: 'Discover WhatsApp template capabilities',
      linkRoute: '/products',
    },
    {
      id: 'media-management',
      icon: 'bi-folder-check',
      badge: 'Asset Storage',
      title: 'Media Management',
      description:
        'Upload, organize, and attach campaign media assets including promotional flyers, product catalogs, documents, and images directly to your WhatsApp broadcast workflows.',
      highlights: [
        'Centralized media storage and organization',
        'Supported formats: images, documents, and flyers',
        'Direct attachment to broadcast campaign dispatches',
      ],
      linkText: 'Learn more about media asset management',
      linkRoute: '/products',
    },
    {
      id: 'reports-analytics',
      icon: 'bi-graph-up-arrow',
      badge: 'Telemetry & Reports',
      title: 'Reports & Analytics',
      description:
        'Gain full visibility into campaign performance with detailed delivery metrics. Track sent counts, delivered confirmations, read receipts, and error diagnostics for every broadcast.',
      highlights: [
        'Real-time delivery status and read receipts',
        'Campaign-level performance dashboards',
        'Detailed error logs and dispatch diagnostics',
      ],
      linkText: 'Review reporting and analytics tools',
      linkRoute: '/products',
    },
    {
      id: 'usage-subscription',
      icon: 'bi-credit-card-2-front-fill',
      badge: 'Quota & Billing',
      title: 'Usage & Subscription',
      description:
        'Track monthly messaging volumes, active quota utilization, and subscription plan tiers with transparent account visibility designed to scale with your business requirements.',
      highlights: [
        'Clear monthly broadcast quota tracking',
        'Transparent tier management and renewals',
        'Flexible plans for businesses of all sizes',
      ],
      linkText: 'View Seyyon Connect pricing and plans',
      linkRoute: '/pricing',
    },
  ];

  readonly regionalPillars: RegionalPillar[] = [
    {
      badge: 'Coimbatore & Manufacturing Hubs',
      title: 'Commercial & Industrial Enterprises',
      description:
        'From manufacturing units and engineering suppliers to textile exporters and trading companies across Coimbatore, customer communication is essential for client inquiries, quotation updates, and order confirmations.',
      context: 'Streamlined communication for high-volume B2B operations and supply chain updates.',
    },
    {
      badge: 'Tiruppur & Apparel Clusters',
      title: 'Textile, Garment & Export Businesses',
      description:
        'For apparel manufacturers, fabric merchants, and export houses in Tiruppur, staying connected with wholesale buyers, vendor networks, and distributors requires timely broadcast updates and catalog sharing.',
      context: 'Organized campaign broadcasts for seasonal collections, order alerts, and client follow-ups.',
    },
    {
      badge: 'Kongu Region & Western Tamil Nadu',
      title: 'Retail, Services & Growing Startups',
      description:
        'Retail chains, educational institutions, service providers, and emerging enterprises across Western Tamil Nadu rely on centralized messaging to maintain consistent customer relationships.',
      context: 'Direct customer engagement without the technical overhead of building complex messaging infrastructure.',
    },
  ];

  readonly audienceSegments: AudienceSegment[] = [
    {
      icon: 'bi-building-check',
      title: 'Growing Businesses & Commercial Teams',
      description:
        'Organizations that need an organized, structured platform to manage customer outreach rather than relying on uncoordinated personal messaging.',
      useCase: 'Centralized customer database and shared campaign workflows.',
    },
    {
      icon: 'bi-headset',
      title: 'Customer-Facing & Marketing Teams',
      description:
        'Sales, support, and relationship teams that require pre-approved message templates, quick-reply formats, and structured contact tags.',
      useCase: 'Consistent, brand-aligned communication with dynamic placeholders.',
    },
    {
      icon: 'bi-megaphone-fill',
      title: 'Businesses Running WhatsApp Broadcasts',
      description:
        'Enterprises dispatching regular product updates, seasonal offers, event invitations, and customer notifications via official Meta Cloud API channels.',
      useCase: 'Reliable bulk dispatch with high deliverability and compliance.',
    },
    {
      icon: 'bi-bar-chart-line-fill',
      title: 'Teams Seeking Delivery & Campaign Telemetry',
      description:
        'Business owners and operators who want verifiable metrics on message delivery, read status, and dispatch outcomes for every campaign.',
      useCase: 'Actionable campaign insights to refine future engagement strategies.',
    },
  ];

  readonly workflowSteps: WorkflowStep[] = [
    {
      number: '01',
      title: 'Manage Customers',
      description:
        'Organize customer contact information in a centralized directory. Segment recipients using custom tags and filter lists to prepare targeted campaign audiences.',
      keyPoint: 'Structured contact lists and custom attribute tagging',
    },
    {
      number: '02',
      title: 'Prepare Templates & Media',
      description:
        'Select from your approved WhatsApp message templates, configure dynamic parameter placeholders, and attach relevant media assets or documents.',
      keyPoint: 'Meta-approved templates with dynamic variables & attachments',
    },
    {
      number: '03',
      title: 'Connect Through WhatsApp',
      description:
        'Dispatch your broadcast campaign through the official Meta Cloud API infrastructure, ensuring compliant routing and direct delivery to customer devices.',
      keyPoint: 'Official Cloud API dispatch with high deliverability',
    },
    {
      number: '04',
      title: 'Manage Campaign Activity',
      description:
        'Monitor live dispatch queues, track delivery status in real time, and oversee campaign progress directly from your dashboard.',
      keyPoint: 'Real-time queue tracking and status visibility',
    },
    {
      number: '05',
      title: 'Review Performance',
      description:
        'Evaluate campaign outcomes using comprehensive reports detailing sent counts, delivery confirmations, read receipts, and error diagnostics.',
      keyPoint: 'Actionable telemetry and delivery diagnostics',
    },
  ];

  readonly philosophyPillars: PhilosophyPillar[] = [
    {
      number: '01',
      title: 'Centralized Workflows',
      description:
        'Bringing customer contacts, WhatsApp templates, media assets, campaigns, and delivery analytics into a single platform eliminates the friction of switching between disconnected tools.',
    },
    {
      number: '02',
      title: 'Clear Information & Honest Data',
      description:
        'We believe in providing straightforward campaign telemetry and honest delivery metrics so businesses can evaluate their communication performance without ambiguous vanity stats.',
    },
    {
      number: '03',
      title: 'Practical Tools for Real Workflows',
      description:
        'Every feature in Seyyon Connect is engineered around the day-to-day operational tasks that businesses actually manage, avoiding unnecessary complexity and bloat.',
    },
    {
      number: '04',
      title: 'Dependable Cloud Infrastructure',
      description:
        'By integrating directly with official Meta Cloud API infrastructure, we ensure secure, policy-compliant, and high-deliverability messaging for long-term operational stability.',
    },
  ];

  ngOnInit(): void {
    const pageTitle = 'About Seyyon Connect | Customer Engagement Software';
    const metaDescription =
      'Learn about Seyyon Connect, a customer engagement platform for managing customers, WhatsApp campaigns, templates and campaign insights in one place.';
    const pageUrl = 'https://seyyonconnect.in/about';

    const organizationSchema = this.seo.getOrganizationSchema();
    const websiteSchema = this.seo.getWebSiteSchema();

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://seyyonconnect.in/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'About Seyyon Connect',
          item: pageUrl,
        },
      ],
    };

    this.seo.updateSeo({
      title: pageTitle,
      description: metaDescription,
      ogTitle: pageTitle,
      ogDescription: metaDescription,
      ogUrl: pageUrl,
      canonicalUrl: pageUrl,
      schema: [organizationSchema, websiteSchema, breadcrumbSchema],
    });
  }

  scrollToSection(elementId: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
