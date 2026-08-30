const assert = require("node:assert/strict");
const crypto = require("crypto");
const test = require("node:test");

const webhookController = require("../src/controllers/webhook.controller");
const webhookService = require("../src/services/webhook.service");
const whatsappRepository = require("../src/repositories/whatsapp.repository");
const campaignRecipientRepository = require("../src/repositories/campaignRecipient.repository");
const campaignRepository = require("../src/repositories/campaign.repository");

function mockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createSignature(payloadString, secret) {
  return `sha256=${crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(payloadString))
    .digest("hex")}`;
}

function stub(object, name, value, cleanup) {
  const original = object[name];
  object[name] = value;
  cleanup.push(() => {
    object[name] = original;
  });
}

// =============================================================================
// 1. Webhook Verification Tests (GET)
// =============================================================================
test("webhook verification succeeds with valid mode and verify_token", async (t) => {
  const previousToken = process.env.WHATSAPP_VERIFY_TOKEN;
  t.after(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = previousToken;
  });
  process.env.WHATSAPP_VERIFY_TOKEN = "correct-verify-token";

  const req = {
    query: {
      "hub.mode": "subscribe",
      "hub.verify_token": "correct-verify-token",
      "hub.challenge": "challenge_code_98765",
    },
  };
  const res = mockResponse();

  await webhookController.verifyWebhook(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, "challenge_code_98765");
});

test("webhook verification rejects invalid mode", async (t) => {
  const previousToken = process.env.WHATSAPP_VERIFY_TOKEN;
  t.after(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = previousToken;
  });
  process.env.WHATSAPP_VERIFY_TOKEN = "correct-verify-token";

  const req = {
    query: {
      "hub.mode": "unsubscribe",
      "hub.verify_token": "correct-verify-token",
      "hub.challenge": "challenge_code_98765",
    },
  };
  const res = mockResponse();

  await webhookController.verifyWebhook(req, res);

  assert.equal(res.statusCode, 403);
});

test("webhook verification rejects incorrect verify_token", async (t) => {
  const previousToken = process.env.WHATSAPP_VERIFY_TOKEN;
  t.after(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = previousToken;
  });
  process.env.WHATSAPP_VERIFY_TOKEN = "correct-verify-token";

  const req = {
    query: {
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
      "hub.challenge": "challenge_code_98765",
    },
  };
  const res = mockResponse();

  await webhookController.verifyWebhook(req, res);

  assert.equal(res.statusCode, 403);
});

// =============================================================================
// 2. Webhook Signature Validation Tests (POST)
// =============================================================================
test("webhook rejects requests with missing or invalid HMAC signature", async (t) => {
  const previousSecret = process.env.WHATSAPP_APP_SECRET;
  t.after(() => {
    process.env.WHATSAPP_APP_SECRET = previousSecret;
  });
  process.env.WHATSAPP_APP_SECRET = "app-secret-123";

  const body = { entry: [] };
  const rawBody = Buffer.from(JSON.stringify(body));

  // Missing header
  const res1 = mockResponse();
  await webhookController.receiveWebhook(
    { get: () => undefined, rawBody, body },
    res1
  );
  assert.equal(res1.statusCode, 401);

  // Invalid signature
  const res2 = mockResponse();
  await webhookController.receiveWebhook(
    { get: () => "sha256=invalidhex", rawBody, body },
    res2
  );
  assert.equal(res2.statusCode, 401);

  // Missing rawBody
  const res3 = mockResponse();
  await webhookController.receiveWebhook(
    {
      get: () => createSignature(JSON.stringify(body), "app-secret-123"),
      rawBody: null,
      body,
    },
    res3
  );
  assert.equal(res3.statusCode, 401);
});

test("webhook accepts valid HMAC signature and processes payload", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));

  const previousSecret = process.env.WHATSAPP_APP_SECRET;
  cleanup.push(() => {
    process.env.WHATSAPP_APP_SECRET = previousSecret;
  });
  process.env.WHATSAPP_APP_SECRET = "app-secret-123";

  let processedPayload = null;
  stub(
    webhookService,
    "processWebhook",
    async (payload) => {
      processedPayload = payload;
    },
    cleanup
  );

  const payload = {
    object: "whatsapp_business_account",
    entry: [{ id: "waba-1", changes: [] }],
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = createSignature(JSON.stringify(payload), "app-secret-123");

  const req = {
    get: (header) =>
      header.toLowerCase() === "x-hub-signature-256" ? signature : undefined,
    rawBody,
    body: payload,
  };
  const res = mockResponse();

  await webhookController.receiveWebhook(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(processedPayload, payload);
});

// =============================================================================
// 3. Tenant Resolution & Tenant Isolation Tests
// =============================================================================
test("webhook resolves tenant using phone_number_id and isolates cross-tenant recipients", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));

  const connections = {
    "phone-tenant-a": { companyId: "company-a", wabaId: "waba-a" },
    "phone-tenant-b": { companyId: "company-b", wabaId: "waba-b" },
  };

  stub(
    whatsappRepository,
    "findByPhoneNumberId",
    async (phoneId) => connections[phoneId] || null,
    cleanup
  );
  stub(
    whatsappRepository,
    "findByWabaId",
    async (wabaId) =>
      Object.values(connections).find((c) => c.wabaId === wabaId) || null,
    cleanup
  );

  const updatedRecipients = [];
  stub(
    campaignRecipientRepository,
    "findByWhatsappMessageIdAndCompany",
    async (messageId, companyId) => {
      // Recipient wamid-1 belongs to company-a only
      if (messageId === "wamid-1" && companyId === "company-a") {
        return {
          id: "rec-1",
          companyId: "company-a",
          campaignId: "camp-1",
          status: "SENT",
          sentAt: new Date("2026-08-30T10:00:00Z"),
          deliveredAt: null,
          readAt: null,
        };
      }
      return null;
    },
    cleanup
  );

  stub(
    campaignRecipientRepository,
    "update",
    async (id, companyId, data) => {
      updatedRecipients.push({ id, companyId, data });
      return [1];
    },
    cleanup
  );

  stub(campaignRepository, "syncCounters", async () => ({}), cleanup);

  // Payload for Tenant B claiming to update message wamid-1 (which belongs to Tenant A)
  const maliciousCrossTenantPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-b",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-tenant-b" },
              statuses: [
                {
                  id: "wamid-1",
                  status: "delivered",
                  timestamp: "1788080000",
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await webhookService.processWebhook(maliciousCrossTenantPayload);

  // Cross tenant lookup fails -> zero updates made
  assert.equal(updatedRecipients.length, 0);

  // Valid payload for Tenant A
  const validTenantPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-a",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-tenant-a" },
              statuses: [
                {
                  id: "wamid-1",
                  status: "delivered",
                  timestamp: "1788080000",
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await webhookService.processWebhook(validTenantPayload);

  assert.equal(updatedRecipients.length, 1);
  assert.equal(updatedRecipients[0].id, "rec-1");
  assert.equal(updatedRecipients[0].companyId, "company-a");
  assert.equal(updatedRecipients[0].data.status, "DELIVERED");
});

test("webhook ignores events for unmapped phone_number_id safely without throwing", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));

  stub(whatsappRepository, "findByPhoneNumberId", async () => null, cleanup);
  stub(whatsappRepository, "findByWabaId", async () => null, cleanup);

  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-unknown",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-unknown" },
              statuses: [{ id: "wamid-x", status: "sent" }],
            },
          },
        ],
      },
    ],
  };

  // Must not throw
  await webhookService.processWebhook(payload);
});

// =============================================================================
// 4. Status Progression & Idempotency Tests
// =============================================================================
test("status progression updates recipient accurately and preserves timestamps", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));

  stub(
    whatsappRepository,
    "findByPhoneNumberId",
    async () => ({ companyId: "company-a" }),
    cleanup
  );

  let recipient = {
    id: "rec-10",
    companyId: "company-a",
    campaignId: "camp-10",
    status: "QUEUED",
    sentAt: null,
    deliveredAt: null,
    readAt: null,
  };

  stub(
    campaignRecipientRepository,
    "findByWhatsappMessageIdAndCompany",
    async () => recipient,
    cleanup
  );

  const updates = [];
  stub(
    campaignRecipientRepository,
    "update",
    async (id, companyId, data) => {
      updates.push(data);
      recipient = { ...recipient, ...data };
      return [1];
    },
    cleanup
  );

  let syncCount = 0;
  stub(
    campaignRepository,
    "syncCounters",
    async () => {
      syncCount++;
    },
    cleanup
  );

  // 1. Sent event
  await webhookService.processWebhook({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-a" },
              statuses: [
                {
                  id: "wamid-10",
                  status: "sent",
                  timestamp: "1725000100",
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(recipient.status, "SENT");
  assert.equal(recipient.sentAt.getTime(), 1725000100000);

  // 2. Delivered event
  await webhookService.processWebhook({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-a" },
              statuses: [
                {
                  id: "wamid-10",
                  status: "delivered",
                  timestamp: "1725000200",
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(recipient.status, "DELIVERED");
  assert.equal(recipient.sentAt.getTime(), 1725000100000);
  assert.equal(recipient.deliveredAt.getTime(), 1725000200000);

  // 3. Read event
  await webhookService.processWebhook({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-a" },
              statuses: [
                {
                  id: "wamid-10",
                  status: "read",
                  timestamp: "1725000300",
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(recipient.status, "READ");
  assert.equal(recipient.readAt.getTime(), 1725000300000);

  // 4. Duplicate / Out-of-Order "sent" event arriving after "read"
  const countBefore = updates.length;
  await webhookService.processWebhook({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-a" },
              statuses: [
                {
                  id: "wamid-10",
                  status: "sent",
                  timestamp: "1725000100",
                },
              ],
            },
          },
        ],
      },
    ],
  });

  // Must NOT regress status or overwrite timestamps
  assert.equal(recipient.status, "READ");
  assert.equal(recipient.readAt.getTime(), 1725000300000);
  assert.equal(updates.length, countBefore);
});

test("failed status persists Meta error code, title, and details", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));

  stub(
    whatsappRepository,
    "findByPhoneNumberId",
    async () => ({ companyId: "company-a" }),
    cleanup
  );

  let recipient = {
    id: "rec-fail",
    companyId: "company-a",
    campaignId: "camp-fail",
    status: "SENT",
    failureReason: null,
  };

  stub(
    campaignRecipientRepository,
    "findByWhatsappMessageIdAndCompany",
    async () => recipient,
    cleanup
  );

  let updatedData = null;
  stub(
    campaignRecipientRepository,
    "update",
    async (_id, _comp, data) => {
      updatedData = data;
      recipient = { ...recipient, ...data };
      return [1];
    },
    cleanup
  );

  stub(campaignRepository, "syncCounters", async () => ({}), cleanup);

  await webhookService.processWebhook({
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-a" },
              statuses: [
                {
                  id: "wamid-fail",
                  status: "failed",
                  timestamp: "1725000500",
                  errors: [
                    {
                      code: 131026,
                      title: "Message undeliverable",
                      error_data: { details: "Recipient phone is not on WhatsApp" },
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(updatedData.status, "FAILED");
  assert.match(updatedData.failureReason, /131026/);
  assert.match(updatedData.failureReason, /Message undeliverable/);
  assert.match(updatedData.failureReason, /Recipient phone is not on WhatsApp/);
});

// =============================================================================
// 5. Campaign Lifecycle & Security Tests
// =============================================================================
test("syncCounters transitions RUNNING campaign to COMPLETED when all recipients are processed", async (t) => {
  const { Campaign, CampaignRecipient } = require("../src/models");
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));

  stub(CampaignRecipient, "count", async (options) => {
    // totalRecipients
    if (!options?.where?.status) return 5;
    // sentCount
    const op = Object.getOwnPropertySymbols(options.where.status)[0];
    if (op && options.where.status[op]?.includes?.("SENT")) return 4;
    // deliveredCount
    if (op && options.where.status[op]?.includes?.("DELIVERED")) return 3;
    // readCount
    if (options.where.status === "READ") return 2;
    // failedCount
    if (options.where.status === "FAILED") return 1;
    // pendingCount (none remaining)
    if (op && options.where.status[op]?.includes?.("PENDING")) return 0;
    return 0;
  }, cleanup);

  let updatedValues = null;
  stub(Campaign, "findByPk", async () => ({
    id: "camp-lifecycle",
    status: "RUNNING",
  }), cleanup);

  stub(Campaign, "update", async (values) => {
    updatedValues = values;
    return [1];
  }, cleanup);

  const synced = await campaignRepository.syncCounters("camp-lifecycle");

  assert.equal(updatedValues.totalRecipients, 5);
  assert.equal(updatedValues.sentCount, 4);
  assert.equal(updatedValues.deliveredCount, 3);
  assert.equal(updatedValues.readCount, 2);
  assert.equal(updatedValues.failedCount, 1);
  assert.equal(updatedValues.progress, 100);
  assert.equal(updatedValues.status, "COMPLETED");
  assert.ok(updatedValues.completedAt instanceof Date);
});

test("syncCounters transitions RUNNING campaign to FAILED when all recipients fail", async (t) => {
  const { Campaign, CampaignRecipient } = require("../src/models");
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));

  stub(CampaignRecipient, "count", async (options) => {
    if (!options?.where?.status) return 3;
    const op = Object.getOwnPropertySymbols(options.where.status)[0];
    if (op && options.where.status[op]?.includes?.("SENT")) return 0;
    if (op && options.where.status[op]?.includes?.("DELIVERED")) return 0;
    if (options.where.status === "READ") return 0;
    if (options.where.status === "FAILED") return 3;
    if (op && options.where.status[op]?.includes?.("PENDING")) return 0;
    return 0;
  }, cleanup);

  let updatedValues = null;
  stub(Campaign, "findByPk", async () => ({
    id: "camp-all-fail",
    status: "RUNNING",
  }), cleanup);

  stub(Campaign, "update", async (values) => {
    updatedValues = values;
    return [1];
  }, cleanup);

  await campaignRepository.syncCounters("camp-all-fail");

  assert.equal(updatedValues.totalRecipients, 3);
  assert.equal(updatedValues.failedCount, 3);
  assert.equal(updatedValues.status, "FAILED");
  assert.equal(updatedValues.progress, 100);
});

test("webhook ignores injected companyId in payload body and resolves tenant from connection only", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));

  let queriedPhoneId = null;
  stub(whatsappRepository, "findByPhoneNumberId", async (phoneId) => {
    queriedPhoneId = phoneId;
    return { companyId: "trusted-company-id" };
  }, cleanup);

  let recipientLookupCompany = null;
  stub(campaignRecipientRepository, "findByWhatsappMessageIdAndCompany", async (_msgId, compId) => {
    recipientLookupCompany = compId;
    return null;
  }, cleanup);

  const maliciousPayload = {
    companyId: "attacker-company-id",
    company_id: "attacker-company-id",
    entry: [
      {
        id: "waba-1",
        companyId: "attacker-company-id",
        changes: [
          {
            field: "messages",
            value: {
              companyId: "attacker-company-id",
              metadata: { phone_number_id: "trusted-phone-id" },
              statuses: [{ id: "wamid-test", status: "sent" }],
            },
          },
        ],
      },
    ],
  };

  await webhookService.processWebhook(maliciousPayload);

  assert.equal(queriedPhoneId, "trusted-phone-id");
  assert.equal(recipientLookupCompany, "trusted-company-id");
  assert.notEqual(recipientLookupCompany, "attacker-company-id");
});
