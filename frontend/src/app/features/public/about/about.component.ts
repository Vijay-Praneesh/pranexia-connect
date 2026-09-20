import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-public-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="public-page-wrapper">
      <section class="page-hero-section">
        <div class="page-container text-center">
          <span class="page-eyebrow">ABOUT SEYYON CONNECT</span>
          <h1 class="page-title">Connecting businesses with customers through intelligent communication.</h1>
          <p class="page-subtitle">
            Seyyon Connect is built to empower organizations with high-deliverability WhatsApp broadcasts, unified customer data management, and actionable campaign insights.
          </p>
        </div>
      </section>

      <section class="page-content-section">
        <div class="page-container">
          <div class="about-grid">
            <div class="about-card">
              <div class="card-icon"><i class="bi bi-bullseye text-primary"></i></div>
              <h3>Our Mission</h3>
              <p>To eliminate communication friction by delivering seamless, scalable, and compliant WhatsApp engagement tools for modern businesses.</p>
            </div>
            <div class="about-card">
              <div class="card-icon"><i class="bi bi-shield-check text-success"></i></div>
              <h3>Meta Cloud API Native</h3>
              <p>Built strictly on official Meta Cloud API infrastructure to guarantee maximum delivery rates, encryption, and enterprise compliance.</p>
            </div>
            <div class="about-card">
              <div class="card-icon"><i class="bi bi-lightning-charge text-warning"></i></div>
              <h3>Real-Time Performance</h3>
              <p>Engineered for high-throughput messaging with zero-lag telemetry, real-time message read receipts, and live queue monitoring.</p>
            </div>
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
      max-width: 1140px;
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
    .about-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
    @media (max-width: 991.98px) {
      .about-grid {
        grid-template-columns: 1fr;
      }
      .page-title {
        font-size: 2.125rem;
      }
    }
    .about-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 2rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .about-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 24px -6px rgba(15, 27, 61, 0.08);
      background: #ffffff;
    }
    .card-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    .about-card h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f1b3d;
      margin-bottom: 0.75rem;
    }
    .about-card p {
      font-size: 0.9375rem;
      color: #64748b;
      line-height: 1.6;
      margin: 0;
    }
  `],
})
export class AboutComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'About Us | Seyyon Connect',
      description: 'Learn about Seyyon Connect, our mission, and how we empower modern businesses with intelligent customer communication.',
    });
  }
}
