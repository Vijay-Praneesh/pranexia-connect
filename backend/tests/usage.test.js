const assert = require("node:assert/strict");
const test = require("node:test");
const usageService = require("../src/services/usage.service");
const metaUsageService = require("../src/services/metaUsage.service");
const usageRepository = require("../src/repositories/usage.repository");
const metaUsageRepository = require("../src/repositories/metaUsage.repository");
const whatsappRepository = require("../src/repositories/whatsapp.repository");
const usageController = require("../src/controllers/usage.controller");
const { getPeriodBounds, getCurrentPeriod, formatPeriod } = require("../src/utils/usagePeriod.util");
const AppError = require("../src/utils/appError");

function stub(object, name, value, cleanup) {
  const original = object[name];
  object[name] = value;
  cleanup.push(() => {
    object[name] = original;
  });
}

test("1. Period calculation utilities produce consistent UTC monthly boundaries", () => {
  const bounds = getPeriodBounds("2026-08");
  assert.equal(bounds.period, "2026-08");
  assert.equal(bounds.periodStart.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(bounds.periodEnd.toISOString(), "2026-08-31T23:59:59.999Z");

  const current = getCurrentPeriod();
  assert.match(current, /^\d{4}-\d{2}$/);
});

test("2. Company usage summary retrieves accurate SaaS metrics and active media stats", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    usageRepository,
    "findByCompanyAndPeriod",
    async (companyId, period) => {
      assert.equal(companyId, "company-a");
      assert.equal(period, "2026-08");
      return {
        messagesSent: 150,
        messagesDelivered: 140,
        messagesRead: 100,
        messagesFailed: 5,
        campaignsCreated: 4,
        campaignsCompleted: 3,
        mediaUploadedCount: 6,
        mediaUploadedBytes: 12000000,
        templatesUsed: 2,
      };
    },
    cleanup
  );

  stub(
    usageRepository,
    "getActiveMediaStats",
    async (companyId) => {
      assert.equal(companyId, "company-a");
      return { activeFileCount: 5, activeStorageBytes: 10000000 };
    },
    cleanup
  );

  stub(
    metaUsageRepository,
    "findByCompanyAndPeriod",
    async (companyId, period) => {
      assert.equal(companyId, "company-a");
      return {
        status: "SYNCED",
        wabaId: "waba-123",
        syncedAt: new Date("2026-08-15T12:00:00Z"),
        currency: null,
        amount: null,
        marketingConversations: 120,
        utilityConversations: 20,
        authenticationConversations: 0,
        serviceConversations: 5,
        totalConversations: 145,
      };
    },
    cleanup
  );

  const summary = await usageService.getCompanyUsageSummary("company-a", "2026-08");

  assert.equal(summary.period.period, "2026-08");
  assert.equal(summary.saas.messages.sent, 150);
  assert.equal(summary.saas.messages.delivered, 140);
  assert.equal(summary.saas.messages.read, 100);
  assert.equal(summary.saas.messages.failed, 5);
  assert.equal(summary.saas.campaigns.created, 4);
  assert.equal(summary.saas.campaigns.completed, 3);
  assert.equal(summary.saas.media.uploadedCount, 6);
  assert.equal(summary.saas.media.activeFileCount, 5);
  assert.equal(summary.saas.media.activeStorageBytes, 10000000);
  assert.equal(summary.saas.templates.used, 2);
  assert.equal(summary.meta.status, "SYNCED");
  assert.equal(summary.meta.costAvailable, false);
  assert.equal(summary.meta.amount, null);
  assert.equal(summary.meta.totalConversations, 145);
});

test("3. Tenant isolation: Company A usage is strictly isolated from Company B", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const dbStore = {
    "company-a": { messagesSent: 50, campaignsCreated: 2 },
    "company-b": { messagesSent: 200, campaignsCreated: 10 },
  };

  stub(
    usageRepository,
    "findByCompanyAndPeriod",
    async (companyId) => {
      const data = dbStore[companyId] || { messagesSent: 0, campaignsCreated: 0 };
      return {
        messagesSent: data.messagesSent,
        messagesDelivered: 0,
        messagesRead: 0,
        messagesFailed: 0,
        campaignsCreated: data.campaignsCreated,
        campaignsCompleted: 0,
        mediaUploadedCount: 0,
        mediaUploadedBytes: 0,
        templatesUsed: 0,
      };
    },
    cleanup
  );
  stub(usageRepository, "getActiveMediaStats", async () => ({ activeFileCount: 0, activeStorageBytes: 0 }), cleanup);
  stub(metaUsageRepository, "findByCompanyAndPeriod", async () => null, cleanup);

  const summaryA = await usageService.getCompanyUsageSummary("company-a", "2026-08");
  const summaryB = await usageService.getCompanyUsageSummary("company-b", "2026-08");

  assert.equal(summaryA.saas.messages.sent, 50);
  assert.equal(summaryB.saas.messages.sent, 200);
  assert.notEqual(summaryA.saas.messages.sent, summaryB.saas.messages.sent);
});

test("4. Message usage increment is recorded when Meta accepts a message", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let incremented = null;
  stub(
    usageRepository,
    "recordIdempotentEvent",
    async (companyId, event) => {
      assert.equal(companyId, "company-a");
      assert.equal(event.eventType, "MESSAGE_SENT");
      assert.equal(event.eventKey, "msg_sent:rec-101:wamid-meta-1");
      return { isNew: true };
    },
    cleanup
  );

  stub(
    usageRepository,
    "incrementUsageMetrics",
    async (companyId, period, increments) => {
      incremented = { companyId, period, increments };
    },
    cleanup
  );

  const result = await usageService.recordMessageSent("company-a", {
    campaignRecipientId: "rec-101",
    metaMessageId: "wamid-meta-1",
    campaignId: "camp-1",
    templateId: "tpl-1",
  });

  assert.equal(result.recorded, true);
  assert.equal(incremented.companyId, "company-a");
  assert.equal(incremented.increments.messagesSent, 1);
});

test("5. Idempotency: duplicate message send event does not increment message usage twice", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let incrementCount = 0;
  stub(
    usageRepository,
    "recordIdempotentEvent",
    async () => ({ isNew: false }), // duplicate!
    cleanup
  );

  stub(
    usageRepository,
    "incrementUsageMetrics",
    async () => {
      incrementCount += 1;
    },
    cleanup
  );

  const result = await usageService.recordMessageSent("company-a", {
    campaignRecipientId: "rec-101",
    metaMessageId: "wamid-meta-1",
    campaignId: "camp-1",
    templateId: "tpl-1",
  });

  assert.equal(result.recorded, false);
  assert.equal(incrementCount, 0);
});

test("6. Webhook status progression (sent -> delivered -> read) updates status counters without triple-counting sent messages", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const statusEvents = [];
  const statusIncrements = [];

  stub(
    usageRepository,
    "recordIdempotentEvent",
    async (companyId, event) => {
      statusEvents.push(event.eventKey);
      return { isNew: true };
    },
    cleanup
  );

  stub(
    usageRepository,
    "incrementUsageMetrics",
    async (companyId, period, increments) => {
      statusIncrements.push(increments);
    },
    cleanup
  );

  // Delivered webhook event
  await usageService.recordMessageStatus("company-a", {
    campaignRecipientId: "rec-101",
    metaMessageId: "wamid-meta-1",
    status: "DELIVERED",
  });

  // Read webhook event
  await usageService.recordMessageStatus("company-a", {
    campaignRecipientId: "rec-101",
    metaMessageId: "wamid-meta-1",
    status: "READ",
  });

  assert.equal(statusEvents.length, 2);
  assert.equal(statusEvents[0], "msg_status:DELIVERED:rec-101");
  assert.equal(statusEvents[1], "msg_status:READ:rec-101");

  assert.equal(statusIncrements.length, 2);
  assert.deepEqual(statusIncrements[0], { messagesDelivered: 1 });
  assert.deepEqual(statusIncrements[1], { messagesRead: 1 });
  // None of these incremented messagesSent
  assert.equal(statusIncrements.some((inc) => inc.messagesSent), false);
});

test("7. Failed message webhook event records failed counter idempotently", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let failureIncrement = null;
  stub(
    usageRepository,
    "recordIdempotentEvent",
    async (companyId, event) => {
      assert.equal(event.eventType, "MESSAGE_FAILED");
      assert.equal(event.eventKey, "msg_status:FAILED:rec-failed");
      return { isNew: true };
    },
    cleanup
  );

  stub(
    usageRepository,
    "incrementUsageMetrics",
    async (companyId, period, increments) => {
      failureIncrement = increments;
    },
    cleanup
  );

  await usageService.recordMessageStatus("company-a", {
    campaignRecipientId: "rec-failed",
    metaMessageId: "wamid-failed-1",
    status: "FAILED",
  });

  assert.deepEqual(failureIncrement, { messagesFailed: 1 });
});

test("8. Campaign created and completed usage events are recorded accurately", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const increments = [];
  stub(
    usageRepository,
    "recordIdempotentEvent",
    async () => ({ isNew: true }),
    cleanup
  );

  stub(
    usageRepository,
    "incrementUsageMetrics",
    async (_companyId, _period, inc) => {
      increments.push(inc);
    },
    cleanup
  );

  await usageService.recordCampaignCreated("company-a", "campaign-100");
  await usageService.recordCampaignCompleted("company-a", "campaign-100");

  assert.equal(increments.length, 2);
  assert.deepEqual(increments[0], { campaignsCreated: 1 });
  assert.deepEqual(increments[1], { campaignsCompleted: 1 });
});

test("9. Media upload records upload count and byte size accurately", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let mediaInc = null;
  stub(
    usageRepository,
    "recordIdempotentEvent",
    async (companyId, event) => {
      assert.equal(event.eventType, "MEDIA_UPLOADED");
      assert.equal(event.eventKey, "media_up:media-99");
      return { isNew: true };
    },
    cleanup
  );

  stub(
    usageRepository,
    "incrementUsageMetrics",
    async (_companyId, _period, inc) => {
      mediaInc = inc;
    },
    cleanup
  );

  await usageService.recordMediaUpload("company-a", {
    mediaId: "media-99",
    size: 2048576,
  });

  assert.deepEqual(mediaInc, {
    mediaUploadedCount: 1,
    mediaUploadedBytes: 2048576,
  });
});

test("10. Template usage in campaign increments templatesUsed", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let templateInc = null;
  stub(
    usageRepository,
    "recordIdempotentEvent",
    async (companyId, event) => {
      assert.equal(event.eventType, "TEMPLATE_USED");
      assert.equal(event.eventKey, "tpl_used:camp-1:tpl-50");
      return { isNew: true };
    },
    cleanup
  );

  stub(
    usageRepository,
    "incrementUsageMetrics",
    async (_companyId, _period, inc) => {
      templateInc = inc;
    },
    cleanup
  );

  await usageService.recordTemplateUsed("company-a", {
    campaignId: "camp-1",
    templateId: "tpl-50",
  });

  assert.deepEqual(templateInc, { templatesUsed: 1 });
});

test("11. Usage history returns chronological list of tenant monthly summaries", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    usageRepository,
    "findHistoryByCompany",
    async (companyId) => {
      assert.equal(companyId, "company-a");
      return [
        {
          period: "2026-08",
          periodStart: new Date("2026-08-01"),
          periodEnd: new Date("2026-08-31"),
          messagesSent: 200,
          messagesDelivered: 190,
          messagesRead: 150,
          messagesFailed: 5,
          campaignsCreated: 5,
          campaignsCompleted: 5,
          mediaUploadedCount: 2,
          mediaUploadedBytes: 500000,
          templatesUsed: 2,
        },
        {
          period: "2026-07",
          periodStart: new Date("2026-07-01"),
          periodEnd: new Date("2026-07-31"),
          messagesSent: 100,
          messagesDelivered: 95,
          messagesRead: 80,
          messagesFailed: 2,
          campaignsCreated: 2,
          campaignsCompleted: 2,
          mediaUploadedCount: 1,
          mediaUploadedBytes: 250000,
          templatesUsed: 1,
        },
      ];
    },
    cleanup
  );

  stub(
    metaUsageRepository,
    "findHistoryByCompany",
    async () => [],
    cleanup
  );

  const history = await usageService.getCompanyUsageHistory("company-a", 6);

  assert.equal(history.length, 2);
  assert.equal(history[0].period, "2026-08");
  assert.equal(history[0].messages.sent, 200);
  assert.equal(history[1].period, "2026-07");
  assert.equal(history[1].messages.sent, 100);
});

test("12. Meta usage sync handles disconnected tenant gracefully without inventing fake pricing", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(whatsappRepository, "findByCompanyId", async () => null, cleanup);

  let upserted = null;
  stub(
    metaUsageRepository,
    "upsert",
    async (companyId, wabaId, data) => {
      upserted = { companyId, wabaId, data };
      return { syncedAt: new Date(), ...data };
    },
    cleanup
  );

  const result = await metaUsageService.syncCompanyMetaUsage("company-a", "2026-08");

  assert.equal(result.status, "UNAVAILABLE");
  assert.match(result.message, /WhatsApp Business connection is not active/);
  assert.equal(upserted.data.status, "UNAVAILABLE");
  assert.equal(upserted.data.amount, undefined);
});

test("13. No fake Meta cost when authoritative data is unavailable", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    usageRepository,
    "findByCompanyAndPeriod",
    async () => ({ messagesSent: 5000, messagesDelivered: 4900 }),
    cleanup
  );
  stub(usageRepository, "getActiveMediaStats", async () => ({ activeFileCount: 0, activeStorageBytes: 0 }), cleanup);
  stub(
    metaUsageRepository,
    "findByCompanyAndPeriod",
    async () => ({
      status: "UNAVAILABLE",
      amount: null,
      currency: null,
      totalConversations: 0,
    }),
    cleanup
  );

  const summary = await usageService.getCompanyUsageSummary("company-a", "2026-08");

  assert.equal(summary.meta.costAvailable, false);
  assert.equal(summary.meta.amount, null);
  assert.equal(summary.meta.currency, null);
  // Must NOT multiply 5000 messages by any invented price
  assert.equal(typeof summary.meta.amount === "number", false);
});

test("14. SUPER_ADMIN platform aggregate usage aggregates metrics across all tenants", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    usageRepository,
    "getPlatformAggregateUsage",
    async (period) => {
      assert.equal(period, "2026-08");
      return {
        period: "2026-08",
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        currentPeriod: {
          messagesSent: 10000,
          messagesDelivered: 9500,
          messagesRead: 8000,
          messagesFailed: 150,
          campaignsCreated: 50,
          campaignsCompleted: 45,
          mediaUploadedCount: 120,
          mediaUploadedBytes: 500000000,
          templatesUsed: 30,
        },
        allTime: {
          totalCompanies: 25,
          totalCampaigns: 200,
          totalRecipients: 45000,
          activeWhatsAppConnections: 20,
          activeMediaFiles: 180,
          activeMediaStorageBytes: 800000000,
          messagesSent: 40000,
          messagesDelivered: 38000,
          messagesRead: 32000,
          messagesFailed: 600,
        },
      };
    },
    cleanup
  );

  stub(
    metaUsageRepository,
    "getPlatformAggregate",
    async () => ({
      totalConversations: 8500,
      syncedCompaniesCount: 15,
    }),
    cleanup
  );

  const aggregate = await usageService.getOwnerAggregateUsage("2026-08");

  assert.equal(aggregate.currentPeriod.messagesSent, 10000);
  assert.equal(aggregate.allTime.totalCompanies, 25);
  assert.equal(aggregate.allTime.activeWhatsAppConnections, 20);
  assert.equal(aggregate.metaAggregate.totalConversations, 8500);
});

test("15. Usage controller uses req.user.companyId and rejects unauthorized cross-tenant requests", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let requestedCompanyId = null;
  stub(
    usageService,
    "getCompanyUsageSummary",
    async (companyId) => {
      requestedCompanyId = companyId;
      return { saas: { messages: { sent: 10 } } };
    },
    cleanup
  );

  const req = {
    user: { id: "user-1", companyId: "authenticated-company-a", role: "COMPANY_ADMIN" },
    query: { companyId: "hacked-company-b", period: "2026-08" }, // spoof attempt
  };

  let responseBody = null;
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await usageController.getSummary(req, res, () => {});

  // Verifies req.user.companyId was used and query.companyId was completely ignored!
  assert.equal(requestedCompanyId, "authenticated-company-a");
  assert.equal(responseBody.success, true);
  assert.equal(responseBody.data.saas.messages.sent, 10);
});
