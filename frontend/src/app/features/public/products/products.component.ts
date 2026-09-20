import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

interface ProductDetail {
  id: string;
  icon: string;
  title: string;
  badge: string;
  description: string;
  highlights: string[];
}

@Component({
  selector: 'app-public-products',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="public-page-wrapper">
      <section class="page-hero-section">
        <div class="page-container text-center">
          <span class="page-eyebrow">SEYYON CONNECT PLATFORM</span>
          <h1 class="page-title">Enterprise customer engagement built for scale.</h1>
          <p class="page-subtitle">
            Explore the full suite of tools designed to streamline contacts, template approvals, campaign dispatches, and deep performance telemetry.
          </p>
        </div>
      </section>

      <section class="page-content-section">
        <div class="page-container">
          <div class="products-grid">
            @for (prod of products; track prod.id) {
              <div class="product-feature-card" [attr.data-id]="prod.id">
                <div class="card-header-bar">
                  <div class="prod-icon-box">
                    <i class="bi {{ prod.icon }}"></i>
                  </div>
                  <span class="prod-badge">{{ prod.badge }}</span>
                </div>
                <h3>{{ prod.title }}</h3>
                <p>{{ prod.description }}</p>
                <ul class="highlights-list">
                  @for (hl of prod.highlights; track hl) {
                    <li>
                      <i class="bi bi-check-circle-fill text-primary"></i>
                      <span>{{ hl }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .public-page-wrapper {
      padding-bottom: 5rem;
    }
    .page-hero-section {
      padding: 4.5rem 1.5rem 3rem;
      background: radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.06) 0%, #ffffff 70%);
      border-bottom: 1px solid #f1f5f9;
    }
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }
    .page-eyebrow {
      font-size: 0.8125rem;
      font-weight: 800;
      color: #2563eb;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      display: block;
      margin-bottom: 1rem;
    }
    .page-title {
      font-size: 2.75rem;
      font-weight: 800;
      color: #0f1b3d;
      letter-spacing: -0.025em;
      line-height: 1.2;
      max-width: 800px;
      margin: 0 auto 1.25rem;
    }
    .page-subtitle {
      font-size: 1.125rem;
      color: #64748b;
      max-width: 680px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .page-content-section {
      padding: 4rem 0;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
    @media (max-width: 991.98px) {
      .products-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .page-title {
        font-size: 2.125rem;
      }
    }
    @media (max-width: 575.98px) {
      .products-grid {
        grid-template-columns: 1fr;
      }
    }
    .product-feature-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.15rem;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(15, 27, 61, 0.03);
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;
    }
    .product-feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 32px -8px rgba(15, 27, 61, 0.08);
      border-color: #cbd5e1;
    }
    .card-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .prod-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 0.75rem;
      background: #eff6ff;
      color: #2563eb;
      display: grid;
      place-items: center;
      font-size: 1.35rem;
    }
    .prod-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #0f1b3d;
      background: #f1f5f9;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
    }
    .product-feature-card h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f1b3d;
      margin-bottom: 0.75rem;
    }
    .product-feature-card p {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 1.25rem;
      flex: 1 0 auto;
    }
    .highlights-list {
      list-style: none;
      padding: 1rem 0 0;
      margin: 0;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .highlights-list li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #172033;
    }
  `],
})
export class ProductsComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly products: ProductDetail[] = [
    {
      id: 'customers',
      icon: 'bi-people-fill',
      title: 'Customer Directory',
      badge: 'Core Module',
      description: 'Centralize and segment contact records with custom metadata, tags, and bulk upload validation.',
      highlights: ['Custom Tagging & Filters', 'CSV/Excel Contact Ingestion', 'VIP Audience Segmentation'],
    },
    {
      id: 'campaigns',
      icon: 'bi-megaphone-fill',
      title: 'Campaign Studio',
      badge: 'High Speed',
      description: 'Schedule broadcast dispatches with live progress bars, pause/resume controls, and queue diagnostics.',
      highlights: ['Queue-based Dispatch Engine', 'Dynamic Variable Injection', 'Schedule or Instant Send'],
    },
    {
      id: 'templates',
      icon: 'bi-whatsapp',
      title: 'WhatsApp Templates',
      badge: 'Meta Certified',
      description: 'Design and sync rich-text message templates with image headers, custom CTA buttons, and variable slots.',
      highlights: ['Direct Meta Cloud Sync', 'Header Media Support', 'Quick Reply Buttons'],
    },
    {
      id: 'media',
      icon: 'bi-images',
      title: 'Media Asset Center',
      badge: 'Storage',
      description: 'Organize media attachments, flyers, PDFs, and banners with instant preview and quota enforcement.',
      highlights: ['Instant Asset Preview', 'Secure Cloud Storage', 'Multi-Format Support'],
    },
    {
      id: 'reports',
      icon: 'bi-graph-up-arrow',
      title: 'Analytics & Logs',
      badge: 'Telemetry',
      description: 'Inspect message statuses, delivery ratios, failed attempts with error explanations, and read timestamps.',
      highlights: ['Delivery & Read Ratios', 'Error Diagnostic Insights', 'Downloadable Audit Logs'],
    },
    {
      id: 'subscriptions',
      icon: 'bi-shield-check',
      title: 'Usage & Quotas',
      badge: 'Transparent',
      description: 'Monitor daily and monthly message credit counters with automatic tier tracking and transparent renewal.',
      highlights: ['Real-Time Credit Meters', 'Tier Limit Safeguards', 'Transparent Billing Logs'],
    },
  ];

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Products & Solutions | Seyyon Connect',
      description: 'Explore Seyyon Connect capabilities including WhatsApp broadcast campaigns, Meta template management, customer directory, and telemetry analytics.',
    });
  }
}
