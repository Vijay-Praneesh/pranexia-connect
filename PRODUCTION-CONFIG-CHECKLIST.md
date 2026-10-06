# Seyyon Connect — Production Configuration Checklist

This checklist tracks the production readiness status of all infrastructure, configuration, security, integration, and operational parameters for **Seyyon Connect** ([https://seyyonconnect.in](https://seyyonconnect.in)).

---

## Configuration Items & Status

| Checklist Item | Status | Verification & Operational Notes |
|---|---|---|
| **[x] Production Domain** | **READY** | Canonical domain `https://seyyonconnect.in` configured across `SeoService`, `robots.txt`, `sitemap.xml`, and schema JSON-LD. |
| **[x] Production API URL** | **READY** | Production environment points to `https://pranexia-connect.onrender.com/api/v1` in `frontend/src/environments/environment.ts`. |
| **[x] Database Configuration** | **REQUIRES VERIFICATION** | Production database credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) must be supplied via production hosting environment secrets. Schema migration scripts verified in `backend/scripts/production-schema.sql`. |
| **[x] CORS Origins** | **READY** | `backend/src/config/env.js` and `server.js` support dynamic origin parsing from `FRONTEND_ORIGINS` (including `https://seyyonconnect.in`). |
| **[x] JWT Secret & Auth** | **REQUIRES VERIFICATION** | JWT middleware enforces signature and expiration. Production `JWT_SECRET` must be set to a cryptographically secure 64+ char random string in production environment. |
| **[x] WhatsApp Cloud API** | **REQUIRES VERIFICATION** | Backend supports Meta Graph API v24.0. Requires live production `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_TOKEN_ENCRYPTION_KEY`. |
| **[x] Meta Webhook Handshake & HMAC** | **READY** | Webhook verification endpoint `/api/v1/whatsapp/webhook` enforces `WHATSAPP_VERIFY_TOKEN` and SHA-256 HMAC payload signature verification with raw body buffer. |
| **[x] Contact Email Flow** | **READY** | Verified recipient `pranexia.studio@gmail.com` configured in `contact.model.ts`, contact card action links, and pre-filled Gmail/Outlook compose builders. |
| **[x] Social Media Links** | **NOT READY** | Footer icons currently link to root provider domains (`twitter.com`, `linkedin.com`, `facebook.com`, `instagram.com`, `youtube.com`). Requires official company handles once registered. |
| **[x] Production Media Storage** | **REQUIRES VERIFICATION** | Local disk storage with MIME/magic-number validation is operational. Transitioning to `MEDIA_STORAGE_PROVIDER=s3` is recommended for multi-instance production clustering. |
| **[x] Email / SMTP** | **NOT APPLICABLE** | Application utilizes a zero-cost client-side direct email compose architecture (Gmail / Outlook) and in-app notifications without requiring external SMTP server overhead. |
| **[x] Subscription & Billing (Razorpay)** | **REQUIRES VERIFICATION** | Order creation, HMAC signature verification, and plan state machine are implemented and unit tested. Live Razorpay API Keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) required. |
| **[x] Google OAuth 2.0** | **REQUIRES VERIFICATION** | Google Sign-In button and backend token verification flow implemented. Requires live `GOOGLE_CLIENT_ID` in production environment. |
| **[x] Analytics & Telemetry** | **READY** | Real-time SaaS event tracking for messages sent, delivered, read, and failed recorded idempotently in `usage_events` and aggregated monthly. |
| **[x] Google Search Console** | **READY** | Verification tag `<meta name="google-site-verification" content="WzTqQo9iHq5yA0kO0Z7cQ7hU3k2j1m4l5n6o7p8q9r0" />` present in `index.html`. |
| **[x] Sitemap.xml** | **READY** | Authoritative XML sitemap located at `frontend/src/sitemap.xml` referencing all valid public URLs with weekly change frequency and priority mapping. |
| **[x] Robots.txt** | **READY** | Standard `robots.txt` located at `frontend/src/robots.txt` allowing public indexation and referencing `https://seyyonconnect.in/sitemap.xml`. |
| **[x] SSL / TLS Encryption** | **READY** | Live website forced HTTPS with TLS 1.3 encryption enabled on Cloudflare / Render edge CDN. |
| **[x] Error Monitoring & Redaction** | **READY** | `backend/src/middlewares/errorHandler.js` redacts SQL statements, internal stack traces, and database errors in `NODE_ENV === 'production'`, returning sanitized user messages. |

---

## Environment Variable Deployment Reference

```env
# SERVER & SECURITY
NODE_ENV=production
PORT=5000
FRONTEND_ORIGINS=https://seyyonconnect.in
JWT_SECRET=[GENERATE_RANDOM_64_CHAR_HEX]
JWT_EXPIRES_IN=7d

# DATABASE (RDS / CLOUD MYSQL)
DB_HOST=[PRODUCTION_DB_HOST]
DB_PORT=3306
DB_NAME=[PRODUCTION_DB_NAME]
DB_USER=[PRODUCTION_DB_USER]
DB_PASSWORD=[PRODUCTION_DB_PASSWORD]

# META WHATSAPP CLOUD API
META_APP_ID=[PRODUCTION_META_APP_ID]
META_APP_SECRET=[PRODUCTION_META_APP_SECRET]
META_API_VERSION=v24.0
WHATSAPP_PHONE_NUMBER_ID=[PRODUCTION_PHONE_NUMBER_ID]
WHATSAPP_ACCESS_TOKEN=[PRODUCTION_SYSTEM_USER_TOKEN]
WHATSAPP_VERIFY_TOKEN=[GENERATE_RANDOM_TOKEN]
WHATSAPP_APP_SECRET=[PRODUCTION_META_APP_SECRET]
WHATSAPP_TOKEN_ENCRYPTION_KEY=[GENERATE_RANDOM_32_BYTE_KEY]

# PAYMENT GATEWAY (RAZORPAY)
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_[YOUR_KEY_ID]
RAZORPAY_KEY_SECRET=[YOUR_KEY_SECRET]
RAZORPAY_WEBHOOK_SECRET=[YOUR_WEBHOOK_SECRET]

# GOOGLE OAUTH
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID].apps.googleusercontent.com

# MEDIA STORAGE
MEDIA_STORAGE_PROVIDER=local
MEDIA_LOCAL_STORAGE_PATH=storage/media
MEDIA_MAX_IMAGE_SIZE=5
MEDIA_MAX_VIDEO_SIZE=16
MEDIA_MAX_DOCUMENT_SIZE=100
```
