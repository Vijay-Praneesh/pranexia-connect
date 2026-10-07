# Seyyon Connect — WhatsApp Business API Integration Status

## 1. Executive Summary & Status Overview

WhatsApp Business Cloud API integration is actively implemented for **Seyyon Connect** using a secure, multi-tenant SaaS architecture.

```
+-----------------------------------------------------------------------------------+
| GREEN   | Completed Locally   | Architecture, multi-tenant service layer,        |
|         |                     | test message API, template sync, campaign worker, |
|         |                     | automated test suite (151 backend / 277 frontend).|
+-----------------------------------------------------------------------------------+
| YELLOW  | Prepared / Pending  | Public HTTPS webhook listener, Meta Live          |
|         | Domain & Hosting    | Embedded Signup production configuration, live    |
|         |                     | production phone number & WABA verification.      |
+-----------------------------------------------------------------------------------+
| RED     | Blocked             | None (Local development & testing unblocked).     |
+-----------------------------------------------------------------------------------+
```

> **Domain is NOT required for the completed local WhatsApp development work.**

---

## 2. Meta Developer App & WhatsApp Cloud API Setup Guide

This guide details the exact steps to configure the Meta WhatsApp Cloud API test sandbox for local development and prepare for production onboarding.

### Step 1: Meta Developer Account
1. Navigate to [developers.facebook.com](https://developers.facebook.com/) and register or log in with your Meta account.
2. Complete developer verification and 2-Factor Authentication (2FA).

### Step 2: Meta App Creation
1. Go to **My Apps** -> **Create App**.
2. Select **Other** as the use case -> Click **Next**.
3. Select **Business** as the App Type -> Click **Next**.
4. Set App Display Name (e.g., `Seyyon Connect`) and associate your Meta Business Portfolio.

### Step 3: Add WhatsApp Product
1. In the App Dashboard, locate **WhatsApp** in the product list and click **Set up**.
2. This creates a test **WhatsApp Business Account (WABA)** and a **Test Phone Number** automatically.

### Step 4: Test Phone Number & Test Recipient Setup
1. In **WhatsApp** -> **API Setup**:
   - Locate the **From Phone Number ID** (e.g., `1000...`).
   - Locate the **WhatsApp Business Account ID (WABA ID)** (e.g., `1000...`).
   - Copy the 24-hour **Temporary Access Token** or generate a System User permanent token.
2. In the **To** field on the API Setup page, add your personal phone number (including country code, e.g., `+91...` or `+1...`).
3. Verify the recipient number using the OTP received on WhatsApp.

### Step 5: Required Meta Permissions & System User Tokens
For production and long-lived automated messaging, create a **System User** in Meta Business Manager:
- Permissions required:
  - `whatsapp_business_messaging`: Send/receive WhatsApp messages and status notifications.
  - `whatsapp_business_management`: Manage WABA, phone numbers, and message templates.
  - `business_management`: Read business portfolio metadata and assets.

### Step 6: App Credentials Summary
- **Meta App ID**: Located in App Settings -> Basic.
- **Meta App Secret**: Located in App Settings -> Basic -> App Secret (Backend only).
- **WABA ID**: Located in WhatsApp -> API Setup.
- **Phone Number ID**: Located in WhatsApp -> API Setup.
- **Verify Token**: Random secret string shared between backend `.env` and Meta Webhooks dashboard.

---

## 3. Architecture & Data Flow

### Multi-Tenant Architecture
```
Angular 17 Client
       ↓  (Bearer JWT: req.user.companyId)
Seyyon Connect API (Express.js)
       ↓  (Tenant Authorization & Plan Validation)
WhatsApp Connection Service
       ↓  (AES-256-GCM Decryption of Tenant Token)
Meta WhatsApp Service Layer
       ↓  (HTTPS REST Request)
Meta Graph API (graph.facebook.com/v20.0)
       ↓
Recipient WhatsApp Device
```

### Security Guarantees
- **Tenant Isolation**: Every WhatsApp connection is keyed to a `company_id`. Decryption of tokens occurs strictly within backend memory per authenticated tenant.
- **Zero Frontend Secrets**: Meta App Secret, raw Access Tokens, and Encryption Keys are strictly server-side and never sent to Angular.
- **Safe Response Normalization**: API responses sanitize credentials, returning only safe metadata (`phoneNumberId`, `displayPhoneNumber`, `verifiedName`, `status`, `connectedAt`).
- **Timing-Safe Webhook Signatures**: Incoming webhook payloads are verified using HMAC-SHA256 with `crypto.timingSafeEqual`.

---

## 4. Environment Variables Specification

Configure the following variables in `backend/.env`. Never commit real credentials to source control.

| Variable Name | Purpose | Scope | Required In Production |
| :--- | :--- | :--- | :--- |
| `WHATSAPP_API_VERSION` | Meta Graph API Version (e.g., `v20.0`) | Backend | Yes |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token string | Backend | Yes |
| `WHATSAPP_APP_SECRET` | Meta App Secret for webhook HMAC validation | Backend | Yes |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | 32-byte secret for AES-256-GCM token encryption | Backend | Yes |
| `META_APP_ID` | Meta Application ID | Backend / Frontend | Yes |
| `META_APP_SECRET` | Meta App Secret for OAuth code exchange | Backend only | Yes |
| `META_API_VERSION` | Fallback Graph API version | Backend | No |
| `WHATSAPP_PHONE_NUMBER_ID` | Default/Test Phone Number ID | Backend | Optional (Test/Default) |
| `WHATSAPP_ACCESS_TOKEN` | Default/Test Access Token | Backend | Optional (Test/Default) |

---

## 5. Implementation Status

### Completed Now (GREEN)
- [x] Multi-tenant `WhatsAppConnection` database schema with AES-256-GCM token encryption.
- [x] `MetaWhatsAppService` with standardized error handling (OAuth token expiration, invalid recipients, missing templates, rate limiting).
- [x] Direct message sending (`sendTemplateMessage`, `sendTextMessage`).
- [x] Test Message API endpoint (`POST /api/v1/whatsapp/test-message`) for tenant connection validation.
- [x] Template Synchronization (`metaTemplate.service.js` and `template.service.js`) with consecutive variable indexing validation.
- [x] Campaign Worker integration (`campaign.worker.js`) with batch claiming, variable mapping, media attachment, and usage recording.
- [x] Webhook verification and event handler (`webhook.service.js`) supporting idempotent delivery status tracking (`SENT` -> `DELIVERED` -> `READ` / `FAILED`).
- [x] 15 WhatsApp Cloud API automated unit and integration tests covering all error modes and success pathways.
- [x] Full test suite verification (151 backend tests passing, 277 frontend tests passing, production build complete).

### Pending — Domain / HTTPS Required (YELLOW)
- [ ] **Public Webhook Verification**: Meta Webhook Dashboard verification requires a publicly accessible HTTPS endpoint (e.g., `https://api.yourdomain.com/api/v1/webhook/whatsapp`).
- [ ] **Live Webhook Delivery**: Receiving real-time delivery status notifications from Meta servers over the public internet.
- [ ] **Production Meta Embedded Signup**: Live popup OAuth flow requires verified Meta Business Manager and registered production domains.
- [ ] **Production WhatsApp Number**: Transitioning from Meta test phone number to a dedicated verified business phone number.
- [ ] **Production End-to-End Delivery**: Sending commercial messages to real customers outside the test recipient whitelist.
