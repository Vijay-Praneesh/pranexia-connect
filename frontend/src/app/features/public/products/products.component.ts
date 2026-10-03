import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

export interface ProductModule {
  id: string;
  icon: string;
  badge: string;
  title: string;
  summary: string;
  whatUsersCanDo: string[];
  whyItMatters: string;
  linkText: string;
  linkRoute: string;
}

export interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  practicalTask: string;
}

export interface BusinessValueItem {
  icon: string;
  title: string;
  description: string;
}

export interface AudienceProfile {
  icon: string;
  title: string;
  description: string;
  keyCapability: string;
}

export interface RegionalBusinessFocus {
  badge: string;
  title: string;
  description: string;
  businessApplication: string;
}

export interface CentralizedAdvantage {
  aspect: string;
  disconnectedApproach: string;
  seyyonUnifiedApproach: string;
}

@Component({
  selector: 'app-public-products',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly productModules: ProductModule[] = [
    {
      id: 'customer-management',
      icon: 'bi-people-fill',
      badge: 'Contact Directory',
      title: 'Customer Management',
      summary:
        'Maintain a clean, searchable directory of customer contacts. Organize records, apply custom tags, manage customer attributes, and prepare structured recipient groups for campaigns.',
      whatUsersCanDo: [
        'Add, edit, view, and delete customer contact records',
        'Organize contacts using custom tags and group attributes',
        'Search and filter customer lists quickly by name, phone, or tag',
        'Import customer lists in bulk via CSV files',
        'Select filtered customer segments directly when building campaigns',
      ],
      whyItMatters:
        'Centralizing customer records eliminates fragmented address books and ensures that your customer data is always up-to-date and instantly available for targeted broadcast campaigns.',
      linkText: 'Learn about customer management workflows',
      linkRoute: '/about',
    },
    {
      id: 'whatsapp-campaigns',
      icon: 'bi-broadcast-pin',
      badge: 'Broadcast Studio',
      title: 'WhatsApp Campaign Management',
      summary:
        'Create, configure, and broadcast targeted WhatsApp messages to selected customer lists using official Meta Cloud API infrastructure with real-time status tracking.',
      whatUsersCanDo: [
        'Create new campaigns with customized titles and recipient filters',
        'Choose Meta-approved templates with dynamic parameter mappings',
        'Attach campaign media files such as flyers, images, and documents',
        'Schedule campaigns for specific dispatch times or launch immediately',
        'Monitor live broadcast status including queued, in-progress, and completed states',
      ],
      whyItMatters:
        'Running WhatsApp campaigns through official Meta Cloud API channels provides reliable message deliverability, avoids personal device bottlenecks, and keeps communication auditable.',
      linkText: 'View pricing plans for broadcast tiers',
      linkRoute: '/pricing',
    },
    {
      id: 'whatsapp-templates',
      icon: 'bi-chat-left-text-fill',
      badge: 'Template Sync',
      title: 'WhatsApp Templates',
      summary:
        'Manage and synchronize Meta-approved WhatsApp message templates. Preview message structures, dynamic variable placeholders, and interactive quick-reply or call-to-action buttons.',
      whatUsersCanDo: [
        'View and synchronize approved WhatsApp templates from Meta Cloud API',
        'Inspect template categories: Marketing, Utility, and Authentication',
        'Preview message text with variable placeholder parameters (e.g., customer names, order IDs)',
        'Check header configurations including text, image, and document formats',
        'Utilize interactive quick replies and URL call-to-action buttons',
      ],
      whyItMatters:
        'Standardized templates ensure message compliance with Meta policies, eliminate spelling inconsistencies, and enable personalized messaging at scale.',
      linkText: 'Read template best practices in our guides',
      linkRoute: '/blogs',
    },
    {
      id: 'media-management',
      icon: 'bi-folder-check',
      badge: 'Asset Storage',
      title: 'Media Management',
      summary:
        'Upload, organize, and manage campaign media assets including promotional flyers, product catalogs, PDFs, and images for direct attachment to WhatsApp broadcast messages.',
      whatUsersCanDo: [
        'Upload campaign images, promotional flyers, and document files',
        'Organize and browse available media files in a centralized library',
        'Preview uploaded media files prior to campaign dispatch',
        'Attach stored media assets directly to WhatsApp template headers',
        'Track asset file sizes and supported media formats',
      ],
      whyItMatters:
        'Keeping media files organized in one platform ensures team members always use approved, high-quality promotional assets without searching across local file drives.',
      linkText: 'Explore platform features and architecture',
      linkRoute: '/about',
    },
    {
      id: 'reports-analytics',
      icon: 'bi-graph-up-arrow',
      badge: 'Delivery Telemetry',
      title: 'Campaign Reports & Analytics',
      summary:
        'Review detailed operational telemetry for every campaign broadcast. Track message statuses, delivery confirmations, read receipts, and diagnostic error logs.',
      whatUsersCanDo: [
        'Track total dispatched, delivered, read, and failed message counts',
        'Inspect individual recipient delivery timestamps and status transitions',
        'Review official Meta error codes and failure reasons for undelivered messages',
        'Evaluate overall campaign delivery performance across past broadcasts',
        'Export or review campaign logs for operational audits',
      ],
      whyItMatters:
        'Transparent delivery data gives business owners verifiable proof of message receipt, helping teams refine contact lists and resolve invalid phone numbers quickly.',
      linkText: 'Learn about campaign telemetry in our guides',
      linkRoute: '/blogs',
    },
    {
      id: 'notifications',
      icon: 'bi-bell-fill',
      badge: 'Operational Alerts',
      title: 'Notifications',
      summary:
        'Stay informed about essential platform activity with automated in-app notifications regarding campaign progress, dispatch completion, and system updates.',
      whatUsersCanDo: [
        'Receive automated alerts when broadcast campaigns complete dispatching',
        'Get notified of template status synchronization updates from Meta',
        'Monitor monthly broadcast quota milestones and account alerts',
        'Review notification history to stay synchronized across team members',
      ],
      whyItMatters:
        'Timely alerts keep team members aware of campaign milestones and account limits without requiring continuous manual dashboard checking.',
      linkText: 'Contact our team for platform support',
      linkRoute: '/contact',
    },
    {
      id: 'usage-subscription',
      icon: 'bi-credit-card-2-front-fill',
      badge: 'Quota & Billing',
      title: 'Usage & Subscription Management',
      summary:
        'Monitor account message usage, active quota allowances, and subscription plan tiers with transparent controls designed to scale with your business volume.',
      whatUsersCanDo: [
        'Track real-time monthly message credit consumption and remaining quotas',
        'Review current subscription tier, billing period, and feature allocations',
        'Explore plan upgrades and renewal timelines directly within the platform',
        'Maintain clear visibility over messaging volume limits',
      ],
      whyItMatters:
        'Transparent quota meters prevent unexpected service interruptions and help businesses plan their communication budget accurately.',
      linkText: 'View transparent subscription pricing',
      linkRoute: '/pricing',
    },
  ];

  readonly workflowSteps: WorkflowStep[] = [
    {
      number: '01',
      title: 'Manage Your Customers',
      description:
        'Import or add customer contacts into your directory. Apply tags such as wholesale buyers, retail leads, or service clients to create targeted recipient groups.',
      practicalTask: 'Organize contacts and build targeted recipient segments with custom tags.',
    },
    {
      number: '02',
      title: 'Prepare Your Campaign',
      description:
        'Select a Meta-approved message template, map dynamic variables to customer attributes, and attach relevant media assets or promotional catalogs.',
      practicalTask: 'Configure templates, personalize placeholder parameters, and attach media.',
    },
    {
      number: '03',
      title: 'Connect Through WhatsApp',
      description:
        'Dispatch your broadcast campaign directly via the official Meta Cloud API infrastructure, ensuring compliant routing and high deliverability.',
      practicalTask: 'Broadcast to recipient lists via official Meta Cloud API gateway.',
    },
    {
      number: '04',
      title: 'Manage Campaign Activity',
      description:
        'Monitor live broadcast queues and dispatch progress in real time directly from your Seyyon Connect dashboard.',
      practicalTask: 'Oversee campaign status, queue progression, and message throughput.',
    },
    {
      number: '05',
      title: 'Review Performance',
      description:
        'Inspect comprehensive delivery telemetry, including sent counts, delivered confirmations, read receipts, and diagnostic logs.',
      practicalTask: 'Analyze delivery rates, read receipts, and undelivered contact error codes.',
    },
  ];

  readonly businessValueItems: BusinessValueItem[] = [
    {
      icon: 'bi-folder-symlink-fill',
      title: 'Centralized Information',
      description:
        'Eliminate disconnected contact sheets and scattered chat logs. Customer records, templates, media, and broadcast histories stay organized in one unified workspace.',
    },
    {
      icon: 'bi-shield-check',
      title: 'Official Meta Cloud API Standards',
      description:
        'Send campaigns through verified Meta infrastructure, adhering strictly to official messaging policies, template standards, and data security.',
    },
    {
      icon: 'bi-arrow-repeat',
      title: 'Reusable Templates & Media',
      description:
        'Standardize your customer communication with reusable, approved message templates and a shared media asset library accessible across team workflows.',
    },
    {
      icon: 'bi-graph-up',
      title: 'Granular Telemetry & Honest Data',
      description:
        'Verify message delivery with clear sent, delivered, and read receipt metrics. Review specific error codes to maintain clean recipient lists.',
    },
    {
      icon: 'bi-stopwatch-fill',
      title: 'Streamlined Campaign Workflows',
      description:
        'Set up and schedule broadcast campaigns in minutes with an intuitive step-by-step workflow designed for business owners and customer-facing teams.',
    },
    {
      icon: 'bi-sliders',
      title: 'Transparent Quotas & Predictable Costs',
      description:
        'Track monthly messaging usage with clear meter displays and straightforward subscription tiers that scale with your actual communication volume.',
    },
  ];

  readonly audienceProfiles: AudienceProfile[] = [
    {
      icon: 'bi-building',
      title: 'Growing Businesses & Commercial Enterprises',
      description:
        'Companies looking to replace informal, unorganized messaging with a professional customer engagement platform built for scale.',
      keyCapability: 'Centralized customer database and shared broadcast campaign management.',
    },
    {
      icon: 'bi-headset',
      title: 'Customer-Facing & Marketing Teams',
      description:
        'Teams that need structured contact directories, pre-approved message templates, and consistent brand communication across client touchpoints.',
      keyCapability: 'Pre-approved WhatsApp templates with dynamic variables and interactive buttons.',
    },
    {
      icon: 'bi-megaphone-fill',
      title: 'Businesses Running Regular WhatsApp Broadcasts',
      description:
        'Organizations dispatching routine product updates, seasonal catalogs, payment reminders, and event announcements.',
      keyCapability: 'Scheduled broadcasts, media attachments, and high-deliverability routing.',
    },
    {
      icon: 'bi-bar-chart-line-fill',
      title: 'Teams Seeking Verifiable Delivery Reporting',
      description:
        'Business operators who require transparent metrics on delivery confirmations, read receipts, and campaign audit logs.',
      keyCapability: 'Real-time campaign telemetry and granular error code diagnostics.',
    },
  ];

  readonly regionalFocusItems: RegionalBusinessFocus[] = [
    {
      badge: 'Coimbatore Commercial & Industrial Hub',
      title: 'Manufacturing, Engineering & Industrial Suppliers',
      description:
        'Coimbatore is home to extensive manufacturing clusters, pump and motor industries, textile machinery producers, and B2B engineering suppliers. Businesses need dependable channels to send quotation updates, product spec sheets, dispatch notices, and service reminders.',
      businessApplication:
        'Centralized customer directory for industrial clients, PDF catalog attachments, and reliable broadcast dispatches.',
    },
    {
      badge: 'Tiruppur Textile & Apparel Cluster',
      title: 'Garment Manufacturers, Fabric Merchants & Exporters',
      description:
        'Tiruppur represents a global hub for knitwear, textile processing, and apparel export. Garment manufacturers and merchant exporters coordinate with domestic buyers, fabric suppliers, and logistics partners through timely messaging and catalog broadcasts.',
      businessApplication:
        'Seasonal collection announcements, sample dispatch alerts, and wholesale buyer broadcast lists.',
    },
    {
      badge: 'Kongu Region & Western Tamil Nadu',
      title: 'Retailers, Distributors, Educational & Service Brands',
      description:
        'Across Coimbatore, Tiruppur, Erode, Salem, and Western Tamil Nadu, retail brands, educational institutions, agro-businesses, and service providers rely on WhatsApp to maintain consistent, everyday customer engagement.',
      businessApplication:
        'Event notifications, seasonal promotional updates, service appointment alerts, and customer contact management.',
    },
  ];

  readonly centralizedAdvantages: CentralizedAdvantage[] = [
    {
      aspect: 'Customer Contact Management',
      disconnectedApproach:
        'Contacts scattered across separate personal phones, employee SIMs, and unmaintained spreadsheets.',
      seyyonUnifiedApproach:
        'Centralized customer directory with custom tags, bulk CSV import, and organized audience segmentation.',
    },
    {
      aspect: 'Message Template Coordination',
      disconnectedApproach:
        'Manually typing messages with inconsistent spelling, unapproved wording, and potential policy violations.',
      seyyonUnifiedApproach:
        'Meta-approved template catalog with dynamic parameter placeholders and interactive CTA buttons.',
    },
    {
      aspect: 'Promotional Media Handling',
      disconnectedApproach:
        'Searching for flyers and product PDFs across local drives, resulting in low-resolution or outdated attachments.',
      seyyonUnifiedApproach:
        'Centralized media asset library allowing direct attachment of approved flyers, images, and documents.',
    },
    {
      aspect: 'Broadcast Dispatch Workflow',
      disconnectedApproach:
        'Slow one-by-one manual forwarding on mobile devices with high risk of phone number blocks and rate throttling.',
      seyyonUnifiedApproach:
        'Scheduled or instant broadcasts powered by official Meta Cloud API infrastructure with high deliverability.',
    },
    {
      aspect: 'Performance Visibility & Logs',
      disconnectedApproach:
        'No verifiable data on whether messages were received, read, or failed; zero audit history.',
      seyyonUnifiedApproach:
        'Real-time delivery telemetry, read confirmations, Meta error diagnostics, and exportable campaign reports.',
    },
  ];

  ngOnInit(): void {
    const pageTitle = 'WhatsApp Business & Customer Engagement Software | Seyyon Connect';
    const metaDescription =
      'Explore Seyyon Connect for customer management, WhatsApp campaigns, templates, media and campaign reporting. Built for businesses in Coimbatore, Tiruppur and Tamil Nadu.';
    const pageUrl = 'https://seyyonconnect.in/products';

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
          name: 'Products',
          item: pageUrl,
        },
      ],
    };

    const softwareSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Seyyon Connect',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web-based Cloud Platform',
      url: pageUrl,
      description: metaDescription,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: '999',
      },
    };

    this.seo.updateSeo({
      title: pageTitle,
      description: metaDescription,
      ogTitle: pageTitle,
      ogDescription: metaDescription,
      ogUrl: pageUrl,
      canonicalUrl: pageUrl,
      schema: [organizationSchema, websiteSchema, breadcrumbSchema, softwareSchema],
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
