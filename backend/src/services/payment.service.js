const { Company, Subscription } = require("../models");
const paymentRepository = require("../repositories/payment.repository");
const subscriptionService = require("./subscription.service");
const paymentProviderFactory = require("./payment/paymentProvider.factory");
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
} = require("../config/pricing.config");
const { PLANS, PLAN_NAMES } = require("../config/plans.config");
const { SUBSCRIPTION_SOURCES } = require("../config/subscriptions.config");
const AppError = require("../utils/appError");
const logger = require("../config/logger");

class PaymentService {
  /**
   * Create a payment order for a company subscription
   * Server determines the authoritative price - client amounts are never trusted.
   */
  async createPaymentOrder({
    companyId,
    plan,
    billingInterval = BILLING_INTERVALS.MONTHLY,
    paymentType = PAYMENT_TYPES.INITIAL_SUBSCRIPTION,
    customLimits = null,
  }) {
    if (!companyId) {
      throw new AppError("Company ID is required", 400);
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new AppError("Company not found", 404);
    }

    if (!PLANS[plan]) {
      throw new AppError(`Invalid plan: ${plan}`, 400);
    }

    if (!isPlanPurchasable(plan, billingInterval)) {
      throw new AppError(
        `Plan ${plan} on ${billingInterval} interval has no commercial checkout price configured. Please contact enterprise sales.`,
        400
      );
    }

    const priceConfig = getPlanPrice(plan, billingInterval);
    const amount = priceConfig.amount; // Integer minor units (paise)
    const currency = priceConfig.currency || "INR";

    // Ensure company has an initialized subscription record
    let currentSubscription = null;
    try {
      currentSubscription = await subscriptionService.ensureCompanySubscription(companyId, plan);
    } catch (err) {
      logger.warn(`[Payment] Could not load current subscription: ${err.message}`);
    }

    const provider = paymentProviderFactory.getProvider();
    const receipt = `rcpt_${companyId.substring(0, 8)}_${Date.now()}`;

    const orderNotes = {
      companyId,
      companyName: company.companyName,
      plan,
      billingInterval,
      paymentType,
    };

    // Create order with payment provider
    const providerOrder = await provider.createOrder({
      amount,
      currency,
      receipt,
      notes: orderNotes,
    });

    // Persist Payment record
    const payment = await paymentRepository.createPayment({
      companyId,
      subscriptionId: currentSubscription ? currentSubscription.id : null,
      provider: PAYMENT_PROVIDERS.RAZORPAY,
      providerOrderId: providerOrder.orderId,
      amount,
      currency,
      status: PAYMENT_STATUSES.CREATED,
      paymentType,
      plan,
      billingInterval,
      metadata: {
        receipt,
        customLimits,
        planDisplayName: PLANS[plan]?.displayName || plan,
        displayAmount: formatPaiseToRupees(amount),
      },
    });

    // Return safe checkout parameters for frontend (NO SECRETS)
    return {
      paymentId: payment.id,
      orderId: providerOrder.orderId,
      amount: providerOrder.amount,
      currency: providerOrder.currency,
      keyId: providerOrder.keyId,
      plan,
      planDisplayName: PLANS[plan]?.displayName || plan,
      billingInterval,
      displayAmount: formatPaiseToRupees(amount),
      companyName: company.companyName,
      companyEmail: company.email,
    };
  }

  /**
   * Cryptographically verify frontend checkout payment and activate subscription
   */
  async verifyAndProcessPayment({
    companyId,
    paymentId,
    orderId,
    providerPaymentId,
    signature,
  }) {
    if (!companyId) {
      throw new AppError("Company context is required", 400);
    }

    if (!orderId || !providerPaymentId || !signature) {
      throw new AppError("Missing required payment verification parameters", 400);
    }

    // Locate payment record
    let payment;
    if (paymentId) {
      payment = await paymentRepository.findPaymentById(paymentId);
    } else {
      payment = await paymentRepository.findPaymentByOrderId(orderId);
    }

    if (!payment) {
      throw new AppError("Payment record not found for this order", 404);
    }

    // Tenant isolation verification
    if (payment.companyId !== companyId) {
      throw new AppError("Unauthorized: Payment does not belong to your company", 403);
    }

    // Idempotent: already captured
    if (payment.status === PAYMENT_STATUSES.CAPTURED) {
      const currentSub = await subscriptionService.getCurrentSubscription(companyId);
      return {
        payment,
        subscription: currentSub,
        alreadyCaptured: true,
      };
    }

    // Cryptographic signature verification
    const provider = paymentProviderFactory.getProvider(payment.provider);
    const isValidSignature = provider.verifyPaymentSignature({
      orderId,
      paymentId: providerPaymentId,
      signature,
    });

    if (!isValidSignature) {
      await paymentRepository.updatePayment(payment, {
        status: PAYMENT_STATUSES.FAILED,
        providerPaymentId,
        failureReason: "Cryptographic payment signature verification failed",
      });
      throw new AppError("Payment verification failed: Invalid signature", 400);
    }

    // Update payment record to CAPTURED
    const now = new Date();
    await paymentRepository.updatePayment(payment, {
      status: PAYMENT_STATUSES.CAPTURED,
      providerPaymentId,
      paidAt: now,
    });

    // Activate subscription and apply plan limits
    const periodDays =
      INTERVAL_DAYS[payment.billingInterval] || INTERVAL_DAYS[BILLING_INTERVALS.MONTHLY];

    const updatedSubscription = await subscriptionService.activateSubscription(companyId, {
      plan: payment.plan,
      periodDays,
      source: SUBSCRIPTION_SOURCES.PAYMENT,
      reason: `Paid subscription via ${payment.provider} (Ref: ${providerPaymentId})`,
    });

    // Link subscription ID if not previously attached
    if (!payment.subscriptionId && updatedSubscription?.id) {
      await paymentRepository.updatePayment(payment, {
        subscriptionId: updatedSubscription.id,
      });
    }

    return {
      payment,
      subscription: updatedSubscription,
      success: true,
    };
  }

  /**
   * Process asynchronous webhook events from payment gateway
   * Enforces raw body HMAC signature verification and event idempotency.
   */
  async processWebhookEvent({ rawBody, signature, eventPayload }) {
    if (!rawBody || !signature) {
      throw new AppError("Missing webhook payload or signature", 400);
    }

    const provider = paymentProviderFactory.getProvider();
    const isValidSignature = provider.verifyWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValidSignature) {
      throw new AppError("Invalid webhook signature", 400);
    }

    const eventId =
      eventPayload.id ||
      eventPayload.event_id ||
      (eventPayload.payload?.payment?.entity?.id
        ? `${eventPayload.event}_${eventPayload.payload.payment.entity.id}`
        : null);

    if (!eventId) {
      throw new AppError("Webhook event has no unique identifier", 400);
    }

    // Idempotency check
    const existingEvent = await paymentRepository.findWebhookEvent(eventId);
    if (existingEvent) {
      return { status: "ALREADY_PROCESSED", eventId };
    }

    const eventType = eventPayload.event || "unknown";
    const paymentEntity = eventPayload.payload?.payment?.entity;
    const orderEntity = eventPayload.payload?.order?.entity;

    const providerOrderId = paymentEntity?.order_id || orderEntity?.id;
    const providerPaymentId = paymentEntity?.id;

    let payment = null;
    if (providerOrderId) {
      payment = await paymentRepository.findPaymentByOrderId(providerOrderId);
    }

    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (payment) {
        if (payment.status !== PAYMENT_STATUSES.CAPTURED) {
          await paymentRepository.updatePayment(payment, {
            status: PAYMENT_STATUSES.CAPTURED,
            providerPaymentId: providerPaymentId || payment.providerPaymentId,
            paidAt: new Date(),
          });

          const periodDays =
            INTERVAL_DAYS[payment.billingInterval] || INTERVAL_DAYS[BILLING_INTERVALS.MONTHLY];

          await subscriptionService.activateSubscription(payment.companyId, {
            plan: payment.plan,
            periodDays,
            source: SUBSCRIPTION_SOURCES.PAYMENT,
            reason: `Webhook confirmed payment (${providerPaymentId})`,
          });
        }
      }
    } else if (eventType === "payment.failed") {
      if (payment && payment.status !== PAYMENT_STATUSES.CAPTURED) {
        await paymentRepository.updatePayment(payment, {
          status: PAYMENT_STATUSES.FAILED,
          providerPaymentId: providerPaymentId || payment.providerPaymentId,
          failureReason:
            paymentEntity?.error_description ||
            paymentEntity?.error_reason ||
            "Payment failed at gateway",
        });
      }
    }

    // Record webhook event for future idempotency
    await paymentRepository.recordWebhookEvent({
      provider: PAYMENT_PROVIDERS.RAZORPAY,
      providerEventId: eventId,
      eventType,
      status: "PROCESSED",
      companyId: payment?.companyId || null,
      paymentId: payment?.id || null,
    });

    return { status: "PROCESSED", eventId, eventType };
  }

  /**
   * Get tenant-scoped payment history
   */
  async getCompanyPaymentHistory(companyId, limit = 50, offset = 0) {
    if (!companyId) {
      throw new AppError("Company ID is required", 400);
    }

    return await paymentRepository.findPaymentsByCompanyId(companyId, limit, offset);
  }

  /**
   * Get tenant-scoped single payment details
   */
  async getPaymentById(paymentId, companyId = null, isSuperAdmin = false) {
    const payment = await paymentRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new AppError("Payment record not found", 404);
    }

    if (!isSuperAdmin && companyId && payment.companyId !== companyId) {
      throw new AppError("Unauthorized access to this payment", 403);
    }

    return payment;
  }

  /**
   * SUPER_ADMIN: Get platform-wide payments with analytics
   */
  async getPlatformPayments({ limit = 50, offset = 0, status, plan, companyId } = {}) {
    return await paymentRepository.findAllPlatformPayments(limit, offset, {
      status,
      plan,
      companyId,
    });
  }

  /**
   * Get public pricing matrix for frontend
   */
  getPricingMatrix() {
    return {
      currency: "INR",
      intervals: BILLING_INTERVALS,
      plans: Object.keys(PLANS).map((planKey) => {
        const plan = PLANS[planKey];
        const monthlyPrice = getPlanPrice(planKey, BILLING_INTERVALS.MONTHLY);
        const yearlyPrice = getPlanPrice(planKey, BILLING_INTERVALS.YEARLY);

        return {
          name: planKey,
          displayName: plan.displayName,
          tagline: plan.tagline,
          limits: plan.limits,
          isPurchasable: isPlanPurchasable(planKey),
          pricing: {
            [BILLING_INTERVALS.MONTHLY]: monthlyPrice
              ? {
                  amount: monthlyPrice.amount,
                  displayAmount: monthlyPrice.displayAmount,
                  formatted: monthlyPrice.formatted,
                }
              : null,
            [BILLING_INTERVALS.YEARLY]: yearlyPrice
              ? {
                  amount: yearlyPrice.amount,
                  displayAmount: yearlyPrice.displayAmount,
                  formatted: yearlyPrice.formatted,
                }
              : null,
          },
        };
      }),
    };
  }
}

module.exports = new PaymentService();
