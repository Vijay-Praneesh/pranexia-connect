# Seyyon Connect Production Data Audit

**Audited Application:** Seyyon Connect  
**Live Website:** [https://seyyonconnect.in](https://seyyonconnect.in)  
**Local Codebase:** `C:\Users\VIJAY PRANEESH\Pranexia-Connect`  
**Audit Scope:** Frontend, Backend, Database Models, API Services, Public Website, Client Dashboard, Owner Dashboard, Authentication, Subscriptions, WhatsApp Cloud API, Reports, Campaigns, Templates, Media, Usage, Security, Tenant Isolation, Error Handling, and Production Bundles.

---

## 1. Verified Production Data

All production-facing modules in Seyyon Connect utilize authentic, verified data architectures rather than static mock fallbacks.

| Module | Data Source | Verification Details |
|---|---|---|
| **Public Website Copy** | Verified Static Content & Metadata | All public pages (`/`, `/about`, `/products`, `/pricing`, `/blogs`, `/contact`, `/404`) use authoritative copy with zero lorem ipsum or fabricated client numbers. |
| **SEO & Structured Data** | `SeoService` & Schema.org JSON-LD | Canonical URLs point to `https://seyyonconnect.in`, Organization schemas reference verified identity, and OpenGraph/Twitter cards reference verified image assets (`assets/meta-tag.png`). |
| **Commercial Pricing** | `backend/src/config/pricing.config.js` & `plans.config.js` | All 4 plans (STARTER: ₹999/mo, ₹9,990/yr; BUSINESS: ₹2,499/mo, ₹24,990/yr; PROFESSIONAL: ₹5,999/mo, ₹59,990/yr; ENTERPRISE: Custom) match 100% across public pricing, subscription matrix, and backend payment engine. |
| **Blog Articles** | `assets/data/blogs.json` | 3 verified educational articles covering WhatsApp campaigns, CRM unification, and message telemetry authored by the Seyyon Connect Team. Zero placeholder text or broken links. |
| **Contact Flow** | `ContactComponent` & `contact.model.ts` | Direct compose integration for Gmail and Outlook targeting the verified contact address: `pranexia.studio@gmail.com`. |
| **Company & User CRM** | MySQL `companies` & `users` tables | Real database-backed records loaded via JWT-authenticated session with strict role enforcement (`SUPER_ADMIN` / `COMPANY_ADMIN`). |
| **Campaign Dispatches** | MySQL `campaigns` & `campaign_recipients` tables | State-driven workflow (`DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `PAUSED`, `FAILED`, `CANCELLED`) with asynchronous queue dispatching. |
| **Template Management** | Meta Cloud API Sync & MySQL `templates` | Multi-category template synchronization with WhatsApp approval status mapping, dynamic variable injection, and column-safe sorting (`created_at`). |
| **Usage Tracking** | MySQL `usage_summaries` & `usage_events` | Authoritative monthly aggregations for messages sent, delivered, read, failed, active storage bytes, and cumulative uploads. |
| **Tenant Subscriptions** | MySQL `subscriptions` & `subscription_history` | Authoritative 30-day/365-day period clamping, plan quotas, threshold warnings (80%, 90%, 100%), and automatic downgrade scheduling. |

---

## 2. Development Data

The following configurations and files are classified as **Development-Only** and are strictly separated from production execution:

* **Frontend Development Environment (`frontend/src/environments/environment.development.ts`):**
  * `apiBaseUrl`: `http://localhost:5000/api/v1`
  * `production`: `false`
* **Local Backend Environment File (`backend/.env`):**
  * Contains local development database parameters (`DB_HOST=localhost`, `PORT=5000`) and local debugging credentials.
  * Correctly ignored by source control via root `.gitignore`.
* **Sample Excel Template Generator (`backend/src/services/customer.service.js`):**
  * Provides a single exemplary row (`John Doe`, `9876543210`, `john@example.com`, `Sample Customer`) strictly inside the client-side template download endpoint for Excel bulk customer imports.

---

## 3. Test Data

Test data is strictly confined to automated unit and integration test suites (`frontend/src/**/*.spec.ts` and `backend/tests/*.test.js`). None of these fixtures leak into production runtime bundles.

* **Frontend Test Suites (254 Tests Passing):**
  * Isolated Jasmine/Karma specs with mock providers, spied services, and transient test user fixtures (`asha@example.com`, `acme@example.com`).
* **Backend Test Suites (136 Tests Passing):**
  * Native Node.js test runner suites validating tenant isolation, Google OAuth onboarding, Razorpay webhook signature verification, plan quota enforcement, usage event tracking, and error redaction.

---

## 4. Mock / Demo Data

* **Runtime Mock Elimination:**
  * Zero mock services, dummy data constants, or fake statistic fallbacks exist in production components.
  * If an API endpoint fails, frontend components (`DashboardComponent`, `UsageComponent`, `SubscriptionComponent`, `CompaniesComponent`) transition cleanly to dedicated `LoadingStateComponent`, `ErrorStateComponent`, or genuine `EmptyStateComponent` rather than displaying synthetic numbers.
* **Payment Provider Sandbox:**
  * `backend/src/services/payment/providers/razorpay.provider.js` contains safe cryptographic sandbox fallback helpers used only when live payment credentials are unset during non-production testing.

---

## 5. Placeholder Data

* **HTML Form Input Placeholders:**
  * Clean UI hint placeholders exist only in HTML inputs (e.g., `placeholder="e.g. surya@example.com"` on customer creation modal; `placeholder="e.g. Welcome Offer Broadcast"` on campaign modal).
* **Social Media Links:**
  * Footer social media icons (`public-footer.component.html`) currently point to root channel domains (`https://twitter.com`, `https://linkedin.com`, `https://facebook.com`, `https://instagram.com`, `https://youtube.com`).
  * Classification: **PLACEHOLDER** — Requires dedicated company social handles once created by brand management.

---

## 6. Production Configuration Required

The following live production environment variables must be configured on hosting infrastructure (e.g., Render / Cloudflare / Meta Developer Portal):

1. **Meta Embedded Signup & WhatsApp Cloud API:**
   * `META_APP_ID`: Production Meta Developer App ID
   * `META_APP_SECRET`: Production Meta Developer App Secret
   * `META_CONFIG_ID`: Embedded Signup configuration ID
   * `WHATSAPP_PHONE_NUMBER_ID`: Live verified WABA Phone Number ID
   * `WHATSAPP_ACCESS_TOKEN`: Permanent System User Access Token
   * `WHATSAPP_APP_SECRET`: Live Meta App Secret for webhook HMAC verification
   * `WHATSAPP_VERIFY_TOKEN`: Live webhook handshake verification token
   * `WHATSAPP_TOKEN_ENCRYPTION_KEY`: 32-byte AES key for encrypted tenant token storage
2. **Google OAuth 2.0 Identity Services:**
   * `GOOGLE_CLIENT_ID`: Production Google Cloud OAuth 2.0 Web Client ID
3. **Razorpay Payment Gateway (Production Mode):**
   * `RAZORPAY_KEY_ID`: Live Razorpay Key ID (`rzp_live_...`)
   * `RAZORPAY_KEY_SECRET`: Live Razorpay Key Secret
   * `RAZORPAY_WEBHOOK_SECRET`: Live Razorpay Webhook Secret for `payment.captured`
4. **Cloud Object Storage (for Multi-Instance Scale):**
   * `MEDIA_STORAGE_PROVIDER`: `s3` (when transitioning off single-disk local storage)
   * `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`

---

## 7. API Data Source Map

| Dashboard / UI Metric | Frontend Component | Angular Service | API Endpoint | Backend Controller / Service | Database Source |
|---|---|---|---|---|---|
| **Owner: Total Companies** | `OwnerDashboardComponent` | `OwnerDashboardService` | `GET /api/v1/dashboard/owner-summary` | `OwnerDashboardController` -> `OwnerDashboardService` -> `OwnerDashboardRepository` | `SELECT count(*) FROM companies` |
| **Owner: Plan Breakdown** | `OwnerDashboardComponent` | `OwnerDashboardService` | `GET /api/v1/dashboard/owner-summary` | `OwnerDashboardRepository.getPlanStatistics` | `SELECT plan, count(id) FROM companies GROUP BY plan` |
| **Owner: Active Users** | `OwnerDashboardComponent` | `OwnerDashboardService` | `GET /api/v1/dashboard/owner-summary` | `OwnerDashboardRepository.getUserStatistics` | `SELECT count(*) FROM users WHERE role != 'SUPER_ADMIN'` |
| **Owner: Platform Usage** | `OwnerDashboardComponent` | `OwnerDashboardService` | `GET /api/v1/dashboard/owner-summary` | `UsageRepository.getPlatformAggregateUsage` | `SUM(messages_sent), SUM(media_uploaded_bytes) FROM usage_summaries` |
| **Client: KPI Summary** | `DashboardComponent` | `DashboardService` | `GET /api/v1/dashboard/summary` | `DashboardController` -> `DashboardService` -> `DashboardRepository` | Scoped aggregates on `campaigns` & `campaign_recipients` where `company_id = req.user.companyId` |
| **Client: Recent Campaigns** | `DashboardComponent` | `CampaignService` | `GET /api/v1/campaigns?page=1&limit=5` | `CampaignController` -> `CampaignService` -> `CampaignRepository` | `SELECT * FROM campaigns WHERE company_id = ? ORDER BY created_at DESC LIMIT 5` |
| **Client: Customer Stats** | `DashboardComponent` | `CustomerService` | `GET /api/v1/customers/stats` | `CustomerController` -> `CustomerService` -> `CustomerRepository` | `SELECT count(*), status FROM customers WHERE company_id = ? GROUP BY status` |
| **Client: Quota & Usage** | `UsageComponent` | `UsageService` | `GET /api/v1/usage/summary` | `UsageController` -> `UsageService` -> `UsageRepository` | `SELECT * FROM usage_summaries WHERE company_id = ? AND period = ?` |
| **Client: Subscription** | `SubscriptionComponent` | `SubscriptionService` | `GET /api/v1/subscriptions/current` | `SubscriptionController` -> `SubscriptionService` -> `SubscriptionRepository` | `SELECT * FROM subscriptions WHERE company_id = ? AND status IN ('ACTIVE','TRIALING','PAST_DUE')` |

---

## 8. Security Findings

| File | Variable / Area | Classification | Risk Level | Mitigation & Status |
|---|---|---|---|---|
| `backend/.env` | `JWT_SECRET`, `DB_PASSWORD`, `WHATSAPP_ACCESS_TOKEN` | Local Secrets | Low (Local Dev) | File is strictly gitignored (`.gitignore`) and omitted from build artifacts. Production hosting must supply variables via environment secrets. |
| `frontend/src/environments/environment.ts` | `googleClientId`, `metaAppId`, `metaConfigId` | Public Client IDs | Minimal / Safe | Only public OAuth client IDs and API versions are declared. Zero backend secrets, API private keys, or passwords exist in frontend code. |
| `backend/src/middlewares/auth.middleware.js` | JWT Bearer Authentication | Token Handling | Fully Secured | Validates HMAC signature, checks expiration, and queries active database status. |
| `backend/src/middlewares/errorHandler.js` | Global Error Handler | Data Exposure | Fully Secured | In `NODE_ENV === 'production'`, database queries, internal stack traces, and filesystem paths are redacted; safe user messages are returned. |

---

## 9. WhatsApp Status

* **Status:** **REQUIRES PRODUCTION META CONFIGURATION**
* **Embedded Signup:** The frontend `WhatsAppSettingsComponent` gracefully checks for `environment.metaAppId` and `environment.metaConfigId`. When unset, it displays `"Meta Embedded Signup is not configured for this environment"` and prevents unauthorized operations without faking a connected state.
* **Webhook Security:** Webhook endpoint `/api/v1/whatsapp/webhook` enforces cryptographic HMAC-SHA256 verification using `WHATSAPP_APP_SECRET` on raw incoming payloads.
* **Tenant Isolation:** Webhook events resolve tenant mapping solely through authenticated `phone_number_id` registered in `whatsapp_connections`, preventing cross-tenant message status injection.

---

## 10. Subscription / Billing Status

* **Status:** **READY FOR PRODUCTION CREDENTIALS**
* **Plans Matrix:** Fully synchronized across frontend UI, client subscription management, and backend plans config (`STARTER`, `BUSINESS`, `PROFESSIONAL`, `ENTERPRISE`).
* **Payment Flow:** Implemented via server-side Razorpay order creation (`RazorpayProvider`) with HMAC-SHA256 signature verification on payment capture and webhook delivery.
* **Limit Enforcement:** `PlanService` enforces limits on messages, campaigns, active customers, templates, media bytes, uploads, team members, and WhatsApp numbers prior to resource allocation.

---

## 11. Contact / Email Status

* **Status:** **READY**
* **Configured Recipient:** `pranexia.studio@gmail.com` (declared in `frontend/src/app/features/public/contact/contact.model.ts`).
* **Flows:**
  * Free, client-side email dispatch flow generating pre-filled Gmail (`https://mail.google.com/mail/?view=cm&fs=1&to=...`) and Outlook (`https://outlook.live.com/mail/0/deeplink/compose?to=...`) drafts.
  * Direct `mailto:pranexia.studio@gmail.com` link on footer, contact cards, and enterprise subscription inquiries.
  * Honeypot bot protection field (`website`) silently halts automated scrapers.

---

## 12. Tenant Isolation Status

* **Status:** **PASS**
* **Verification Results:**
  * Every tenant repository (`CustomerRepository`, `CampaignRepository`, `CampaignRecipientRepository`, `TemplateRepository`, `MediaRepository`, `SubscriptionRepository`, `UsageRepository`, `PaymentRepository`) strictly filters queries by `companyId`.
  * Controllers inject `companyId` exclusively from `req.user.companyId` (extracted from the cryptographically verified JWT) and never trust tenant IDs from client query params or request bodies.
  * Cross-tenant access tests verify that Company A cannot view, modify, delete, or dispatch campaigns, contacts, templates, media, or subscription data belonging to Company B.
  * `SUPER_ADMIN` functionality is gated behind `authorize("SUPER_ADMIN")` middleware and strictly isolated from `COMPANY_ADMIN` access.

---

## 13. Production Blockers

1. **Meta WhatsApp Cloud API Production Credentials:**
   * Meta Embedded Signup App ID, Config ID, and System User Access Tokens must be added to production environment settings to enable live WhatsApp broadcast dispatches.
2. **Razorpay Live Gateway Credentials:**
   * Live Key ID (`rzp_live_...`) and Key Secret must be configured on Render backend environment variables to accept real customer payments.
3. **Google OAuth Client ID:**
   * Production Google Cloud Web Client ID must be added to frontend and backend environments to activate 1-click Google sign-in.

---

## 14. Recommended Actions

1. **Deploy Production Environment Variables:** Populate live secrets in Render dashboard (`DB_*`, `JWT_SECRET`, `WHATSAPP_*`, `META_*`, `RAZORPAY_*`, `GOOGLE_CLIENT_ID`).
2. **Configure Social Media Handles:** Update placeholder social media URLs in `public-footer.component.html` once official business accounts on LinkedIn, X/Twitter, Instagram, and YouTube are created.
3. **Verify S3 Media Storage:** For multi-instance scaling, switch `MEDIA_STORAGE_PROVIDER` from `local` to an AWS S3 or Cloudflare R2 bucket.
4. **Schedule Automated Subscriptions Cron:** Verify that the Node.js background scheduler (`node-cron`) is running to process trial expirations and scheduled plan downgrades daily.
