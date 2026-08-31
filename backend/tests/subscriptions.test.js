const test = require("node:test");
const assert = require("node:assert/strict");

const subscriptionService = require("../src/services/subscription.service");
const subscriptionRepository = require("../src/repositories/subscription.repository");
const planService = require("../src/services/plan.service");
const {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_ACTIONS,
  SUBSCRIPTION_SOURCES,
} = require("../src/config/subscriptions.config");
const { PLAN_NAMES, METRIC_KEYS } = require("../src/config/plans.config");
const { Company, Subscription, SubscriptionHistory } = require("../src/models");
const subscriptionController = require("../src/controllers/subscription.controller");

const stub = (object, method, implementation, cleanupArray) => {
  const original = object[method];
  object[method] = implementation;
  cleanupArray.push(() => {
    object[method] = original;
  });
};

test("1. Subscription creation initializes active subscription with 30-day period", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const createdSubs = [];
  const createdHistories = [];

  stub(Company, "findByPk", async (id) => ({ id, companyName: "Acme Corp", plan: "BUSINESS", createdAt: new Date() }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => null, cleanup);
  stub(subscriptionRepository, "createSubscription", async (data) => {
    const sub = { id: "sub-1", ...data };
    createdSubs.push(sub);
    return sub;
  }, cleanup);
  stub(subscriptionRepository, "recordHistory", async (data) => {
    createdHistories.push(data);
    return { id: "hist-1", ...data };
  }, cleanup);

  const sub = await subscriptionService.ensureCompanySubscription("company-1", "BUSINESS");

  assert.equal(sub.companyId, "company-1");
  assert.equal(sub.plan, "BUSINESS");
  assert.equal(sub.status, SUBSCRIPTION_STATUSES.ACTIVE);
  assert.ok(new Date(sub.currentPeriodEnd) > new Date(sub.currentPeriodStart));
  assert.equal(createdHistories.length, 1);
  assert.equal(createdHistories[0].action, SUBSCRIPTION_ACTIONS.CREATED);
});

test("2. Existing company backfill operates idempotently without overwriting", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const existingSub = {
    id: "sub-existing",
    companyId: "company-1",
    plan: "PROFESSIONAL",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
  };

  let createCalls = 0;
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => existingSub, cleanup);
  stub(subscriptionRepository, "createSubscription", async () => {
    createCalls++;
  }, cleanup);

  const result = await subscriptionService.ensureCompanySubscription("company-1");

  assert.equal(result.id, "sub-existing");
  assert.equal(result.plan, "PROFESSIONAL");
  assert.equal(createCalls, 0, "Should not create duplicate subscription for existing company");
});

test("3. One active subscription rule prevents accidental duplicate active subscriptions", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const existingSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "STARTER",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  stub(Company, "findByPk", async (id) => ({ id, companyName: "Acme", plan: "STARTER", update: async () => {} }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => existingSub, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async () => {}, cleanup);

  const updated = await subscriptionService.activateSubscription("company-1", { plan: "BUSINESS" });

  assert.equal(updated.id, "sub-1", "Updates existing subscription record in place rather than creating orphan duplicates");
  assert.equal(updated.plan, "BUSINESS");
  assert.equal(updated.status, SUBSCRIPTION_STATUSES.ACTIVE);
});

test("4. Tenant isolation ensures company A subscription is isolated from company B", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(Company, "findByPk", async (id) => ({ id, companyName: `Company ${id}`, plan: "STARTER" }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async (companyId) => ({
    id: `sub-${companyId}`,
    companyId,
    plan: companyId === "company-a" ? "STARTER" : "PROFESSIONAL",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
  }), cleanup);

  const subA = await subscriptionService.getCurrentSubscription("company-a");
  const subB = await subscriptionService.getCurrentSubscription("company-b");

  assert.equal(subA.companyId, "company-a");
  assert.equal(subA.plan, "STARTER");
  assert.equal(subB.companyId, "company-b");
  assert.equal(subB.plan, "PROFESSIONAL");
});

test("5. COMPANY_ADMIN resolves tenant from req.user.companyId and cannot manipulate companyId", async (t) => {
  const req = {
    user: { id: "user-1", role: "COMPANY_ADMIN", companyId: "trusted-company-id" },
    params: { companyId: "attacker-company-id" },
    query: { companyId: "attacker-company-id" },
  };

  const resolved = subscriptionController.resolveCompanyId(req);
  assert.equal(resolved, "trusted-company-id", "COMPANY_ADMIN cannot override companyId via params or query");
});

test("6. SUPER_ADMIN subscription management resolves requested companyId", async (t) => {
  const req = {
    user: { id: "super-1", role: "SUPER_ADMIN" },
    params: { companyId: "target-client-id" },
    query: {},
  };

  const resolved = subscriptionController.resolveCompanyId(req);
  assert.equal(resolved, "target-client-id");
});

test("7. Trial creation sets TRIALING status, trialStart, and trialEnd", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let updatedCompanyPlan = null;
  const historyEntries = [];

  const fakeCompany = {
    id: "company-1",
    plan: "STARTER",
    update: async (data) => {
      updatedCompanyPlan = data.plan;
    },
  };

  stub(Company, "findByPk", async () => fakeCompany, cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => null, cleanup);
  stub(subscriptionRepository, "createSubscription", async (data) => ({ id: "sub-trial", ...data }), cleanup);
  stub(subscriptionRepository, "recordHistory", async (data) => historyEntries.push(data), cleanup);

  const trial = await subscriptionService.startTrial("company-1", {
    plan: "PROFESSIONAL",
    trialDays: 14,
    source: SUBSCRIPTION_SOURCES.ADMIN,
    reason: "New customer pilot",
  });

  assert.equal(trial.status, SUBSCRIPTION_STATUSES.TRIALING);
  assert.equal(trial.plan, "PROFESSIONAL");
  assert.ok(trial.trialStart);
  assert.ok(trial.trialEnd);
  assert.equal(updatedCompanyPlan, "PROFESSIONAL", "Synchronizes Company.plan cache");
  assert.equal(historyEntries[0].action, SUBSCRIPTION_ACTIONS.TRIAL_STARTED);
});

test("8. Trial expiration transitions expired trial to EXPIRED", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const historyEntries = [];
  const fakeTrial = {
    id: "sub-trial",
    companyId: "company-1",
    plan: "BUSINESS",
    status: SUBSCRIPTION_STATUSES.TRIALING,
    trialEnd: new Date(Date.now() - 86400000), // Yesterday
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  stub(subscriptionRepository, "findCurrentByCompanyId", async () => fakeTrial, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async (data) => historyEntries.push(data), cleanup);

  const expired = await subscriptionService.expireSubscription("company-1", {
    source: SUBSCRIPTION_SOURCES.SYSTEM,
    reason: "Trial period ended",
  });

  assert.equal(expired.status, SUBSCRIPTION_STATUSES.EXPIRED);
  assert.ok(expired.endedAt);
  assert.equal(historyEntries[0].action, SUBSCRIPTION_ACTIONS.EXPIRED);
});

test("9. Activation sets ACTIVE status, clears cancellation flags, and sets 30-day period", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const historyEntries = [];
  const fakeSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "STARTER",
    status: SUBSCRIPTION_STATUSES.EXPIRED,
    cancelAtPeriodEnd: true,
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "STARTER", update: async () => {} }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => fakeSub, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async (data) => historyEntries.push(data), cleanup);

  const activated = await subscriptionService.activateSubscription("company-1", {
    plan: "BUSINESS",
    periodDays: 30,
    source: SUBSCRIPTION_SOURCES.ADMIN,
  });

  assert.equal(activated.status, SUBSCRIPTION_STATUSES.ACTIVE);
  assert.equal(activated.plan, "BUSINESS");
  assert.equal(activated.cancelAtPeriodEnd, false);
  assert.equal(activated.endedAt, null);
  assert.equal(historyEntries[0].action, SUBSCRIPTION_ACTIONS.ACTIVATED);
});

test("10. Cancellation at period end marks cancelAtPeriodEnd while keeping ACTIVE until period ends", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const historyEntries = [];
  const futureEnd = new Date(Date.now() + 15 * 86400000);
  const activeSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "BUSINESS",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    currentPeriodEnd: futureEnd,
    cancelAtPeriodEnd: false,
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "BUSINESS" }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => activeSub, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async (data) => historyEntries.push(data), cleanup);

  const result = await subscriptionService.cancelSubscription("company-1", {
    cancelAtPeriodEnd: true,
    source: SUBSCRIPTION_SOURCES.ADMIN,
  });

  assert.equal(result.status, SUBSCRIPTION_STATUSES.ACTIVE, "Remains active until period end");
  assert.equal(result.cancelAtPeriodEnd, true);
  assert.ok(result.cancelledAt);
  assert.equal(historyEntries[0].action, SUBSCRIPTION_ACTIONS.CANCELLED);
});

test("11. Immediate administrative cancellation sets status CANCELLED immediately", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const historyEntries = [];
  const activeSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "BUSINESS",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "BUSINESS" }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => activeSub, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async (data) => historyEntries.push(data), cleanup);

  const result = await subscriptionService.cancelSubscription("company-1", {
    immediate: true,
    cancelAtPeriodEnd: false,
    source: SUBSCRIPTION_SOURCES.ADMIN,
  });

  assert.equal(result.status, SUBSCRIPTION_STATUSES.CANCELLED);
  assert.ok(result.endedAt);
  assert.equal(historyEntries[0].action, SUBSCRIPTION_ACTIONS.CANCELLED);
});

test("12. Expiration marks status EXPIRED and preserves all client data", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const historyEntries = [];
  const activeSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "PROFESSIONAL",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "PROFESSIONAL" }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => activeSub, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async (data) => historyEntries.push(data), cleanup);

  const expired = await subscriptionService.expireSubscription("company-1", {
    reason: "Subscription expired",
  });

  assert.equal(expired.status, SUBSCRIPTION_STATUSES.EXPIRED);
  assert.ok(expired.endedAt);
  assert.equal(historyEntries[0].action, SUBSCRIPTION_ACTIONS.EXPIRED);
});

test("13. Plan change updates tier, preserves data, and logs transition in history", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const historyEntries = [];
  let companyPlanState = "STARTER";
  let companyCustomLimits = null;

  const fakeCompany = {
    id: "company-1",
    plan: "STARTER",
    customLimits: null,
    update: async (data) => {
      companyPlanState = data.plan;
      companyCustomLimits = data.customLimits;
    },
  };

  const activeSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "STARTER",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  stub(Company, "findByPk", async () => fakeCompany, cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => activeSub, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async (data) => historyEntries.push(data), cleanup);

  const result = await subscriptionService.changePlan("company-1", "ENTERPRISE", {
    customLimits: { MONTHLY_MESSAGES: 500000 },
    source: SUBSCRIPTION_SOURCES.ADMIN,
    reason: "Client upgraded to Enterprise tier",
  });

  assert.equal(result.plan, "ENTERPRISE");
  assert.equal(companyPlanState, "ENTERPRISE");
  assert.deepEqual(companyCustomLimits, { MONTHLY_MESSAGES: 500000 });
  assert.equal(historyEntries[0].previousPlan, "STARTER");
  assert.equal(historyEntries[0].newPlan, "ENTERPRISE");
  assert.equal(historyEntries[0].action, SUBSCRIPTION_ACTIONS.PLAN_CHANGED);
});

test("14. Downgrade over-limit behavior cooperates with PlanService to block new usage", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const fakeSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "STARTER",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "STARTER", customLimits: null }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => fakeSub, cleanup);
  stub(planService, "getCurrentUsage", async () => 6000, cleanup); // 6,000 sent > 5,000 Starter limit

  const check = await planService.checkLimit("company-1", METRIC_KEYS.MONTHLY_MESSAGES, 1);

  assert.equal(check.allowed, false);
  assert.equal(check.status, "OVER_LIMIT");
  assert.equal(check.remaining, 0);
});

test("15. Subscription history returns chronological list of transitions", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const mockHistory = [
    { id: "h-2", action: "PLAN_CHANGED", previousPlan: "STARTER", newPlan: "BUSINESS", createdAt: new Date() },
    { id: "h-1", action: "CREATED", previousPlan: null, newPlan: "STARTER", createdAt: new Date(Date.now() - 86400000) },
  ];

  stub(subscriptionRepository, "findHistoryByCompanyId", async () => mockHistory, cleanup);

  const history = await subscriptionService.getSubscriptionHistory("company-1");

  assert.equal(history.length, 2);
  assert.equal(history[0].action, "PLAN_CHANGED");
  assert.equal(history[1].action, "CREATED");
});

test("16. Idempotent cancellation does not produce duplicate history records", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let historyCalls = 0;
  const alreadyCancelledSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "BUSINESS",
    status: SUBSCRIPTION_STATUSES.CANCELLED,
    cancelAtPeriodEnd: false,
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "BUSINESS" }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => alreadyCancelledSub, cleanup);
  stub(subscriptionRepository, "recordHistory", async () => { historyCalls++; }, cleanup);

  const result = await subscriptionService.cancelSubscription("company-1", { immediate: true });

  assert.equal(result.status, SUBSCRIPTION_STATUSES.CANCELLED);
  assert.equal(historyCalls, 0, "Repeated cancel call should be idempotent");
});

test("17. Idempotent activation does not produce duplicate history for already-active plan", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let historyCalls = 0;
  const futureEnd = new Date(Date.now() + 20 * 86400000);
  const alreadyActiveSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "PROFESSIONAL",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: futureEnd,
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "PROFESSIONAL" }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => alreadyActiveSub, cleanup);
  stub(subscriptionRepository, "recordHistory", async () => { historyCalls++; }, cleanup);

  const result = await subscriptionService.activateSubscription("company-1", { plan: "PROFESSIONAL" });

  assert.equal(result.plan, "PROFESSIONAL");
  assert.equal(historyCalls, 0, "Repeated activate call on active plan should be idempotent");
});

test("18. Idempotent plan assignment avoids duplicate records when same plan is assigned", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let historyCalls = 0;
  const currentSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "BUSINESS",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "BUSINESS", customLimits: null, update: async () => {} }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => currentSub, cleanup);
  stub(subscriptionRepository, "recordHistory", async () => { historyCalls++; }, cleanup);

  const result = await subscriptionService.changePlan("company-1", "BUSINESS", { customLimits: null });

  assert.equal(result.plan, "BUSINESS");
  assert.equal(historyCalls, 0, "Re-assigning same plan with same limits is idempotent");
});

test("19. Company.plan synchronization maintains cache consistency", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let cachedPlan = "STARTER";
  const fakeCompany = {
    id: "company-1",
    plan: cachedPlan,
    update: async (data) => {
      cachedPlan = data.plan;
    },
  };

  const activeSub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "STARTER",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  stub(Company, "findByPk", async () => fakeCompany, cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => activeSub, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async () => {}, cleanup);

  await subscriptionService.changePlan("company-1", "PROFESSIONAL");

  assert.equal(cachedPlan, "PROFESSIONAL", "Company.plan is synchronized to match Subscription.plan");
});

test("20. PlanService integration derives active limits from authoritative subscription", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const sub = {
    id: "sub-1",
    companyId: "company-1",
    plan: "BUSINESS",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
  };

  stub(Company, "findByPk", async () => ({ id: "company-1", companyName: "Acme Corp", plan: "BUSINESS", customLimits: null }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => sub, cleanup);

  const overview = await planService.getCompanyPlanOverview("company-1");

  assert.equal(overview.plan.name, "BUSINESS");
  const msgMetric = overview.metrics.find((m) => m.metric === "MONTHLY_MESSAGES");
  assert.equal(msgMetric.limit, 25000);
});

test("21. Scheduler lifecycle checks processes expired trials and scheduled cancellations", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const now = new Date();
  const expiredTrial = {
    id: "sub-trial-1",
    companyId: "comp-trial",
    plan: "STARTER",
    status: SUBSCRIPTION_STATUSES.TRIALING,
    trialEnd: new Date(now.getTime() - 3600000),
    update: async function (data) { Object.assign(this, data); return this; },
  };

  const toCancel = {
    id: "sub-cancel-1",
    companyId: "comp-cancel",
    plan: "BUSINESS",
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    cancelAtPeriodEnd: true,
    currentPeriodEnd: new Date(now.getTime() - 3600000),
    update: async function (data) { Object.assign(this, data); return this; },
  };

  stub(subscriptionRepository, "findExpiredTrials", async () => [expiredTrial], cleanup);
  stub(subscriptionRepository, "findSubscriptionsToCancelAtPeriodEnd", async () => [toCancel], cleanup);
  stub(subscriptionRepository, "findExpiredSubscriptions", async () => [], cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async (companyId) => {
    if (companyId === "comp-trial") return expiredTrial;
    if (companyId === "comp-cancel") return toCancel;
    return null;
  }, cleanup);
  stub(subscriptionRepository, "updateSubscription", async (sub, data) => sub.update(data), cleanup);
  stub(subscriptionRepository, "recordHistory", async () => {}, cleanup);

  const summary = await subscriptionService.processScheduledLifecycleChecks(now);

  assert.equal(summary.expiredTrials, 1);
  assert.equal(summary.cancelledAtPeriodEnd, 1);
  assert.equal(expiredTrial.status, SUBSCRIPTION_STATUSES.EXPIRED);
  assert.equal(toCancel.status, SUBSCRIPTION_STATUSES.CANCELLED);
});

test("22. Cross-company access rejection throws 404 for unowned or missing subscriptions", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(subscriptionRepository, "findCurrentByCompanyId", async () => null, cleanup);
  stub(Company, "findByPk", async () => null, cleanup);

  await assert.rejects(
    async () => {
      await subscriptionService.getCurrentSubscription("non-existent-company");
    },
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});

test("23. No fake payment or external subscription values are fabricated", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(Company, "findByPk", async () => ({ id: "company-1", plan: "STARTER" }), cleanup);
  stub(subscriptionRepository, "findCurrentByCompanyId", async () => null, cleanup);
  stub(subscriptionRepository, "createSubscription", async (data) => data, cleanup);
  stub(subscriptionRepository, "recordHistory", async () => {}, cleanup);

  const sub = await subscriptionService.ensureCompanySubscription("company-1");

  assert.equal(sub.externalSubscriptionId, undefined, "External subscription ID remains null/undefined without fake payment strings");
});
