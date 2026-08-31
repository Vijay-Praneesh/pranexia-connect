const test = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");

const {
  PLAN_NAMES,
  PLAN_TIER_LEVELS,
  getPlanDirection,
  PLANS,
} = require("../src/config/plans.config");
const {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_ACTIONS,
  SUBSCRIPTION_SOURCES,
} = require("../src/config/subscriptions.config");
const {
  BILLING_INTERVALS,
  getPlanPrice,
} = require("../src/config/pricing.config");
const { Company, Subscription, SubscriptionHistory } = require("../src/models");
const planService = require("../src/services/plan.service");
const subscriptionService = require("../src/services/subscription.service");
const paymentService = require("../src/services/payment.service");
const subscriptionRepository = require("../src/repositories/subscription.repository");

test("Upgrade / Downgrade Module Tests", async (t) => {
  const testCompanyId = "11111111-2222-3333-4444-555555555555";
  const testCompanyIdB = "22222222-3333-4444-5555-666666666666";

  // 1. Plan hierarchy & direction calculations
  await t.test("1. Plan hierarchy defines canonical tiers and resolves direction", () => {
    assert.strictEqual(PLAN_TIER_LEVELS[PLAN_NAMES.STARTER], 1);
    assert.strictEqual(PLAN_TIER_LEVELS[PLAN_NAMES.BUSINESS], 2);
    assert.strictEqual(PLAN_TIER_LEVELS[PLAN_NAMES.PROFESSIONAL], 3);
    assert.strictEqual(PLAN_TIER_LEVELS[PLAN_NAMES.ENTERPRISE], 4);

    assert.strictEqual(getPlanDirection("STARTER", "BUSINESS"), "UPGRADE");
    assert.strictEqual(getPlanDirection("STARTER", "PROFESSIONAL"), "UPGRADE");
    assert.strictEqual(getPlanDirection("BUSINESS", "PROFESSIONAL"), "UPGRADE");
    assert.strictEqual(getPlanDirection("PROFESSIONAL", "BUSINESS"), "DOWNGRADE");
    assert.strictEqual(getPlanDirection("BUSINESS", "STARTER"), "DOWNGRADE");
    assert.strictEqual(getPlanDirection("STARTER", "STARTER"), "SAME");
    assert.strictEqual(getPlanDirection("BUSINESS", "BUSINESS"), "SAME");
  });

  // 2. Authoritative Plan Change Preview for Upgrade
  await t.test("2. Upgrade preview provides authoritative price, immediate activation, and payment required", async () => {
    // Mock getCompanyPlan and subscription
    const origGetCompanyPlan = planService.getCompanyPlan;
    const origEnsureSub = subscriptionService.ensureCompanySubscription;
    const origGetUsage = planService.getCurrentUsage;

    planService.getCompanyPlan = async () => ({
      companyId: testCompanyId,
      planName: "STARTER",
      displayName: "Starter",
      limits: PLANS.STARTER.limits,
    });

    subscriptionService.ensureCompanySubscription = async () => ({
      id: "sub-test",
      companyId: testCompanyId,
      plan: "STARTER",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-09-30T23:59:59.000Z"),
    });

    planService.getCurrentUsage = async () => 0;

    try {
      const preview = await planService.previewPlanChange(testCompanyId, "BUSINESS", "MONTHLY");

      assert.strictEqual(preview.currentPlan, "STARTER");
      assert.strictEqual(preview.targetPlan, "BUSINESS");
      assert.strictEqual(preview.direction, "UPGRADE");
      assert.strictEqual(preview.paymentRequired, true);
      assert.strictEqual(preview.isPurchasable, true);
      assert.strictEqual(preview.price.amount, 249900); // ₹2,499 in paise
      assert.strictEqual(preview.price.displayAmount, 2499);
      assert.strictEqual(preview.hasOverLimitMetrics, false);
      assert.ok(preview.metricsComparison.length >= 8);
    } finally {
      planService.getCompanyPlan = origGetCompanyPlan;
      subscriptionService.ensureCompanySubscription = origEnsureSub;
      planService.getCurrentUsage = origGetUsage;
    }
  });

  // 3. Authoritative Plan Change Preview for Downgrade with Over-Limit metrics
  await t.test("3. Downgrade preview calculates over-limit impact without deleting data", async () => {
    const origGetCompanyPlan = planService.getCompanyPlan;
    const origEnsureSub = subscriptionService.ensureCompanySubscription;
    const origGetUsage = planService.getCurrentUsage;

    planService.getCompanyPlan = async () => ({
      companyId: testCompanyId,
      planName: "PROFESSIONAL",
      displayName: "Professional",
      limits: PLANS.PROFESSIONAL.limits,
    });

    subscriptionService.ensureCompanySubscription = async () => ({
      id: "sub-test",
      companyId: testCompanyId,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-09-30T23:59:59.000Z"),
    });

    // Simulate company having 15,000 customers (BUSINESS limit is 10,000)
    planService.getCurrentUsage = async (cId, metric) => {
      if (metric === "CUSTOMERS") return 15000;
      if (metric === "MONTHLY_MESSAGES") return 20000;
      return 0;
    };

    try {
      const preview = await planService.previewPlanChange(testCompanyId, "BUSINESS", "MONTHLY");

      assert.strictEqual(preview.currentPlan, "PROFESSIONAL");
      assert.strictEqual(preview.targetPlan, "BUSINESS");
      assert.strictEqual(preview.direction, "DOWNGRADE");
      assert.strictEqual(preview.paymentRequired, false);
      assert.strictEqual(preview.hasOverLimitMetrics, true);

      const customerOver = preview.overLimitMetrics.find((m) => m.metric === "CUSTOMERS");
      assert.ok(customerOver);
      assert.strictEqual(customerOver.currentUsage, 15000);
      assert.strictEqual(customerOver.targetLimit, 10000);
      assert.strictEqual(customerOver.overBy, 5000);
      assert.ok(customerOver.impact.includes("Existing data remains safe"));
    } finally {
      planService.getCompanyPlan = origGetCompanyPlan;
      subscriptionService.ensureCompanySubscription = origEnsureSub;
      planService.getCurrentUsageForMetric = origGetUsage;
    }
  });

  // 4. Downgrade scheduling stores pendingPlan and pendingPlanEffectiveAt
  await t.test("4. Schedule downgrade sets pendingPlan and does not change plan immediately", async () => {
    let mockSub = {
      id: "sub-101",
      companyId: testCompanyId,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-09-30T23:59:59.000Z"),
      pendingPlan: null,
      pendingBillingInterval: null,
      pendingPlanEffectiveAt: null,
    };

    const origGetSub = subscriptionService.getCurrentSubscription;
    const origUpdate = subscriptionRepository.updateSubscription;
    const origRecord = subscriptionRepository.recordHistory;

    subscriptionService.getCurrentSubscription = async () => mockSub;
    subscriptionRepository.updateSubscription = async (sub, updateData) => {
      Object.assign(mockSub, updateData);
      return mockSub;
    };
    subscriptionRepository.recordHistory = async (hist) => hist;

    try {
      const scheduled = await subscriptionService.scheduleDowngrade(testCompanyId, "BUSINESS", {
        billingInterval: "MONTHLY",
        performedBy: "user-1",
      });

      assert.strictEqual(scheduled.plan, "PROFESSIONAL"); // Plan stays current
      assert.strictEqual(scheduled.pendingPlan, "BUSINESS");
      assert.strictEqual(scheduled.pendingBillingInterval, "MONTHLY");
      assert.deepStrictEqual(scheduled.pendingPlanEffectiveAt, mockSub.currentPeriodEnd);
    } finally {
      subscriptionService.getCurrentSubscription = origGetSub;
      subscriptionRepository.updateSubscription = origUpdate;
      subscriptionRepository.recordHistory = origRecord;
    }
  });

  // 5. Cancel pending downgrade
  await t.test("5. Cancel pending downgrade clears pendingPlan and pendingPlanEffectiveAt", async () => {
    let mockSub = {
      id: "sub-101",
      companyId: testCompanyId,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-09-30T23:59:59.000Z"),
      pendingPlan: "BUSINESS",
      pendingBillingInterval: "MONTHLY",
      pendingPlanEffectiveAt: new Date("2026-09-30T23:59:59.000Z"),
    };

    const origGetSub = subscriptionService.getCurrentSubscription;
    const origUpdate = subscriptionRepository.updateSubscription;
    const origRecord = subscriptionRepository.recordHistory;

    subscriptionService.getCurrentSubscription = async () => mockSub;
    subscriptionRepository.updateSubscription = async (sub, updateData) => {
      Object.assign(mockSub, updateData);
      return mockSub;
    };
    subscriptionRepository.recordHistory = async (hist) => hist;

    try {
      const cancelled = await subscriptionService.cancelPendingDowngrade(testCompanyId, {
        performedBy: "user-1",
      });

      assert.strictEqual(cancelled.plan, "PROFESSIONAL");
      assert.strictEqual(cancelled.pendingPlan, null);
      assert.strictEqual(cancelled.pendingBillingInterval, null);
      assert.strictEqual(cancelled.pendingPlanEffectiveAt, null);
    } finally {
      subscriptionService.getCurrentSubscription = origGetSub;
      subscriptionRepository.updateSubscription = origUpdate;
      subscriptionRepository.recordHistory = origRecord;
    }
  });

  // 6. Scheduler automatically applies pending downgrade at effective date
  await t.test("6. Scheduler applies pending downgrade when effective date has passed", async () => {
    let mockSub = {
      id: "sub-101",
      companyId: testCompanyId,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-08-31T00:00:00.000Z"),
      pendingPlan: "BUSINESS",
      pendingBillingInterval: "MONTHLY",
      pendingPlanEffectiveAt: new Date("2026-08-31T00:00:00.000Z"),
    };

    const origFindPending = subscriptionRepository.findSubscriptionsWithPendingPlanChange;
    const origChangePlan = subscriptionService.changePlan;

    let appliedPlan = null;
    subscriptionRepository.findSubscriptionsWithPendingPlanChange = async () => [mockSub];
    subscriptionService.changePlan = async (cId, plan, opts) => {
      appliedPlan = plan;
      return { ...mockSub, plan };
    };

    try {
      const results = await subscriptionService.processScheduledLifecycleChecks(new Date());
      assert.strictEqual(results.appliedPendingPlanChanges, 1);
      assert.strictEqual(appliedPlan, "BUSINESS");
    } finally {
      subscriptionRepository.findSubscriptionsWithPendingPlanChange = origFindPending;
      subscriptionService.changePlan = origChangePlan;
    }
  });

  // 7. Verified upgrade payment activates target plan immediately
  await t.test("7. Verified upgrade payment immediately switches plan and clears pending downgrade", async () => {
    let mockSub = {
      id: "sub-101",
      companyId: testCompanyId,
      plan: "STARTER",
      status: "ACTIVE",
      pendingPlan: "STARTER", // some previous pending state
    };
    let mockCompany = {
      id: testCompanyId,
      plan: "STARTER",
      update: async (data) => Object.assign(mockCompany, data),
    };

    const origEnsure = subscriptionService.ensureCompanySubscription;
    const origFindCompany = Company.findByPk;
    const origUpdate = subscriptionRepository.updateSubscription;
    const origRecord = subscriptionRepository.recordHistory;

    subscriptionService.ensureCompanySubscription = async () => mockSub;
    Company.findByPk = async () => mockCompany;
    subscriptionRepository.updateSubscription = async (sub, updateData) => {
      Object.assign(mockSub, updateData);
      return mockSub;
    };
    subscriptionRepository.recordHistory = async (hist) => hist;

    try {
      const upgraded = await subscriptionService.changePlan(testCompanyId, "PROFESSIONAL", {
        source: SUBSCRIPTION_SOURCES.PAYMENT,
        reason: "Paid upgrade verified",
      });

      assert.strictEqual(upgraded.plan, "PROFESSIONAL");
      assert.strictEqual(mockCompany.plan, "PROFESSIONAL");
      assert.strictEqual(upgraded.pendingPlan, null);
    } finally {
      subscriptionService.ensureCompanySubscription = origEnsure;
      Company.findByPk = origFindCompany;
      subscriptionRepository.updateSubscription = origUpdate;
      subscriptionRepository.recordHistory = origRecord;
    }
  });

  // 8. Same plan change is rejected as redundant
  await t.test("8. Same-plan downgrade attempt throws validation error", async () => {
    const origGetSub = subscriptionService.getCurrentSubscription;
    subscriptionService.getCurrentSubscription = async () => ({
      id: "sub-101",
      companyId: testCompanyId,
      plan: "BUSINESS",
      status: "ACTIVE",
    });

    try {
      await assert.rejects(
        async () => {
          await subscriptionService.scheduleDowngrade(testCompanyId, "BUSINESS");
        },
        {
          message: "You are already on this plan",
        }
      );
    } finally {
      subscriptionService.getCurrentSubscription = origGetSub;
    }
  });

  // 9. Upgrades through downgrade endpoint are rejected
  await t.test("9. Attempting to schedule an upgrade via downgrade endpoint is rejected", async () => {
    const origGetSub = subscriptionService.getCurrentSubscription;
    subscriptionService.getCurrentSubscription = async () => ({
      id: "sub-101",
      companyId: testCompanyId,
      plan: "STARTER",
      status: "ACTIVE",
    });

    try {
      await assert.rejects(
        async () => {
          await subscriptionService.scheduleDowngrade(testCompanyId, "PROFESSIONAL");
        },
        {
          message: "Upgrades take effect immediately upon payment. Please use the upgrade flow.",
        }
      );
    } finally {
      subscriptionService.getCurrentSubscription = origGetSub;
    }
  });
});
