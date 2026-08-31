const assert = require("node:assert/strict");
const test = require("node:test");
const planService = require("../src/services/plan.service");
const {
  PLAN_NAMES,
  METRIC_KEYS,
  PLANS,
  WARNING_THRESHOLDS,
  calculateThresholdStatus,
} = require("../src/config/plans.config");
const {
  Company,
  Customer,
  Template,
  User,
  WhatsAppConnection,
} = require("../src/models");
const usageService = require("../src/services/usage.service");
const usageRepository = require("../src/repositories/usage.repository");
const customerService = require("../src/services/customer.service");
const campaignService = require("../src/services/campaign.service");
const templateService = require("../src/services/template.service");
const mediaService = require("../src/services/media.service");
const whatsappConnectionService = require("../src/services/whatsappConnection.service");
const customerRepository = require("../src/repositories/customer.repository");
const campaignRepository = require("../src/repositories/campaign.repository");
const templateRepository = require("../src/repositories/template.repository");
const whatsappRepository = require("../src/repositories/whatsapp.repository");
const metaTemplateService = require("../src/services/metaTemplate.service");
const storageService = require("../src/services/storage.service");
const AppError = require("../src/utils/appError");

function stub(object, name, value, cleanup) {
  const original = object[name];
  object[name] = value;
  cleanup.push(() => {
    object[name] = original;
  });
}

test("1. Four commercial plans exist with accurate, sensible limits", () => {
  const definitions = planService.getPlanDefinitions();
  assert.equal(definitions.length, 4);

  const starter = planService.getPlan(PLAN_NAMES.STARTER);
  assert.equal(starter.name, "STARTER");
  assert.equal(starter.limits[METRIC_KEYS.MONTHLY_MESSAGES], 5000);
  assert.equal(starter.limits[METRIC_KEYS.MONTHLY_CAMPAIGNS], 20);
  assert.equal(starter.limits[METRIC_KEYS.CUSTOMERS], 1000);
  assert.equal(starter.limits[METRIC_KEYS.TEMPLATES], 10);
  assert.equal(starter.limits[METRIC_KEYS.MEDIA_STORAGE_BYTES], 1 * 1024 * 1024 * 1024);
  assert.equal(starter.limits[METRIC_KEYS.MONTHLY_MEDIA_UPLOADS], 50);
  assert.equal(starter.limits[METRIC_KEYS.TEAM_MEMBERS], 2);
  assert.equal(starter.limits[METRIC_KEYS.WHATSAPP_CONNECTIONS], 1);

  const business = planService.getPlan(PLAN_NAMES.BUSINESS);
  assert.equal(business.name, "BUSINESS");
  assert.equal(business.limits[METRIC_KEYS.MONTHLY_MESSAGES], 25000);
  assert.equal(business.limits[METRIC_KEYS.CUSTOMERS], 10000);

  const professional = planService.getPlan(PLAN_NAMES.PROFESSIONAL);
  assert.equal(professional.name, "PROFESSIONAL");
  assert.equal(professional.limits[METRIC_KEYS.MONTHLY_MESSAGES], 100000);
  assert.equal(professional.limits[METRIC_KEYS.CUSTOMERS], 50000);

  const enterprise = planService.getPlan(PLAN_NAMES.ENTERPRISE);
  assert.equal(enterprise.name, "ENTERPRISE");
  assert.equal(enterprise.limits[METRIC_KEYS.MONTHLY_MESSAGES], null);
  assert.equal(enterprise.limits[METRIC_KEYS.CUSTOMERS], null);
});

test("2. Plan checkLimit accurately computes currentUsage, remaining, allowed and status", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  stub(
    usageService,
    "getCompanyUsageSummary",
    async () => ({
      saas: {
        messages: { sent: 3200 },
        campaigns: { created: 10 },
        media: { uploadedCount: 20 },
      },
    }),
    cleanup
  );

  // Starter message limit = 5000. Current usage = 3200. Remaining = 1800.
  const checkAllowed = await planService.checkLimit("company-1", METRIC_KEYS.MONTHLY_MESSAGES, 500);
  assert.equal(checkAllowed.allowed, true);
  assert.equal(checkAllowed.currentUsage, 3200);
  assert.equal(checkAllowed.limit, 5000);
  assert.equal(checkAllowed.remaining, 1800);
  assert.equal(checkAllowed.requested, 500);
  assert.equal(checkAllowed.status, WARNING_THRESHOLDS.NORMAL); // 3200/5000 = 64%

  // Request exceeding remaining (1900 > 1800)
  const checkExceeded = await planService.checkLimit("company-1", METRIC_KEYS.MONTHLY_MESSAGES, 1900);
  assert.equal(checkExceeded.allowed, false);
  assert.equal(checkExceeded.remaining, 1800);
});

test("3. Warning thresholds categorize usage percentages accurately", () => {
  assert.equal(calculateThresholdStatus(500, 1000), WARNING_THRESHOLDS.NORMAL); // 50%
  assert.equal(calculateThresholdStatus(799, 1000), WARNING_THRESHOLDS.NORMAL); // 79.9%
  assert.equal(calculateThresholdStatus(800, 1000), WARNING_THRESHOLDS.WARNING); // 80%
  assert.equal(calculateThresholdStatus(899, 1000), WARNING_THRESHOLDS.WARNING); // 89.9%
  assert.equal(calculateThresholdStatus(900, 1000), WARNING_THRESHOLDS.CRITICAL); // 90%
  assert.equal(calculateThresholdStatus(999, 1000), WARNING_THRESHOLDS.CRITICAL); // 99.9%
  assert.equal(calculateThresholdStatus(1000, 1000), WARNING_THRESHOLDS.EXHAUSTED); // 100%
  assert.equal(calculateThresholdStatus(1050, 1000), WARNING_THRESHOLDS.OVER_LIMIT); // 105%
  assert.equal(calculateThresholdStatus(500, null), WARNING_THRESHOLDS.NORMAL); // Unlimited
});

test("4. Enterprise custom limits override default base plan limits", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "MegaCorp",
      plan: "ENTERPRISE",
      customLimits: {
        [METRIC_KEYS.MONTHLY_MESSAGES]: 500000,
        [METRIC_KEYS.CUSTOMERS]: 250000,
      },
      status: "ACTIVE",
    }),
    cleanup
  );

  const planOverview = await planService.getCompanyPlan("company-ent");
  assert.equal(planOverview.planName, "ENTERPRISE");
  assert.equal(planOverview.limits[METRIC_KEYS.MONTHLY_MESSAGES], 500000);
  assert.equal(planOverview.limits[METRIC_KEYS.CUSTOMERS], 250000);
  assert.equal(planOverview.limits[METRIC_KEYS.MONTHLY_CAMPAIGNS], null); // Remains unlimited
});

test("5. Pre-send message limit check rejects campaigns that exceed remaining allowance", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  stub(
    usageService,
    "getCompanyUsageSummary",
    async () => ({
      saas: {
        messages: { sent: 4800 },
      },
    }),
    cleanup
  );

  stub(
    campaignRepository,
    "findById",
    async () => ({
      id: "camp-1",
      companyId: "company-1",
      name: "Promo Blast",
      status: "DRAFT",
      totalRecipients: 300, // 4800 + 300 = 5100 > 5000 limit
      template: { status: "APPROVED", metaTemplateName: "promo" },
    }),
    cleanup
  );

  stub(
    whatsappRepository,
    "findByCompanyId",
    async () => ({ status: "CONNECTED" }),
    cleanup
  );

  await assert.rejects(
    async () => {
      await campaignService.sendCampaign("company-1", "camp-1");
    },
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /reached your STARTER plan limit for WhatsApp Messages/);
      return true;
    }
  );
});

test("6. Campaign creation is blocked when monthly campaign limit is reached", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  stub(
    usageService,
    "getCompanyUsageSummary",
    async () => ({
      saas: {
        campaigns: { created: 20 }, // Starter limit = 20
      },
    }),
    cleanup
  );

  await assert.rejects(
    async () => {
      await campaignService.createCampaign("company-1", {
        name: "New Campaign",
        templateId: "tpl-1",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /reached your STARTER plan limit for Campaigns/);
      return true;
    }
  );
});

test("7. Customer creation is blocked when active customer limit is reached", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  stub(
    Customer,
    "count",
    async () => 1000, // Starter customer limit = 1000
    cleanup
  );

  await assert.rejects(
    async () => {
      await customerService.createCustomer("company-1", {
        firstName: "Jane",
        mobile: "9876543210",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /reached your STARTER plan limit for Contacts \/ Customers/);
      return true;
    }
  );
});

test("8. Bulk customer import validates aggregate quantity against remaining allowance", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  // 990 existing customers, remaining allowance is 10
  stub(Customer, "count", async () => 990, cleanup);

  // Mock excel buffer with 15 customers
  const XLSX = require("xlsx");
  const ws = XLSX.utils.json_to_sheet(
    Array.from({ length: 15 }, (_, i) => ({
      "First Name": `User${i}`,
      Mobile: `98765432${i.toString().padStart(2, "0")}`,
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  await assert.rejects(
    async () => {
      await customerService.importCustomers("company-1", buffer);
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /reached your STARTER plan limit for Contacts \/ Customers/);
      return true;
    }
  );
});

test("9. Template creation is blocked when template limit is reached", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  stub(
    Template,
    "count",
    async () => 10, // Starter template limit = 10
    cleanup
  );

  await assert.rejects(
    async () => {
      await templateService.createTemplate("company-1", {
        name: "new_promo_tpl",
        language: "en",
        category: "MARKETING",
        body: "Hello {{1}}",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /reached your STARTER plan limit for Templates/);
      return true;
    }
  );
});

test("10. Media upload is blocked when storage byte limit or upload count is exceeded", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  // 1 GB Starter storage limit. Current usage = 1,072,000,000 bytes. Upload = 4,000,000 bytes (total 1,076,000,000 > 1,073,741,824 limit)
  stub(
    usageRepository,
    "getActiveMediaStats",
    async () => ({ activeStorageBytes: 1072000000 }),
    cleanup
  );

  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const fakeFile = {
    originalname: "image.png",
    mimetype: "image/png",
    size: 4000000,
    buffer: Buffer.concat([pngHeader, Buffer.alloc(100)]),
  };

  await assert.rejects(
    async () => {
      await mediaService.upload("company-1", fakeFile);
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /reached your STARTER plan limit for Media Storage/);
      return true;
    }
  );
});

test("11. WhatsApp connection limit prevents adding extra connections beyond plan allowance", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  stub(
    whatsappRepository,
    "findByCompanyId",
    async () => null, // No existing connection record for this tenant
    cleanup
  );

  stub(
    WhatsAppConnection,
    "count",
    async () => 1, // Starter allows 1 active connection, already reached
    cleanup
  );

  await assert.rejects(
    async () => {
      await whatsappConnectionService.connect("company-1", {
        code: "auth_code",
        wabaId: "123456789",
        phoneNumberId: "987654321",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /reached your STARTER plan limit for WhatsApp Connections/);
      return true;
    }
  );
});

test("12. Over-limit downgrade behavior preserves data and blocks new usage", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  // Company downgraded to STARTER (limit 1000) while holding 5000 existing customers
  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "STARTER",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  stub(Customer, "count", async () => 5000, cleanup);

  const check = await planService.checkLimit("company-1", METRIC_KEYS.CUSTOMERS, 1);
  assert.equal(check.allowed, false);
  assert.equal(check.currentUsage, 5000);
  assert.equal(check.limit, 1000);
  assert.equal(check.remaining, 0);
  assert.equal(check.status, WARNING_THRESHOLDS.OVER_LIMIT);
});

test("13. Comprehensive plan overview provides all metric allowances and statuses", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(
    Company,
    "findByPk",
    async (id) => ({
      id,
      companyName: "Acme Corp",
      plan: "BUSINESS",
      customLimits: null,
      status: "ACTIVE",
    }),
    cleanup
  );

  stub(
    usageService,
    "getCompanyUsageSummary",
    async () => ({
      saas: {
        messages: { sent: 12500 },
        campaigns: { created: 40 },
        media: { uploadedCount: 50 },
      },
    }),
    cleanup
  );

  stub(Customer, "count", async () => 5000, cleanup);
  stub(Template, "count", async () => 20, cleanup);
  stub(User, "count", async () => 4, cleanup);
  stub(WhatsAppConnection, "count", async () => 1, cleanup);
  stub(usageRepository, "getActiveMediaStats", async () => ({ activeStorageBytes: 2147483648 }), cleanup);

  const overview = await planService.getCompanyPlanOverview("company-1");
  assert.equal(overview.plan.name, "BUSINESS");
  assert.equal(overview.plan.displayName, "Business");
  assert.equal(overview.metrics.length, 8);

  const msgMetric = overview.metrics.find((m) => m.metric === METRIC_KEYS.MONTHLY_MESSAGES);
  assert.equal(msgMetric.currentUsage, 12500);
  assert.equal(msgMetric.limit, 25000);
  assert.equal(msgMetric.remaining, 12500);
  assert.equal(msgMetric.percentage, 50);
  assert.equal(msgMetric.status, WARNING_THRESHOLDS.NORMAL);
});

test("14. SUPER_ADMIN can assign plans and custom limits while preserving existing data", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let updatedFields = null;
  const mockCompany = {
    id: "company-1",
    companyName: "Acme Corp",
    plan: "STARTER",
    customLimits: null,
    status: "ACTIVE",
    async update(fields) {
      updatedFields = fields;
      this.plan = fields.plan;
      this.customLimits = fields.customLimits;
    },
  };

  stub(Company, "findByPk", async () => mockCompany, cleanup);
  stub(usageService, "getCompanyUsageSummary", async () => ({ saas: { messages: {}, campaigns: {}, media: {} } }), cleanup);
  stub(Customer, "count", async () => 0, cleanup);
  stub(Template, "count", async () => 0, cleanup);
  stub(User, "count", async () => 0, cleanup);
  stub(WhatsAppConnection, "count", async () => 0, cleanup);
  stub(usageRepository, "getActiveMediaStats", async () => ({ activeStorageBytes: 0 }), cleanup);

  const result = await planService.assignCompanyPlan("company-1", "PROFESSIONAL", {
    [METRIC_KEYS.MONTHLY_MESSAGES]: 150000,
  });

  assert.equal(updatedFields.plan, "PROFESSIONAL");
  assert.equal(updatedFields.customLimits[METRIC_KEYS.MONTHLY_MESSAGES], 150000);
  assert.equal(result.plan.name, "PROFESSIONAL");
});
