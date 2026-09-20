import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  isPopular?: boolean;
}

@Component({
  selector: 'app-public-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="public-page-wrapper">
      <section class="page-hero-section">
        <div class="page-container text-center">
          <span class="page-eyebrow">TRANSPARENT PRICING</span>
          <h1 class="page-title">Flexible plans designed to scale with your business.</h1>
          <p class="page-subtitle">
            Choose the right tier for your messaging volume. All plans include official Meta Cloud API connectivity and standard security.
          </p>
        </div>
      </section>

      <section class="page-content-section">
        <div class="page-container">
          <div class="pricing-grid">
            @for (tier of tiers; track tier.id) {
              <div class="pricing-card" [class.popular]="tier.isPopular">
                @if (tier.badge) {
                  <div class="tier-popular-badge">{{ tier.badge }}</div>
                }
                <div class="tier-header">
                  <h3 class="tier-name">{{ tier.name }}</h3>
                  <p class="tier-desc">{{ tier.description }}</p>
                  <div class="tier-price-box">
                    <span class="currency">₹</span>
                    <span class="amount">{{ tier.price }}</span>
                    <span class="period">/{{ tier.period }}</span>
                  </div>
                </div>

                <ul class="tier-features-list">
                  @for (feat of tier.features; track feat) {
                    <li>
                      <i class="bi bi-check2-circle text-primary"></i>
                      <span>{{ feat }}</span>
                    </li>
                  }
                </ul>

                <a routerLink="/login" class="btn" [class.btn-primary]="tier.isPopular" [class.btn-outline-primary]="!tier.isPopular">
                  <span>{{ tier.ctaText }}</span>
                  <i class="bi bi-arrow-right ms-2"></i>
                </a>
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
    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      align-items: stretch;
    }
    @media (max-width: 991.98px) {
      .pricing-grid {
        grid-template-columns: 1fr;
        max-width: 500px;
        margin: 0 auto;
      }
      .page-title {
        font-size: 2.125rem;
      }
    }
    .pricing-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      padding: 2.25rem 2rem;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.25s ease;
    }
    .pricing-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 36px -8px rgba(15, 27, 61, 0.1);
    }
    .pricing-card.popular {
      border: 2px solid #2563eb;
      box-shadow: 0 12px 30px -6px rgba(37, 99, 235, 0.18);
    }
    .tier-popular-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: #2563eb;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }
    .tier-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f1b3d;
      margin-bottom: 0.35rem;
    }
    .tier-desc {
      font-size: 0.875rem;
      color: #64748b;
      margin-bottom: 1.5rem;
      min-height: 40px;
    }
    .tier-price-box {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin-bottom: 1.75rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .currency {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f1b3d;
    }
    .amount {
      font-size: 3rem;
      font-weight: 800;
      color: #0f1b3d;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .period {
      font-size: 0.9375rem;
      color: #64748b;
      font-weight: 600;
    }
    .tier-features-list {
      list-style: none;
      padding: 0;
      margin: 0 0 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1 0 auto;
    }
    .tier-features-list li {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #172033;
    }
    .btn {
      width: 100%;
      padding: 0.75rem 1.25rem;
      font-weight: 700;
      border-radius: 0.625rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      border: 1px solid #2563eb;
    }
    .btn-primary:hover {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }
    .btn-outline-primary {
      background: transparent;
      color: #2563eb;
      border: 1px solid #2563eb;
    }
    .btn-outline-primary:hover {
      background: #eff6ff;
    }
  `],
})
export class PricingComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly tiers: PricingTier[] = [
    {
      id: 'starter',
      name: 'Starter Plan',
      price: '1,499',
      period: 'month',
      description: 'Ideal for small businesses launching WhatsApp campaigns.',
      features: [
        'Up to 2,500 messages/mo',
        'Customer Directory (1,000 records)',
        'Standard Template Management',
        'Media Storage up to 500 MB',
        'Email Support',
      ],
      ctaText: 'Get Started',
    },
    {
      id: 'growth',
      name: 'Growth Plan',
      badge: 'Most Popular',
      price: '3,999',
      period: 'month',
      description: 'Designed for scaling companies with regular broadcast schedules.',
      features: [
        'Up to 15,000 messages/mo',
        'Customer Directory (10,000 records)',
        'Unlimited Template Syncing',
        'Priority Queue Processing',
        'Media Storage up to 2 GB',
        'Detailed Read Receipts Telemetry',
      ],
      ctaText: 'Start Free Trial',
      isPopular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: '8,999',
      period: 'month',
      description: 'Dedicated infrastructure for high-volume enterprise communications.',
      features: [
        'Custom Monthly Message Allocations',
        'Unlimited Customer Records',
        'Dedicated Cloud Throughput',
        'Custom Webhooks & Integrations',
        'Dedicated Account Manager',
        '99.9% Uptime SLA',
      ],
      ctaText: 'Contact Sales',
    },
  ];

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Pricing Plans | Seyyon Connect',
      description: 'Transparent pricing for Seyyon Connect WhatsApp marketing, broadcast campaigns, and customer engagement platform.',
    });
  }
}
