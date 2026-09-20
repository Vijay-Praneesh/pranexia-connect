import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

export interface FeatureHighlight {
  icon: string;
  title: string;
  description: string;
}

export interface ServiceCard {
  id: string;
  number: string;
  title: string;
  description: string;
  link: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  image: string;
}

export interface BlogPost {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly features: FeatureHighlight[] = [
    {
      icon: 'bi-lightning-charge-fill',
      title: 'Super-Fast Broadcasts',
      description: 'High-throughput automated message queue with zero latency delivery.',
    },
    {
      icon: 'bi-router-fill',
      title: 'Meta Cloud API Direct',
      description: 'Direct Meta cloud infrastructure connection and instant message status.',
    },
    {
      icon: 'bi-cpu-fill',
      title: 'Smart Segmentation',
      description: 'Tag-based audience filtering, custom attributes, and targeted dispatches.',
    },
    {
      icon: 'bi-broadcast-pin',
      title: 'Real-time Analytics',
      description: 'Comprehensive delivery rates, read receipts, and live quota telemetry.',
    },
  ];

  readonly services: ServiceCard[] = [
    {
      id: 'secure-connection',
      number: '01',
      title: 'Secure Connection',
      description: 'Donec enim diam vulputate ut aliquam id diam maecenas.',
      link: '/products',
    },
    {
      id: 'hd-dth-connections',
      number: '02',
      title: 'HD DTH Connections',
      description: 'Bibendum enim facilisis gravida neque convallis auctor urna nunc.',
      link: '/products',
    },
    {
      id: 'high-speed-wifi',
      number: '03',
      title: 'High Speed Wi-Fi',
      description: 'Pretium vulputate sapien nec sagittis aliquam malesuada.',
      link: '/products',
    },
    {
      id: 'office-package',
      number: '04',
      title: 'Office Package',
      description: 'Nascetur ridiculus mus mauris vitae ultricies leo integer malesuada.',
      link: '/products',
    },
  ];

  readonly testimonial: TestimonialItem = {
    quote:
      'Seyyon Connect has streamlined our customer outreach with instant Meta Cloud API delivery, automated template approvals, and high-deliverability campaigns.',
    author: 'Sophie Lawson',
    role: 'Marketing Director',
    image: 'assets/public-website/home/banner-1.jpg',
  };

  readonly blogs: BlogPost[] = [
    {
      id: 'how-whatsapp-campaigns-improve-customer-engagement',
      title: 'How WhatsApp Campaigns Can Improve Customer Engagement',
      description:
        'Explore how structured broadcast campaigns, certified Meta templates, and delivery telemetry build consistent audience engagement...',
      image: 'assets/blog/blog-01.jpg',
      link: '/blogs/how-whatsapp-campaigns-improve-customer-engagement',
    },
    {
      id: 'managing-customers-and-campaigns-in-one-platform',
      title: 'A Practical Guide to Managing Customers and Campaigns in One Platform',
      description:
        'Learn how unifying contact records, custom audience segmentation, and broadcast workflows eliminates data silos and boosts productivity...',
      image: 'assets/blog/blog-02.jpg',
      link: '/blogs/managing-customers-and-campaigns-in-one-platform',
    },
    {
      id: 'understanding-whatsapp-campaign-performance-and-analytics',
      title: 'Understanding WhatsApp Campaign Performance and Analytics',
      description:
        'A deep dive into message delivery lifecycles, error diagnostics, read receipts, and how telemetry data optimizes communication...',
      image: 'assets/blog/blog-03.jpg',
      link: '/blogs/understanding-whatsapp-campaign-performance-and-analytics',
    },
  ];

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Seyyon Connect | Connect. Engage. Grow.',
      description:
        'A smarter way to manage customers, campaigns, and WhatsApp engagement from one powerful enterprise platform.',
      keywords:
        'WhatsApp API, Customer Engagement, SaaS Campaign Management, WhatsApp Templates, Enterprise Communication',
      ogTitle: 'Seyyon Connect | Connect. Engage. Grow.',
      ogDescription:
        'A smarter way to manage customers, campaigns, and WhatsApp engagement from one powerful platform.',
    });
  }

  scrollToSection(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
