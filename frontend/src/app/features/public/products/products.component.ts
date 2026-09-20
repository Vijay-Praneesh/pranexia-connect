import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

export interface ProductCategoryTab {
  id: string;
  label: string;
  icon: string;
}

export interface ProductDetail {
  id: string;
  number: string;
  category: string;
  icon: string;
  title: string;
  badge: string;
  description: string;
  highlights: string[];
}

export interface WorkflowStep {
  stepNumber: string;
  title: string;
  description: string;
  icon: string;
}

export interface ComparisonRow {
  feature: string;
  detail: string;
  seyyon: string;
  others: string;
}

export interface ProductStat {
  value: string;
  unit: string;
  label: string;
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

  activeCategory: string = 'all';

  readonly categories: ProductCategoryTab[] = [
    { id: 'all', label: 'All Modules', icon: 'bi-grid-fill' },
    { id: 'campaigns', label: 'Campaign Studio', icon: 'bi-megaphone-fill' },
    { id: 'templates', label: 'Templates & Media', icon: 'bi-whatsapp' },
    { id: 'crm', label: 'Audience & CRM', icon: 'bi-people-fill' },
    { id: 'telemetry', label: 'Telemetry & Quotas', icon: 'bi-graph-up-arrow' },
  ];

  readonly products: ProductDetail[] = [
    {
      id: 'customers',
      number: '01',
      category: 'crm',
      icon: 'bi-people-fill',
      title: 'Customer Directory & CRM',
      badge: 'Audience Core',
      description:
        'Centralize contact lists with custom tag segmentation, duplicate prevention, and seamless CSV/Excel imports.',
      highlights: [
        'Custom Audience Tagging & Multi-Criteria Filtering',
        'High-Speed CSV / Excel Bulk Contact Ingestion',
        'VIP & High-Priority Audience Categorization',
        'Automatic Opt-In & Unsubscribe Safeguards',
      ],
    },
    {
      id: 'campaigns',
      number: '02',
      category: 'campaigns',
      icon: 'bi-megaphone-fill',
      title: 'Automated Campaign Studio',
      badge: 'High Throughput',
      description:
        'Schedule and dispatch high-volume broadcasts with asynchronous queue management and live progress tracking.',
      highlights: [
        'Queue-based Zero-Lag Asynchronous Dispatch Engine',
        'Dynamic Column-to-Variable Parameter Mapping',
        'Instant Schedule Execution or Time-Delayed Launch',
        'Emergency Queue Pause, Resume & Cancel Controls',
      ],
    },
    {
      id: 'templates',
      number: '03',
      category: 'templates',
      icon: 'bi-whatsapp',
      title: 'WhatsApp Template Studio',
      badge: 'Meta Certified',
      description:
        'Design rich-text message templates with multimedia headers, quick reply actions, and instant Meta sync.',
      highlights: [
        'Direct Meta Cloud API Verification & Live Polling',
        'Image, Video & Document Header Support',
        'Interactive CTA & Custom Quick-Reply Buttons',
        'Multi-Language Template Localization Support',
      ],
    },
    {
      id: 'media',
      number: '04',
      category: 'templates',
      icon: 'bi-images',
      title: 'Media Asset Center',
      badge: 'Cloud Storage',
      description:
        'Securely store, organize, and attach promotional flyers, product catalogs, and PDFs to your campaigns.',
      highlights: [
        'Instant Media Preview & Meta Hash Verification',
        'Encrypted Cloud Storage with Rapid Asset CDN',
        'Multi-Format Ingestion (JPEG, PNG, MP4, PDF)',
        'Tenant Quota Protection & Compression Utility',
      ],
    },
    {
      id: 'reports',
      number: '05',
      category: 'telemetry',
      icon: 'bi-graph-up-arrow',
      title: 'Real-Time Telemetry & Logs',
      badge: 'Live Diagnostics',
      description:
        'Inspect message statuses, delivery ratios, failed attempts with official Meta error codes, and read receipts.',
      highlights: [
        'Delivery, Read & Failure Ratio Telemetry',
        'Meta Error Diagnostics with Fix Suggestions',
        'Live Broadcast Activity Feed & Timestamps',
        'Exportable Campaign Audit Logs & Reports',
      ],
    },
    {
      id: 'subscriptions',
      number: '06',
      category: 'telemetry',
      icon: 'bi-shield-check',
      title: 'Usage, Quotas & Subscriptions',
      badge: 'Transparent',
      description:
        'Monitor daily and monthly message credit counters with automatic tier tracking and transparent renewal alerts.',
      highlights: [
        'Real-Time Credit Meters & Quota Utilization',
        'Multi-Tier Safeguards & Threshold Warnings',
        'Transparent Billing Invoices & Renewal Tracking',
        'Multi-Tenant Company Admin Quota Allocations',
      ],
    },
  ];

  get filteredProducts(): ProductDetail[] {
    if (this.activeCategory === 'all') {
      return this.products;
    }
    return this.products.filter((p) => p.category === this.activeCategory);
  }

  readonly workflowSteps: WorkflowStep[] = [
    {
      stepNumber: '01',
      title: 'Connect WhatsApp Account',
      description: 'Link your Meta Business Account and verified phone number with one-click Cloud API credentials.',
      icon: 'bi-whatsapp',
    },
    {
      stepNumber: '02',
      title: 'Import & Segment Contacts',
      description: 'Upload your audience lists via CSV/Excel, assign custom tags, and set up dynamic filtering groups.',
      icon: 'bi-person-plus-fill',
    },
    {
      stepNumber: '03',
      title: 'Design Verified Templates',
      description: 'Create interactive templates with images, variables, and CTA buttons, verified instantly by Meta.',
      icon: 'bi-layout-text-window-reverse',
    },
    {
      stepNumber: '04',
      title: 'Broadcast & Measure Telemetry',
      description: 'Launch your campaign to thousands of recipients and observe real-time delivery and read metrics.',
      icon: 'bi-broadcast-pin',
    },
  ];

  readonly comparisonRows: ComparisonRow[] = [
    {
      feature: 'Delivery Speed & Infrastructure',
      detail: 'Direct Meta Cloud API vs. third-party aggregators',
      seyyon: 'Direct Cloud API (10x faster, zero middleware lag)',
      others: 'Legacy SMS / Aggregator queues with delay',
    },
    {
      feature: 'Rich Media & Interactive CTAs',
      detail: 'Images, PDFs, Video headers, and Quick-Replies',
      seyyon: 'Supported natively with dynamic variables',
      others: 'Plain text only or broken shortened links',
    },
    {
      feature: 'Message Read Receipts',
      detail: 'Real-time verified delivery and read timestamps',
      seyyon: '100% accurate live read telemetry',
      others: 'Unreliable delivery receipts, zero read data',
    },
    {
      feature: 'Account Ban Safeguards',
      detail: 'Meta policy enforcement and opt-in protection',
      seyyon: 'Official Cloud API with zero risk of bans',
      others: 'High risk of number bans via unofficial tools',
    },
    {
      feature: 'Contact Segmentation & CRM',
      detail: 'Tag-based audience management and bulk imports',
      seyyon: 'Comprehensive multi-tenant customer CRM',
      others: 'Isolated spreadsheets and manual copy-pasting',
    },
  ];

  readonly productStats: ProductStat[] = [
    { value: '10', unit: 'x', label: 'Faster Broadcast Speed' },
    { value: '99.99', unit: '%', label: 'Delivery SLA Rate' },
    { value: '<100', unit: 'ms', label: 'Cloud API Latency' },
    { value: '0', unit: '%', label: 'Aggregator Markup' },
  ];

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Products & Solutions | Seyyon Connect - Intelligent WhatsApp Platform',
      description:
        'Explore the full suite of Seyyon Connect enterprise tools: WhatsApp Template Studio, High-Throughput Campaign Automation, Customer CRM, and Live Telemetry.',
      keywords:
        'WhatsApp Products, Meta Cloud API, Campaign Studio, Template Builder, Customer Directory, Telemetry Analytics, Broadcast Automation',
      ogTitle: 'Products & Solutions | Seyyon Connect',
      ogDescription:
        'Explore enterprise customer engagement tools built on official Meta Cloud API infrastructure.',
    });
  }

  setCategory(category: string): void {
    this.activeCategory = category;
  }

  scrollToSection(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
