import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

export interface KeyPillar {
  icon: string;
  title: string;
  description: string;
}

export interface CoreValue {
  number: string;
  icon: string;
  title: string;
  description: string;
  tagline: string;
}

export interface WhyChooseItem {
  id: string;
  icon: string;
  badge: string;
  title: string;
  description: string;
  bullets: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
  email: string;
}

export interface ImpactStat {
  value: string;
  unit: string;
  label: string;
}

export interface StorySpotlight {
  quote: string;
  author: string;
  role: string;
  image: string;
  title: string;
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

  readonly spotlight: StorySpotlight = {
    quote:
      'We envisioned a platform where businesses could achieve direct, frictionless, and high-deliverability conversations with customers worldwide without managing complex telecom stacks.',
    author: 'Seyyon Connect Team',
    role: 'Product & Engineering Division',
    image: 'assets/public-website/home/banner-1.jpg',
    title: 'Seyyon Connect Architecture',
  };

  readonly keyPillars: KeyPillar[] = [
    {
      icon: 'bi-broadcast-pin',
      title: 'Meta Cloud API Native',
      description: 'Official direct integration ensuring 99.99% message delivery rates and enterprise security.',
    },
    {
      icon: 'bi-lightning-charge-fill',
      title: 'High-Throughput Queue',
      description: 'Asynchronous broadcast engine designed to dispatch thousands of messages with zero lag.',
    },
    {
      icon: 'bi-shield-check',
      title: 'Enterprise Compliance',
      description: 'Strict adherence to Meta messaging policies, opt-in safeguards, and data protection.',
    },
    {
      icon: 'bi-cpu-fill',
      title: 'Intelligent Telemetry',
      description: 'Real-time message read receipts, delivery confirmation, and detailed error diagnostics.',
    },
  ];

  readonly coreValues: CoreValue[] = [
    {
      number: '01',
      icon: 'bi-shield-lock-fill',
      title: 'Uncompromising Reliability',
      description:
        'We build high-availability cloud infrastructure so your mission-critical campaigns reach customers on time, every time.',
      tagline: '99.99% Uptime SLA',
    },
    {
      number: '02',
      icon: 'bi-people-fill',
      title: 'Customer-Centric Simplicity',
      description:
        'From intuitive template builders to rapid audience segmentation, every tool is engineered for effortless productivity.',
      tagline: 'Effortless Workflows',
    },
    {
      number: '03',
      icon: 'bi-graph-up-arrow',
      title: 'Transparent Telemetry',
      description:
        'Full visibility into message queues, sent counts, delivery receipts, and error insights with zero hidden metrics.',
      tagline: 'Real-Time Insights',
    },
    {
      number: '04',
      icon: 'bi-lock-fill',
      title: 'Enterprise Security',
      description:
        'Bank-grade data encryption, granular role-based permissions, and strict Meta policy enforcement for total peace of mind.',
      tagline: 'End-to-End Protection',
    },
  ];

  readonly whyChooseUs: WhyChooseItem[] = [
    {
      id: 'cloud-infrastructure',
      icon: 'bi-cloud-check-fill',
      badge: 'Architecture',
      title: 'Direct Cloud Infrastructure',
      description:
        'Bypass traditional aggregators and SMS bottlenecks with official Meta Cloud API infrastructure.',
      bullets: [
        'Zero middleware latency',
        'Official Meta verification support',
        'High TPS throughput thresholds',
      ],
    },
    {
      id: 'campaign-engine',
      icon: 'bi-megaphone-fill',
      badge: 'Automation',
      title: 'Automated Campaign Studio',
      description:
        'Design, personalize, and schedule bulk campaigns with variable placeholders and instant media previews.',
      bullets: [
        'Dynamic placeholder variables',
        'Rich media & CTA buttons',
        'Live dispatch progress bars',
      ],
    },
    {
      id: 'audience-management',
      icon: 'bi-person-badge-fill',
      badge: 'Intelligence',
      title: 'Smart Contact Segmentation',
      description:
        'Organize customer lists with custom tags, bulk CSV imports, and targeted filtering for hyper-relevant dispatches.',
      bullets: [
        'Custom tagging & filtering',
        'Automatic duplicate removal',
        'VIP audience categorization',
      ],
    },
  ];

  readonly teamMembers: TeamMember[] = [
    {
      name: 'Praveen Kumar',
      role: 'Head of Engineering & Cloud Architecture',
      bio: 'Cloud systems architect specializing in distributed messaging queues, high-availability microservices, and telecom APIs.',
      image: 'assets/public-website/blog/blog-1.jpg',
      email: 'praveen@seyyonconnect.com',
    },
    {
      name: 'Ananya Sharma',
      role: 'Product Lead & Customer Experience',
      bio: 'Leading product design with a deep focus on conversational UI, template optimization, and scalable enterprise workflows.',
      image: 'assets/public-website/blog/blog-2.jpg',
      email: 'ananya@seyyonconnect.com',
    },
    {
      name: 'Karthik Raja',
      role: 'Operations & Meta Ecosystem Specialist',
      bio: 'Expert in Meta business verification, compliance guidelines, international WhatsApp routing, and client onboarding.',
      image: 'assets/public-website/blog/blog-3.jpg',
      email: 'karthik@seyyonconnect.com',
    },
  ];

  readonly impactStats: ImpactStat[] = [
    { value: '500', unit: 'K+', label: 'Campaigns Dispatched' },
    { value: '8', unit: 'M+', label: 'Audiences Engaged' },
    { value: '99.99', unit: '%', label: 'Delivery Reliability' },
    { value: '24/7', unit: '', label: 'Engineering NOC' },
  ];

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'About Us | Seyyon Connect - Intelligent Customer Engagement',
      description:
        'Learn about Seyyon Connect, our mission, values, engineering architecture, and leadership team delivering next-gen WhatsApp broadcast and customer communication tools.',
      keywords:
        'About Seyyon Connect, WhatsApp Cloud API, Enterprise Broadcast, Customer Engagement, Messaging Automation, Meta Partner',
      ogTitle: 'About Us | Seyyon Connect',
      ogDescription:
        'Connecting businesses with audiences worldwide through high-speed Meta Cloud API messaging infrastructure.',
    });
  }

  scrollToSection(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
