const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const {
  BILLING_INTERVALS,
  INTERVAL_DAYS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  PAYMENT_PROVIDERS,
  PLAN_PRICING,
  getPlanPrice,
  isPlanPurchasable,
  formatPaiseToRupees,
} = require("../src/config/pricing.config");
const { PLAN_NAMES, PLANS } = require("../src/config/plans.config");
const { SUBSCRIPTION_STATUSES, SUBSCRIPTION_SOURCES } = require("../src/config/subscriptions.config");
const paymentService = require("../src/services/payment.service");
const paymentRepository = require("../src/repositories/payment.repository");
const subscriptionService = require("../src/services/subscription.service");
const paymentProviderFactory = require("../src/services/payment/paymentProvider.factory");
const RazorpayProvider = require("../src/services/payment/providers/razorpay.provider");
const { Company, Subscription, Payment, PaymentWebhookEvent } = require("../src/models");

test("PAYMENTS MODULE - Unit & Integration Tests", async (t) => {
  const secretKey = "test_key_secret_abc123";
  const webhookSecret = "test_webhook_secret_xyz789";

  const razorpay = new RazorpayProvider({
    keyId: "rzp_test_12345",
    keySecret: secretKey,
    webhookSecret: webhookSecret,
  });

  await t.test("1. Commercial pricing configuration accurately calculates amounts in minor units (paise)", () => {
    assert.equal(getPlanPrice(PLAN_NAMES.STARTER, BILLING_INTERVALS.MONTHLY).amount, 99900);
    assert.equal(getPlanPrice(PLAN_NAMES.STARTER, BILLING_INTERVALS.YEARLY).amount, 999000);
    assert.equal(getPlanPrice(PLAN_NAMES.BUSINESS, BILLING_INTERVALS.MONTHLY).amount, 249900);
    assert.equal(getPlanPrice(PLAN_NAMES.BUSINESS, BILLING_INTERVALS.YEARLY).amount, 2499000);
    assert.equal(getPlanPrice(PLAN_NAMES.PROFESSIONAL, BILLING_INTERVALS.MONTHLY).amount, 599900);
    assert.equal(getPlanPrice(PLAN_NAMES.PROFESSIONAL, BILLING_INTERVALS.YEARLY).amount, 5999000);

    // Enterprise custom plan has no self-serve checkout price
    assert.equal(getPlanPrice(PLAN_NAMES.ENTERPRISE, BILLING_INTERVALS.MONTHLY), null);
    assert.equal(isPlanPurchasable(PLAN_NAMES.ENTERPRISE), false);
    assert.equal(isPlanPurchasable(PLAN_NAMES.BUSINESS), true);

    // Minor unit conversion helper
    assert.equal(formatPaiseToRupees(99900), "999.00");
    assert.equal(formatPaiseToRupees(249900), "2499.00");
  });

  await t.test("2. Razorpay payment signature verification accepts valid HMAC and rejects forged signatures", () => {
    const orderId = "order_sample_001";
    const paymentId = "pay_sample_001";

    const validSignature = crypto
      .createHmac("sha256", secretKey)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const forgedSignature = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    assert.equal(
      razorpay.verifyPaymentSignature({ orderId, paymentId, signature: validSignature }),
      true
    );
    assert.equal(
      razorpay.verifyPaymentSignature({ orderId, paymentId, signature: forgedSignature }),
      false
    );
    assert.equal(
      razorpay.verifyPaymentSignature({ orderId, paymentId, signature: "" }),
      false
    );
  });

  await t.test("3. Razorpay webhook signature verification validates raw buffer payload HMAC", () => {
    const rawPayload = Buffer.from(JSON.stringify({ event: "payment.captured", id: "evt_123" }));
    const validSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    const forgedSignature = "bad_signature_value";

    assert.equal(
      razorpay.verifyWebhookSignature({ rawBody: rawPayload, signature: validSignature }),
      true
    );
    assert.equal(
      razorpay.verifyWebhookSignature({ rawBody: rawPayload, signature: forgedSignature }),
      false
    );
  });

  await t.test("4. Server-side payment order creation rejects unpurchasable or invalid plans", async () => {
    // Stub company lookup
    const origFindByPk = Company.findByPk;
    Company.findByPk = async (id) => ({
      id,
      companyName: "Acme Corp",
      email: "billing@acme.com",
      plan: "STARTER",
    });

    try {
      // Invalid plan
      await assert.rejects(
        paymentService.createPaymentOrder({ companyId: "comp-1", plan: "NON_EXISTENT" }),
        /Invalid plan/
      );

      // Enterprise plan (no self-serve price)
      await assert.rejects(
        paymentService.createPaymentOrder({ companyId: "comp-1", plan: PLAN_NAMES.ENTERPRISE }),
        /has no commercial checkout price configured/
      );
    } finally {
      Company.findByPk = origFindByPk;
    }
  });

  await t.test("5. Payment order creation calculates authoritative amount and does not trust client pricing", async () => {
    const origFindByPk = Company.findByPk;
    const origCreatePayment = paymentRepository.createPayment;

    let savedPaymentData = null;
    Company.findByPk = async (id) => ({
      id,
      companyName: "Acme Corp",
      email: "billing@acme.com",
      plan: "STARTER",
    });

    paymentRepository.createPayment = async (data) => {
      savedPaymentData = { id: "pay-test-uuid", ...data };
      return savedPaymentData;
    };

    try {
      const order = await paymentService.createPaymentOrder({
        companyId: "comp-100",
        plan: PLAN_NAMES.BUSINESS,
        billingInterval: BILLING_INTERVALS.MONTHLY,
      });

      assert.equal(order.amount, 249900); // Exactly ₹2,499 in paise
      assert.equal(order.currency, "INR");
      assert.equal(order.plan, PLAN_NAMES.BUSINESS);
      assert.equal(savedPaymentData.amount, 249900);
      assert.equal(savedPaymentData.status, PAYMENT_STATUSES.CREATED);
      assert.ok(order.orderId.startsWith("order_"));

      // Ensure secret keys are never leaked to frontend
      assert.equal(order.keySecret, undefined);
      assert.equal(order.webhookSecret, undefined);
    } finally {
      Company.findByPk = origFindByPk;
      paymentRepository.createPayment = origCreatePayment;
    }
  });

  await t.test("6. Payment verification captures payment, activates subscription, and updates Company.plan", async () => {
    const origFindPayment = paymentRepository.findPaymentById;
    const origUpdatePayment = paymentRepository.updatePayment;
    const origActivate = subscriptionService.activateSubscription;

    const mockPayment = {
      id: "pay-rec-1",
      companyId: "company-alpha",
      provider: PAYMENT_PROVIDERS.RAZORPAY,
      providerOrderId: "order_alpha_123",
      amount: 249900,
      currency: "INR",
      plan: PLAN_NAMES.BUSINESS,
      billingInterval: BILLING_INTERVALS.MONTHLY,
      status: PAYMENT_STATUSES.CREATED,
    };

    paymentRepository.findPaymentById = async () => mockPayment;
    paymentRepository.updatePayment = async (p, data) => Object.assign(p, data);

    let activationCalled = false;
    subscriptionService.activateSubscription = async (companyId, opts) => {
      activationCalled = true;
      assert.equal(companyId, "company-alpha");
      assert.equal(opts.plan, PLAN_NAMES.BUSINESS);
      assert.equal(opts.periodDays, 30);
      assert.equal(opts.source, SUBSCRIPTION_SOURCES.PAYMENT);
      return {
        id: "sub-alpha-1",
        companyId,
        plan: opts.plan,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
      };
    };

    // Generate valid HMAC signature using default test secret
    const validSignature = crypto
      .createHmac("sha256", "test_secret_key")
      .update("order_alpha_123|pay_alpha_999")
      .digest("hex");

    try {
      const result = await paymentService.verifyAndProcessPayment({
        companyId: "company-alpha",
        paymentId: "pay-rec-1",
        orderId: "order_alpha_123",
        providerPaymentId: "pay_alpha_999",
        signature: validSignature,
      });

      assert.equal(result.success, true);
      assert.equal(mockPayment.status, PAYMENT_STATUSES.CAPTURED);
      assert.equal(mockPayment.providerPaymentId, "pay_alpha_999");
      assert.ok(mockPayment.paidAt instanceof Date);
      assert.equal(activationCalled, true);
    } finally {
      paymentRepository.findPaymentById = origFindPayment;
      paymentRepository.updatePayment = origUpdatePayment;
      subscriptionService.activateSubscription = origActivate;
    }
  });

  await t.test("7. Payment verification enforces tenant isolation and rejects cross-company verification", async () => {
    const origFindPayment = paymentRepository.findPaymentById;
    paymentRepository.findPaymentById = async () => ({
      id: "pay-company-a",
      companyId: "company-a",
      status: PAYMENT_STATUSES.CREATED,
    });

    try {
      await assert.rejects(
        paymentService.verifyAndProcessPayment({
          companyId: "company-b", // Attempting to verify Company A's payment
          paymentId: "pay-company-a",
          orderId: "order_a",
          providerPaymentId: "pay_a",
          signature: "sig_a",
        }),
        /Unauthorized: Payment does not belong to your company/
      );
    } finally {
      paymentRepository.findPaymentById = origFindPayment;
    }
  });

  await t.test("8. Payment verification is idempotent: duplicate calls do not double-activate subscriptions", async () => {
    const origFindPayment = paymentRepository.findPaymentById;
    const origGetCurrent = subscriptionService.getCurrentSubscription;
    const origActivate = subscriptionService.activateSubscription;

    let activateCount = 0;
    subscriptionService.activateSubscription = async () => {
      activateCount++;
    };

    subscriptionService.getCurrentSubscription = async (cid) => ({
      id: "sub-1",
      companyId: cid,
      plan: "BUSINESS",
      status: "ACTIVE",
    });

    paymentRepository.findPaymentById = async () => ({
      id: "pay-already-captured",
      companyId: "company-test",
      status: PAYMENT_STATUSES.CAPTURED,
      plan: "BUSINESS",
    });

    try {
      const result = await paymentService.verifyAndProcessPayment({
        companyId: "company-test",
        paymentId: "pay-already-captured",
        orderId: "order_test",
        providerPaymentId: "pay_test",
        signature: "sig_test",
      });

      assert.equal(result.alreadyCaptured, true);
      assert.equal(activateCount, 0); // Not re-activated
    } finally {
      paymentRepository.findPaymentById = origFindPayment;
      subscriptionService.getCurrentSubscription = origGetCurrent;
      subscriptionService.activateSubscription = origActivate;
    }
  });

  await t.test("9. Webhook handler processes payment.captured asynchronously with raw body HMAC verification", async () => {
    const origFindEvent = paymentRepository.findWebhookEvent;
    const origRecordEvent = paymentRepository.recordWebhookEvent;
    const origFindByOrder = paymentRepository.findPaymentByOrderId;
    const origUpdatePayment = paymentRepository.updatePayment;
    const origActivate = subscriptionService.activateSubscription;

    const mockPayment = {
      id: "pay-webhook-1",
      companyId: "company-webhook",
      providerOrderId: "order_wh_100",
      status: PAYMENT_STATUSES.CREATED,
      plan: PLAN_NAMES.PROFESSIONAL,
      billingInterval: BILLING_INTERVALS.YEARLY,
    };

    paymentRepository.findWebhookEvent = async () => null; // Not previously processed
    paymentRepository.recordWebhookEvent = async (d) => d;
    paymentRepository.findPaymentByOrderId = async () => mockPayment;
    paymentRepository.updatePayment = async (p, d) => Object.assign(p, d);

    let activationPlan = null;
    let activationDays = null;
    subscriptionService.activateSubscription = async (cid, opts) => {
      activationPlan = opts.plan;
      activationDays = opts.periodDays;
    };

    const webhookBody = {
      event: "payment.captured",
      id: "evt_razorpay_9999",
      payload: {
        payment: {
          entity: {
            id: "pay_rzp_9999",
            order_id: "order_wh_100",
            amount: 5999000,
            currency: "INR",
          },
        },
      },
    };

    const rawBuffer = Buffer.from(JSON.stringify(webhookBody));
    const validSignature = crypto
      .createHmac("sha256", "test_webhook_secret")
      .update(rawBuffer)
      .digest("hex");

    try {
      const result = await paymentService.processWebhookEvent({
        rawBody: rawBuffer,
        signature: validSignature,
        eventPayload: webhookBody,
      });

      assert.equal(result.status, "PROCESSED");
      assert.equal(result.eventId, "evt_razorpay_9999");
      assert.equal(mockPayment.status, PAYMENT_STATUSES.CAPTURED);
      assert.equal(activationPlan, PLAN_NAMES.PROFESSIONAL);
      assert.equal(activationDays, 365); // Yearly
    } finally {
      paymentRepository.findWebhookEvent = origFindEvent;
      paymentRepository.recordWebhookEvent = origRecordEvent;
      paymentRepository.findPaymentByOrderId = origFindByOrder;
      paymentRepository.updatePayment = origUpdatePayment;
      subscriptionService.activateSubscription = origActivate;
    }
  });

  await t.test("10. Webhook idempotency prevents double-processing on repeated event delivery", async () => {
    const origFindEvent = paymentRepository.findWebhookEvent;
    const origFindByOrder = paymentRepository.findPaymentByOrderId;

    // Simulate already processed event
    paymentRepository.findWebhookEvent = async (id) => ({
      id: "event-in-db",
      providerEventId: id,
      status: "PROCESSED",
    });

    const webhookBody = {
      event: "payment.captured",
      id: "evt_duplicate_1",
      payload: { payment: { entity: { id: "pay_dup", order_id: "order_dup" } } },
    };

    const rawBuffer = Buffer.from(JSON.stringify(webhookBody));
    const validSignature = crypto
      .createHmac("sha256", "test_webhook_secret")
      .update(rawBuffer)
      .digest("hex");

    try {
      const result = await paymentService.processWebhookEvent({
        rawBody: rawBuffer,
        signature: validSignature,
        eventPayload: webhookBody,
      });

      assert.equal(result.status, "ALREADY_PROCESSED");
      assert.equal(result.eventId, "evt_duplicate_1");
    } finally {
      paymentRepository.findWebhookEvent = origFindEvent;
      paymentRepository.findPaymentByOrderId = origFindByOrder;
    }
  });

  await t.test("11. Webhook handler rejects invalid HMAC signatures immediately", async () => {
    const rawBuffer = Buffer.from(JSON.stringify({ event: "payment.captured" }));
    const forgedSignature = "invalid_signature_hex";

    await assert.rejects(
      paymentService.processWebhookEvent({
        rawBody: rawBuffer,
        signature: forgedSignature,
        eventPayload: { event: "payment.captured" },
      }),
      /Invalid webhook signature/
    );
  });

  await t.test("12. Tenant-scoped payment history filters by company ID and pagination", async () => {
    const origFindPayments = paymentRepository.findPaymentsByCompanyId;

    paymentRepository.findPaymentsByCompanyId = async (companyId, limit, offset) => {
      assert.equal(companyId, "company-target");
      assert.equal(limit, 20);
      assert.equal(offset, 0);
      return {
        count: 1,
        rows: [
          {
            id: "pay-1",
            companyId: "company-target",
            amount: 99900,
            currency: "INR",
            status: "CAPTURED",
            plan: "STARTER",
          },
        ],
      };
    };

    try {
      const history = await paymentService.getCompanyPaymentHistory("company-target", 20, 0);
      assert.equal(history.count, 1);
      assert.equal(history.rows[0].companyId, "company-target");
    } finally {
      paymentRepository.findPaymentsByCompanyId = origFindPayments;
    }
  });

  await t.test("13. SUPER_ADMIN platform payment query retrieves payments across all tenants", async () => {
    const origFindAll = paymentRepository.findAllPlatformPayments;

    paymentRepository.findAllPlatformPayments = async (limit, offset, filter) => {
      assert.equal(limit, 50);
      assert.equal(filter.status, "CAPTURED");
      return {
        count: 2,
        rows: [
          { id: "p1", companyId: "comp-a", amount: 249900, status: "CAPTURED" },
          { id: "p2", companyId: "comp-b", amount: 599900, status: "CAPTURED" },
        ],
      };
    };

    try {
      const platformPayments = await paymentService.getPlatformPayments({
        limit: 50,
        status: "CAPTURED",
      });
      assert.equal(platformPayments.count, 2);
    } finally {
      paymentRepository.findAllPlatformPayments = origFindAll;
    }
  });
});
