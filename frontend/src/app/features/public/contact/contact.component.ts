import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-public-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="public-page-wrapper">
      <section class="page-hero-section">
        <div class="page-container text-center">
          <span class="page-eyebrow">GET IN TOUCH</span>
          <h1 class="page-title">We're here to help you connect and grow.</h1>
          <p class="page-subtitle">
            Have questions about Seyyon Connect, WhatsApp onboarding, Meta Cloud API integration, or enterprise volume pricing? Reach out anytime.
          </p>
        </div>
      </section>

      <section class="page-content-section">
        <div class="page-container">
          <div class="contact-grid">
            <!-- Contact Details Card -->
            <div class="contact-info-card">
              <h3>Contact Information</h3>
              <p>Our dedicated support team is available to assist with onboarding and technical requirements.</p>

              <div class="info-items">
                <div class="info-item">
                  <div class="info-icon"><i class="bi bi-envelope-fill text-primary"></i></div>
                  <div>
                    <span class="label">Email Support</span>
                    <span class="value">support&#64;seyyon.com</span>
                  </div>
                </div>

                <div class="info-item">
                  <div class="info-icon"><i class="bi bi-clock-fill text-primary"></i></div>
                  <div>
                    <span class="label">Operating Hours</span>
                    <span class="value">Monday – Saturday: 9:00 AM – 7:00 PM IST</span>
                  </div>
                </div>

                <div class="info-item">
                  <div class="info-icon"><i class="bi bi-shield-check text-success"></i></div>
                  <div>
                    <span class="label">Meta Cloud API Status</span>
                    <span class="value">Operational (99.9% SLA)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Simple Inquiry Form -->
            <div class="contact-form-card">
              @if (submitted) {
                <div class="alert alert-success d-flex align-items-center gap-3">
                  <i class="bi bi-check-circle-fill fs-4"></i>
                  <div>
                    <h5 class="mb-1">Thank you for your message!</h5>
                    <p class="mb-0 text-muted">A Seyyon Connect product specialist will get in touch with you shortly.</p>
                  </div>
                </div>
              } @else {
                <form (ngSubmit)="onSubmit()" #contactForm="ngForm">
                  <h3 class="form-title">Send us a message</h3>

                  <div class="form-group mb-3">
                    <label for="name" class="form-label">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      class="form-control"
                      name="name"
                      [(ngModel)]="formData.name"
                      required
                      placeholder="e.g. Rajesh Kumar"
                    />
                  </div>

                  <div class="form-group mb-3">
                    <label for="email" class="form-label">Work Email</label>
                    <input
                      type="email"
                      id="email"
                      class="form-control"
                      name="email"
                      [(ngModel)]="formData.email"
                      required
                      placeholder="rajesh@company.com"
                    />
                  </div>

                  <div class="form-group mb-3">
                    <label for="phone" class="form-label">Phone Number (WhatsApp)</label>
                    <input
                      type="tel"
                      id="phone"
                      class="form-control"
                      name="phone"
                      [(ngModel)]="formData.phone"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div class="form-group mb-4">
                    <label for="message" class="form-label">How can we help?</label>
                    <textarea
                      id="message"
                      class="form-control"
                      rows="4"
                      name="message"
                      [(ngModel)]="formData.message"
                      required
                      placeholder="Tell us about your estimated message volume or requirements..."
                    ></textarea>
                  </div>

                  <button type="submit" class="btn btn-primary w-100 py-2.5 fw-bold" [disabled]="!contactForm.valid">
                    Send Message
                  </button>
                </form>
              }
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
    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 3rem;
      align-items: start;
    }
    @media (max-width: 991.98px) {
      .contact-grid {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
      .page-title {
        font-size: 2.125rem;
      }
    }
    .contact-info-card {
      background: #0f1b3d;
      color: #ffffff;
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      box-shadow: 0 12px 32px rgba(15, 27, 61, 0.15);
    }
    .contact-info-card h3 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    .contact-info-card p {
      color: #94a3b8;
      font-size: 0.9375rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .info-items {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .info-icon {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.08);
      display: grid;
      place-items: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .info-item .label {
      display: block;
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
      margin-bottom: 0.15rem;
    }
    .info-item .value {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #ffffff;
    }
    .contact-form-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      box-shadow: 0 4px 16px rgba(15, 27, 61, 0.04);
    }
    .form-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f1b3d;
      margin-bottom: 1.5rem;
    }
    .form-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #172033;
      margin-bottom: 0.4rem;
    }
    .form-control {
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      padding: 0.65rem 0.85rem;
      font-size: 0.9375rem;
    }
    .form-control:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
  `],
})
export class ContactComponent implements OnInit {
  private readonly seo = inject(SeoService);

  formData = {
    name: '',
    email: '',
    phone: '',
    message: '',
  };

  submitted = false;

  ngOnInit(): void {
    this.seo.updateSeo({
      title: 'Contact Us | Seyyon Connect',
      description: 'Get in touch with the Seyyon Connect team for onboarding, inquiries, enterprise WhatsApp solutions, and technical support.',
    });
  }

  onSubmit(): void {
    this.submitted = true;
  }
}
