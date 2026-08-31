const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateNextBillingPeriod } = require("../src/utils/date.util");
const {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_ACTIONS,
  SUBSCRIPTION_SOURCES,
} = require("../src/config/subscriptions.config");
const {
  BILLING_INTERVALS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
} = require("../src/config/pricing.config");
const { Company, Payment } = require("../src/models");
const subscriptionService = require("../src/services/subscription.service");
const paymentService = require("../src/services/payment.service");
const planService = require("../src/services/plan.service");
const subscriptionRepository = require("../src/repositories/subscription.repository");
const paymentRepository = require("../src/repositories/payment.repository");

test("Renewal & Expiry Module (#15) Tests", async (t) => {
  const testCompanyId = "33333333-4444-5555-6666-777777777777";

  // 1. UTC Billing Period Calculation
  await t.test("1. calculateNextBillingPeriod handles monthly, month-end clamping, and leap years", () => {
    // Standard 1 month starting in the future
    const start1 = new Date("2026-08-15T00:00:00.000Z");
    const refNow = new Date("2026-08-01T00:00:00.000Z");
    const p1 = calculateNextBillingPeriod(start1, BILLING_INTERVALS.MONTHLY, refNow);
    assert.strictEqual(p1.start.toISOString(), "2026-08-15T00:00:00.000Z");
    assert.strictEqual(p1.end.toISOString(), "2026-09-15T00:00:00.000Z");

    // Month-end clamping: Jan 31 -> Feb 28 on non-leap year 2026
    const startJan = new Date("2026-01-31T00:00:00.000Z");
    const pJan = calculateNextBillingPeriod(startJan, BILLING_INTERVALS.MONTHLY, new Date("2026-01-01T00:00:00.000Z"));
    assert.strictEqual(pJan.end.getUTCMonth(), 1); // February
    assert.strictEqual(pJan.end.getUTCDate(), 28);

    // Leap year month-end: Jan 31 -> Feb 29 on leap year 2024
    const startJanLeap = new Date("2024-01-31T00:00:00.000Z");
    const pJanLeap = calculateNextBillingPeriod(startJanLeap, BILLING_INTERVALS.MONTHLY, new Date("2024-01-01T00:00:00.000Z"));
    assert.strictEqual(pJanLeap.end.getUTCMonth(), 1); // February
    assert.strictEqual(pJanLeap.end.getUTCDate(), 29);

    // Standard 1 year
    const startYr = new Date("2026-08-15T00:00:00.000Z");
    const pYr = calculateNextBillingPeriod(startYr, BILLING_INTERVALS.YEARLY, refNow);
    assert.strictEqual(pYr.end.toISOString(), "2027-08-15T00:00:00.000Z");

    // Leap year yearly: Feb 29, 2024 -> Feb 28, 2025
    const startFebLeap = new Date("2024-02-29T00:00:00.000Z");
    const pFebLeap = calculateNextBillingPeriod(startFebLeap, BILLING_INTERVALS.YEARLY, new Date("2024-01-01T00:00:00.000Z"));
    assert.strictEqual(pFebLeap.end.toISOString(), "2025-02-28T00:00:00.000Z");
  });

  // 2. Authoritative Renewal Preview
  await t.test("2. Renewal preview computes next period dates, days until expiry, and server-side pricing", async () => {
    const currentEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    let mockSub = {
      id: "sub-101",
      companyId: testCompanyId,
      plan: "BUSINESS",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: currentEnd,
      pendingPlan: null,
    };

    const origGetSub = subscriptionService.getCurrentSubscription;
    subscriptionService.getCurrentSubscription = async () => mockSub;

    try {
      const preview = await subscriptionService.previewRenewal(testCompanyId, "MONTHLY");

      assert.strictEqual(preview.plan, "BUSINESS");
      assert.strictEqual(preview.billingInterval, "MONTHLY");
      assert.strictEqual(preview.price.amount, 249900); // ₹2,499 in paise
      assert.strictEqual(preview.price.displayAmount, 2499);
      assert.strictEqual(preview.isEligible, true);
      assert.strictEqual(preview.hasPendingDowngrade, false);
      assert.ok(new Date(preview.nextPeriodEnd) > new Date(preview.nextPeriodStart));
    } finally {
      subscriptionService.getCurrentSubscription = origGetSub;
    }
  });

  // 3. Renewal order creation calculates authoritative amount and sets paymentType = RENEWAL
  await t.test("3. Renewal order creation sets paymentType = RENEWAL and uses server pricing", async () => {
    let mockCompany = {
      id: testCompanyId,
      companyName: "Acme Corp",
      email: "admin@acme.com",
      plan: "BUSINESS",
    };
    let mockSub = {
      id: "sub-101",
      companyId: testCompanyId,
      plan: "BUSINESS",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-09-30T23:59:59.000Z"),
    };

    const origFindCompany = Company.findByPk;
    const origEnsure = subscriptionService.ensureCompanySubscription;
    const origCreatePayment = paymentRepository.createPayment;

    Company.findByPk = async () => mockCompany;
    subscriptionService.ensureCompanySubscription = async () => mockSub;
    paymentRepository.createPayment = async (data) => ({
      id: "pay-101",
      ...data,
    });

    try {
      const order = await paymentService.createPaymentOrder({
        companyId: testCompanyId,
        plan: "BUSINESS",
        billingInterval: "MONTHLY",
        paymentType: "RENEWAL",
      });

      assert.ok(order.orderId);
      assert.strictEqual(order.amount, 249900); // Server calculated ₹2,499
      assert.strictEqual(order.currency, "INR");
      assert.strictEqual(order.plan, "BUSINESS");
    } finally {
      Company.findByPk = origFindCompany;
      subscriptionService.ensureCompanySubscription = origEnsure;
      paymentRepository.createPayment = origCreatePayment;
    }
  });

  // 4. Verified payment renewal extends billing period and records RENEWED history
  await t.test("4. Verified payment renewal extends period by exact calendar interval and sets ACTIVE", async () => {
    const origEnd = new Date("2026-08-31T23:59:59.000Z");
    let mockSub = {
      id: "sub-101",
      companyId: testCompanyId,
      plan: "BUSINESS",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
      currentPeriodEnd: origEnd,
      pendingPlan: "STARTER",
    };
    let mockCompany = {
      id: testCompanyId,
      plan: "BUSINESS",
      update: async (data) => Object.assign(mockCompany, data),
    };

    const origGetSub = subscriptionService.getCurrentSubscription;
    const origUpdate = subscriptionRepository.updateSubscription;
    const origRecord = subscriptionRepository.recordHistory;
    const origFindComp = Company.findByPk;

    let recordedAction = null;
    subscriptionService.getCurrentSubscription = async () => mockSub;
    subscriptionRepository.updateSubscription = async (sub, updateData) => {
      Object.assign(mockSub, updateData);
      return mockSub;
    };
    subscriptionRepository.recordHistory = async (hist) => {
      recordedAction = hist.action;
      return hist;
    };
    Company.findByPk = async () => mockCompany;

    try {
      const renewed = await subscriptionService.renewSubscriptionPeriod(testCompanyId, {
        billingInterval: "MONTHLY",
        source: SUBSCRIPTION_SOURCES.PAYMENT,
        reason: "Paid renewal verified",
      });

      assert.strictEqual(renewed.status, "ACTIVE");
      assert.ok(new Date(renewed.currentPeriodEnd) > origEnd);
      assert.strictEqual(renewed.pendingPlan, null);
      assert.strictEqual(recordedAction, SUBSCRIPTION_ACTIONS.RENEWED);
    } finally {
      subscriptionService.getCurrentSubscription = origGetSub;
      subscriptionRepository.updateSubscription = origUpdate;
      subscriptionRepository.recordHistory = origRecord;
      Company.findByPk = origFindComp;
    }
  });

  // 5. Renewal Idempotency: duplicate payment verification does not double-extend
  await t.test("5. Payment verification idempotency prevents double-extending the subscription", async () => {
    let callCount = 0;
    const origRenew = subscriptionService.renewSubscriptionPeriod;
    const origGetSub = subscriptionService.getCurrentSubscription;
    const origFindPayment = paymentRepository.findPaymentById;

    subscriptionService.getCurrentSubscription = async () => ({
      id: "sub-101",
      companyId: testCompanyId,
      status: "ACTIVE",
      plan: "BUSINESS",
    });

    subscriptionService.renewSubscriptionPeriod = async () => {
      callCount++;
      return { id: "sub-101", status: "ACTIVE" };
    };

    paymentRepository.findPaymentById = async () => ({
      id: "pay-captured",
      companyId: testCompanyId,
      status: PAYMENT_STATUSES.CAPTURED,
      paymentType: PAYMENT_TYPES.RENEWAL,
      provider: "RAZORPAY",
      providerOrderId: "order_123",
      providerPaymentId: "pay_123",
      amount: 249900,
      currency: "INR",
      plan: "BUSINESS",
      billingInterval: "MONTHLY",
    });

    try {
      // First verification call on already captured payment returns idempotently
      const res1 = await paymentService.verifyAndProcessPayment({
        companyId: testCompanyId,
        paymentId: "pay-captured",
        orderId: "order_123",
        providerPaymentId: "pay_123",
        signature: "test_simulated_signature",
      });

      assert.strictEqual(res1.payment.status, PAYMENT_STATUSES.CAPTURED);
      assert.strictEqual(callCount, 0); // No double extension
    } finally {
      subscriptionService.renewSubscriptionPeriod = origRenew;
      subscriptionService.getCurrentSubscription = origGetSub;
      paymentRepository.findPaymentById = origFindPayment;
    }
  });

  // 6. Subscription Scheduler transitions expired subscriptions to EXPIRED
  await t.test("6. Scheduler transitions past_due unrenewed subscriptions to EXPIRED", async () => {
    let mockSub = {
      id: "sub-expired-1",
      companyId: testCompanyId,
      plan: "STARTER",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-08-20T00:00:00.000Z"),
    };

    const origFindExpired = subscriptionRepository.findExpiredSubscriptions;
    const origExpire = subscriptionService.expireSubscription;

    let expiredCount = 0;
    subscriptionRepository.findExpiredSubscriptions = async () => [mockSub];
    subscriptionService.expireSubscription = async (cId, opts) => {
      expiredCount++;
      mockSub.status = "EXPIRED";
      return mockSub;
    };

    try {
      const results = await subscriptionService.processScheduledLifecycleChecks(new Date());
      assert.strictEqual(results.expiredSubscriptions, 1);
      assert.strictEqual(expiredCount, 1);
    } finally {
      subscriptionRepository.findExpiredSubscriptions = origFindExpired;
      subscriptionService.expireSubscription = origExpire;
    }
  });

  // 7. Expired Access Policy in PlanService blocks outbound messaging dispatches
  await t.test("7. PlanService blocks outbound message dispatches when subscription is EXPIRED", async () => {
    const origEnsure = subscriptionService.ensureCompanySubscription;
    subscriptionService.ensureCompanySubscription = async () => ({
      id: "sub-101",
      companyId: testCompanyId,
      plan: "BUSINESS",
      status: "EXPIRED",
    });

    try {
      await assert.rejects(
        async () => {
          await planService.assertWithinLimit(testCompanyId, "MONTHLY_MESSAGES", 1);
        },
        {
          message:
            "Your subscription has expired. Please renew your subscription to resume sending messages and creating campaigns.",
        }
      );
    } finally {
      subscriptionService.ensureCompanySubscription = origEnsure;
    }
  });

  // 8. Expired subscription renewal restarts billing period from now
  await t.test("8. Renewing an expired subscription sets status to ACTIVE and starts period from now", async () => {
    const pastEnd = new Date("2026-08-10T00:00:00.000Z");
    let mockSub = {
      id: "sub-101",
      companyId: testCompanyId,
      plan: "BUSINESS",
      status: "EXPIRED",
      currentPeriodStart: new Date("2026-07-10T00:00:00.000Z"),
      currentPeriodEnd: pastEnd,
    };
    let mockCompany = {
      id: testCompanyId,
      plan: "BUSINESS",
      update: async (data) => Object.assign(mockCompany, data),
    };

    const origGetSub = subscriptionService.getCurrentSubscription;
    const origUpdate = subscriptionRepository.updateSubscription;
    const origRecord = subscriptionRepository.recordHistory;
    const origFindComp = Company.findByPk;

    subscriptionService.getCurrentSubscription = async () => mockSub;
    subscriptionRepository.updateSubscription = async (sub, updateData) => {
      Object.assign(mockSub, updateData);
      return mockSub;
    };
    subscriptionRepository.recordHistory = async (hist) => hist;
    Company.findByPk = async () => mockCompany;

    try {
      const renewed = await subscriptionService.renewSubscriptionPeriod(testCompanyId, {
        billingInterval: "MONTHLY",
        source: SUBSCRIPTION_SOURCES.PAYMENT,
      });

      assert.strictEqual(renewed.status, "ACTIVE");
      assert.ok(new Date(renewed.currentPeriodStart) > pastEnd);
      assert.ok(new Date(renewed.currentPeriodEnd) > new Date(renewed.currentPeriodStart));
    } finally {
      subscriptionService.getCurrentSubscription = origGetSub;
      subscriptionRepository.updateSubscription = origUpdate;
      subscriptionRepository.recordHistory = origRecord;
      Company.findByPk = origFindComp;
    }
  });
});
