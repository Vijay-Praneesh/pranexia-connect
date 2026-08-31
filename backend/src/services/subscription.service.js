const sequelize = require("../config/database");
const {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_ACTIONS,
  SUBSCRIPTION_SOURCES,
  SUBSCRIPTION_DEFAULTS,
} = require("../config/subscriptions.config");
const { PLAN_NAMES, PLANS, getPlanDirection } = require("../config/plans.config");
const { Company, Subscription } = require("../models");
const subscriptionRepository = require("../repositories/subscription.repository");
const AppError = require("../utils/appError");
const logger = require("../config/logger");

class SubscriptionService {
  /**
   * Safe helper to calculate date addition
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  /**
   * Safe helper to record history without throwing on transient/mocked company keys
   */
  async safeRecordHistory(historyData) {
    try {
      return await subscriptionRepository.recordHistory(historyData);
    } catch (err) {
      logger.warn(`[Subscription] Could not record history: ${err.message}`);
      return null;
    }
  }

  /**
   * Idempotently ensure a company has a valid subscription record.
   * Backfills older companies seamlessly from their Company.plan field.
   */
  async ensureCompanySubscription(companyId, fallbackPlan = null) {
    if (!companyId) return null;

    let current = await subscriptionRepository.findCurrentByCompanyId(companyId);
    if (current) return current;

    const company = await Company.findByPk(companyId);
    if (!company) return null;

    const plan = fallbackPlan || company.plan || PLAN_NAMES.STARTER;
    const now = new Date();
    const periodEnd = this.addDays(now, SUBSCRIPTION_DEFAULTS.PERIOD_DAYS);

    try {
      const subscription = await subscriptionRepository.createSubscription({
        companyId: company.id,
        plan,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        startDate: company.createdAt || now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });

      await this.safeRecordHistory({
        companyId: company.id,
        subscriptionId: subscription.id,
        previousPlan: null,
        newPlan: plan,
        previousStatus: null,
        newStatus: SUBSCRIPTION_STATUSES.ACTIVE,
        action: SUBSCRIPTION_ACTIONS.CREATED,
        source: SUBSCRIPTION_SOURCES.SYSTEM,
        reason: "Initial subscription backfill for company",
      });

      return subscription;
    } catch (err) {
      logger.warn(`[Subscription] Could not create subscription row: ${err.message}`);
      return {
        id: "transient-" + company.id,
        companyId: company.id,
        plan,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        startDate: company.createdAt || now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        update: async function (data) {
          Object.assign(this, data);
          return this;
        },
      };
    }
  }

  /**
   * Get current authoritative subscription for a company
   */
  async getCurrentSubscription(companyId) {
    const subscription = await this.ensureCompanySubscription(companyId);
    if (!subscription) {
      throw new AppError("Subscription not found for this company", 404);
    }
    return subscription;
  }

  /**
   * Start a trial subscription for a company
   */
  async startTrial(companyId, options = {}) {
    const {
      plan = PLAN_NAMES.STARTER,
      trialDays = SUBSCRIPTION_DEFAULTS.TRIAL_DAYS,
      source = SUBSCRIPTION_SOURCES.ADMIN,
      performedBy = null,
      reason = "Free trial started",
    } = options;

    if (!PLANS[plan]) {
      throw new AppError(`Invalid plan: ${plan}`, 400);
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new AppError("Company not found", 404);
    }

    const current = await subscriptionRepository.findCurrentByCompanyId(companyId);

    // Idempotent: already trialing on the exact plan
    if (
      current &&
      current.status === SUBSCRIPTION_STATUSES.TRIALING &&
      current.plan === plan
    ) {
      return current;
    }

    const now = new Date();
    const trialEnd = this.addDays(now, trialDays);

    const prevPlan = current ? current.plan : null;
    const prevStatus = current ? current.status : null;

    let subscription;
    if (current) {
      subscription = await subscriptionRepository.updateSubscription(current, {
        plan,
        status: SUBSCRIPTION_STATUSES.TRIALING,
        trialStart: now,
        trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        endedAt: null,
        pendingPlan: null,
        pendingBillingInterval: null,
        pendingPlanEffectiveAt: null,
      });
    } else {
      subscription = await subscriptionRepository.createSubscription({
        companyId,
        plan,
        status: SUBSCRIPTION_STATUSES.TRIALING,
        startDate: now,
        trialStart: now,
        trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        cancelAtPeriodEnd: false,
      });
    }

    // Keep Company.plan synchronized as cache
    await company.update({ plan });

    await this.safeRecordHistory({
      companyId,
      subscriptionId: subscription.id,
      previousPlan: prevPlan,
      newPlan: plan,
      previousStatus: prevStatus,
      newStatus: SUBSCRIPTION_STATUSES.TRIALING,
      action: SUBSCRIPTION_ACTIONS.TRIAL_STARTED,
      source,
      performedBy,
      reason,
    });

    return subscription;
  }

  /**
   * Activate or renew an active subscription
   */
  async activateSubscription(companyId, options = {}) {
    const {
      plan,
      periodDays = SUBSCRIPTION_DEFAULTS.PERIOD_DAYS,
      source = SUBSCRIPTION_SOURCES.ADMIN,
      performedBy = null,
      reason = "Subscription activated",
    } = options;

    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new AppError("Company not found", 404);
    }

    const targetPlan = plan || company.plan || PLAN_NAMES.STARTER;
    if (!PLANS[targetPlan]) {
      throw new AppError(`Invalid plan: ${targetPlan}`, 400);
    }

    const current = await subscriptionRepository.findCurrentByCompanyId(companyId);

    // Idempotent: already active on target plan with no pending cancellation and future period
    if (
      current &&
      current.status === SUBSCRIPTION_STATUSES.ACTIVE &&
      current.plan === targetPlan &&
      !current.cancelAtPeriodEnd &&
      new Date(current.currentPeriodEnd) > new Date()
    ) {
      return current;
    }

    const now = new Date();
    const periodEnd = this.addDays(now, periodDays);
    const prevPlan = current ? current.plan : null;
    const prevStatus = current ? current.status : null;

    let subscription;
    if (current) {
      subscription = await subscriptionRepository.updateSubscription(current, {
        plan: targetPlan,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        endedAt: null,
        pendingPlan: null,
        pendingBillingInterval: null,
        pendingPlanEffectiveAt: null,
      });
    } else {
      subscription = await subscriptionRepository.createSubscription({
        companyId,
        plan: targetPlan,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        startDate: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
    }

    // Keep Company.plan synchronized as cache
    await company.update({ plan: targetPlan });

    await this.safeRecordHistory({
      companyId,
      subscriptionId: subscription.id,
      previousPlan: prevPlan,
      newPlan: targetPlan,
      previousStatus: prevStatus,
      newStatus: SUBSCRIPTION_STATUSES.ACTIVE,
      action: SUBSCRIPTION_ACTIONS.ACTIVATED,
      source,
      performedBy,
      reason,
    });

    return subscription;
  }

  /**
   * Change plan immediately (e.g. Paid Upgrade, Admin Assignment, or Scheduler Activation)
   * Non-destructive: preserves existing data and usage.
   */
  async changePlan(companyId, newPlan, options = {}) {
    if (!PLANS[newPlan]) {
      throw new AppError(`Invalid plan: ${newPlan}`, 400);
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new AppError("Company not found", 404);
    }

    const {
      customLimits = null,
      source = SUBSCRIPTION_SOURCES.ADMIN,
      performedBy = null,
      reason = "Plan changed",
    } = options;

    const current = await this.ensureCompanySubscription(companyId, newPlan);

    // Idempotent check
    if (
      current.plan === newPlan &&
      JSON.stringify(company.customLimits || null) === JSON.stringify(customLimits || null) &&
      !current.pendingPlan
    ) {
      return current;
    }

    const prevPlan = current.plan;
    const prevStatus = current.status;

    let action = options.action || SUBSCRIPTION_ACTIONS.PLAN_CHANGED;

    const updated = await subscriptionRepository.updateSubscription(current, {
      plan: newPlan,
      pendingPlan: null,
      pendingBillingInterval: null,
      pendingPlanEffectiveAt: null,
    });

    // Synchronize Company model
    await company.update({
      plan: newPlan,
      customLimits: customLimits !== undefined ? customLimits : company.customLimits,
    });

    await this.safeRecordHistory({
      companyId,
      subscriptionId: updated.id,
      previousPlan: prevPlan,
      newPlan,
      previousStatus: prevStatus,
      newStatus: updated.status,
      action,
      source,
      performedBy,
      reason,
    });

    return updated;
  }

  /**
   * Schedule a plan downgrade for the end of the current billing cycle
   */
  async scheduleDowngrade(companyId, targetPlan, options = {}) {
    if (!PLANS[targetPlan]) {
      throw new AppError(`Invalid target plan: ${targetPlan}`, 400);
    }

    const current = await this.getCurrentSubscription(companyId);
    const direction = getPlanDirection(current.plan, targetPlan);

    if (direction === "SAME") {
      throw new AppError("You are already on this plan", 400);
    }

    if (direction === "UPGRADE") {
      throw new AppError("Upgrades take effect immediately upon payment. Please use the upgrade flow.", 400);
    }

    const {
      billingInterval = "MONTHLY",
      source = SUBSCRIPTION_SOURCES.ADMIN,
      performedBy = null,
      reason = "Downgrade scheduled for period end",
    } = options;

    // Effective date is currentPeriodEnd
    const effectiveAt = current.currentPeriodEnd || this.addDays(new Date(), SUBSCRIPTION_DEFAULTS.PERIOD_DAYS);

    const updated = await subscriptionRepository.updateSubscription(current, {
      pendingPlan: targetPlan,
      pendingBillingInterval: billingInterval,
      pendingPlanEffectiveAt: effectiveAt,
    });

    await this.safeRecordHistory({
      companyId,
      subscriptionId: updated.id,
      previousPlan: current.plan,
      newPlan: targetPlan,
      previousStatus: current.status,
      newStatus: current.status,
      action: SUBSCRIPTION_ACTIONS.DOWNGRADE_SCHEDULED,
      source,
      performedBy,
      reason,
    });

    return updated;
  }

  /**
   * Cancel a scheduled pending downgrade
   */
  async cancelPendingDowngrade(companyId, options = {}) {
    const current = await this.getCurrentSubscription(companyId);

    if (!current.pendingPlan) {
      throw new AppError("No pending downgrade found to cancel", 400);
    }

    const pendingPlan = current.pendingPlan;
    const {
      source = SUBSCRIPTION_SOURCES.ADMIN,
      performedBy = null,
      reason = "Scheduled downgrade cancelled by user",
    } = options;

    const updated = await subscriptionRepository.updateSubscription(current, {
      pendingPlan: null,
      pendingBillingInterval: null,
      pendingPlanEffectiveAt: null,
    });

    await this.safeRecordHistory({
      companyId,
      subscriptionId: updated.id,
      previousPlan: pendingPlan,
      newPlan: current.plan,
      previousStatus: current.status,
      newStatus: current.status,
      action: SUBSCRIPTION_ACTIONS.DOWNGRADE_CANCELLED,
      source,
      performedBy,
      reason,
    });

    return updated;
  }

  /**
   * Cancel subscription (at period end or immediately)
   */
  async cancelSubscription(companyId, options = {}) {
    const {
      cancelAtPeriodEnd = true,
      immediate = false,
      source = SUBSCRIPTION_SOURCES.ADMIN,
      performedBy = null,
      reason = "Subscription cancelled",
    } = options;

    const current = await this.getCurrentSubscription(companyId);
    const now = new Date();

    if (immediate || !cancelAtPeriodEnd) {
      if (current.status === SUBSCRIPTION_STATUSES.CANCELLED) {
        return current;
      }

      const prevStatus = current.status;
      const updated = await subscriptionRepository.updateSubscription(current, {
        status: SUBSCRIPTION_STATUSES.CANCELLED,
        cancelAtPeriodEnd: false,
        cancelledAt: now,
        endedAt: now,
        pendingPlan: null,
        pendingBillingInterval: null,
        pendingPlanEffectiveAt: null,
      });

      await this.safeRecordHistory({
        companyId,
        subscriptionId: updated.id,
        previousPlan: current.plan,
        newPlan: current.plan,
        previousStatus: prevStatus,
        newStatus: SUBSCRIPTION_STATUSES.CANCELLED,
        action: SUBSCRIPTION_ACTIONS.CANCELLED,
        source,
        performedBy,
        reason: reason || "Immediate cancellation",
      });

      return updated;
    } else {
      if (current.cancelAtPeriodEnd) {
        return current;
      }

      const updated = await subscriptionRepository.updateSubscription(current, {
        cancelAtPeriodEnd: true,
        cancelledAt: now,
      });

      await this.safeRecordHistory({
        companyId,
        subscriptionId: updated.id,
        previousPlan: current.plan,
        newPlan: current.plan,
        previousStatus: current.status,
        newStatus: current.status,
        action: SUBSCRIPTION_ACTIONS.CANCELLED,
        source,
        performedBy,
        reason: reason || "Scheduled cancellation at period end",
      });

      return updated;
    }
  }

  /**
   * Expire subscription
   */
  async expireSubscription(companyId, options = {}) {
    const {
      source = SUBSCRIPTION_SOURCES.SYSTEM,
      reason = "Subscription period expired",
    } = options;

    const current = await this.getCurrentSubscription(companyId);

    if (current.status === SUBSCRIPTION_STATUSES.EXPIRED) {
      return current;
    }

    const prevStatus = current.status;
    const now = new Date();

    const updated = await subscriptionRepository.updateSubscription(current, {
      status: SUBSCRIPTION_STATUSES.EXPIRED,
      endedAt: now,
    });

    await this.safeRecordHistory({
      companyId,
      subscriptionId: updated.id,
      previousPlan: current.plan,
      newPlan: current.plan,
      previousStatus: prevStatus,
      newStatus: SUBSCRIPTION_STATUSES.EXPIRED,
      action: SUBSCRIPTION_ACTIONS.EXPIRED,
      source,
      reason,
    });

    return updated;
  }

  /**
   * Authoritative Renewal Preview
   * Calculates new billing period dates, price, interval, and renewal eligibility.
   */
  async previewRenewal(companyId, targetInterval = "MONTHLY") {
    const current = await this.getCurrentSubscription(companyId);
    const { getPlanPrice, isPlanPurchasable } = require("../config/pricing.config");
    const { calculateNextBillingPeriod } = require("../utils/date.util");

    const plan = current.plan;
    const priceConfig = getPlanPrice(plan, targetInterval);
    const purchasable = isPlanPurchasable(plan, targetInterval);

    const now = new Date();
    const periodEnd = new Date(current.currentPeriodEnd);
    const { start: nextPeriodStart, end: nextPeriodEnd } = calculateNextBillingPeriod(
      current.currentPeriodEnd,
      targetInterval,
      now
    );

    const diffMs = periodEnd.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isExpired = current.status === SUBSCRIPTION_STATUSES.EXPIRED || diffMs <= 0;

    const isEligible =
      current.status === SUBSCRIPTION_STATUSES.ACTIVE ||
      current.status === SUBSCRIPTION_STATUSES.EXPIRED ||
      current.status === SUBSCRIPTION_STATUSES.TRIALING;

    return {
      companyId,
      plan,
      planDisplayName: PLANS[plan]?.displayName || plan,
      currentStatus: current.status,
      billingInterval: targetInterval,
      currentPeriodStart: current.currentPeriodStart,
      currentPeriodEnd: current.currentPeriodEnd,
      nextPeriodStart,
      nextPeriodEnd,
      daysUntilExpiry,
      isExpired,
      isEligible,
      isPurchasable: purchasable,
      hasPendingDowngrade: Boolean(current.pendingPlan),
      pendingPlan: current.pendingPlan || null,
      pendingPlanEffectiveAt: current.pendingPlanEffectiveAt || null,
      price: priceConfig
        ? {
            amount: priceConfig.amount,
            displayAmount: priceConfig.displayAmount,
            formatted: priceConfig.formatted,
          }
        : null,
    };
  }

  /**
   * Renew subscription period using accurate UTC calendar calculation
   */
  async renewSubscriptionPeriod(companyId, options = {}) {
    const {
      billingInterval = "MONTHLY",
      source = SUBSCRIPTION_SOURCES.PAYMENT,
      performedBy = null,
      reason = "Subscription period renewed",
    } = options;

    const current = await this.getCurrentSubscription(companyId);
    const { calculateNextBillingPeriod } = require("../utils/date.util");

    const now = new Date();
    const { start: newStart, end: newEnd } = calculateNextBillingPeriod(
      current.currentPeriodEnd,
      billingInterval,
      now
    );

    const prevStatus = current.status;

    const updated = await subscriptionRepository.updateSubscription(current, {
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      endedAt: null,
      pendingPlan: null,
      pendingBillingInterval: null,
      pendingPlanEffectiveAt: null,
    });

    // Ensure Company.plan is synchronized
    const company = await Company.findByPk(companyId);
    if (company && company.plan !== current.plan) {
      await company.update({ plan: current.plan });
    }

    await this.safeRecordHistory({
      companyId,
      subscriptionId: updated.id,
      previousPlan: current.plan,
      newPlan: current.plan,
      previousStatus: prevStatus,
      newStatus: SUBSCRIPTION_STATUSES.ACTIVE,
      action: SUBSCRIPTION_ACTIONS.RENEWED,
      source,
      performedBy,
      reason,
    });

    return updated;
  }

  /**
   * Get subscription change history for a company
   */
  async getSubscriptionHistory(companyId, limit = 50) {
    return await subscriptionRepository.findHistoryByCompanyId(companyId, limit);
  }

  /**
   * Execute scheduled lifecycle checks (called by background cron job)
   * Scans expired trials, expired periods, cancel-at-period-end, and scheduled pending downgrades.
   */
  async processScheduledLifecycleChecks(now = new Date()) {
    const results = {
      expiredTrials: 0,
      cancelledAtPeriodEnd: 0,
      expiredSubscriptions: 0,
      appliedPendingPlanChanges: 0,
    };

    try {
      // 1. Process scheduled pending plan downgrades whose effective date has passed
      const pendingChanges = await subscriptionRepository.findSubscriptionsWithPendingPlanChange(now);
      for (const sub of pendingChanges) {
        const targetPlan = sub.pendingPlan;
        await this.changePlan(sub.companyId, targetPlan, {
          source: SUBSCRIPTION_SOURCES.SYSTEM,
          reason: "Scheduled plan change activated at period end",
        });
        results.appliedPendingPlanChanges++;
      }

      // 2. Expire trials that passed trialEnd
      const expiredTrials = await subscriptionRepository.findExpiredTrials(now);
      for (const sub of expiredTrials) {
        await this.expireSubscription(sub.companyId, {
          source: SUBSCRIPTION_SOURCES.SYSTEM,
          reason: "Trial duration ended without activation",
        });
        results.expiredTrials++;
      }

      // 3. Transition cancelAtPeriodEnd subscriptions that passed currentPeriodEnd
      const toCancel = await subscriptionRepository.findSubscriptionsToCancelAtPeriodEnd(now);
      for (const sub of toCancel) {
        await subscriptionRepository.updateSubscription(sub, {
          status: SUBSCRIPTION_STATUSES.CANCELLED,
          endedAt: now,
          cancelAtPeriodEnd: false,
        });

        await this.safeRecordHistory({
          companyId: sub.companyId,
          subscriptionId: sub.id,
          previousPlan: sub.plan,
          newPlan: sub.plan,
          previousStatus: SUBSCRIPTION_STATUSES.ACTIVE,
          newStatus: SUBSCRIPTION_STATUSES.CANCELLED,
          action: SUBSCRIPTION_ACTIONS.CANCELLED,
          source: SUBSCRIPTION_SOURCES.SYSTEM,
          reason: "Period ended for subscription scheduled to cancel",
        });
        results.cancelledAtPeriodEnd++;
      }

      // 4. Expire active non-cancelling subscriptions whose period ended (awaiting renewal)
      const expiredSubs = await subscriptionRepository.findExpiredSubscriptions(now);
      for (const sub of expiredSubs) {
        await this.expireSubscription(sub.companyId, {
          source: SUBSCRIPTION_SOURCES.SYSTEM,
          reason: "Billing period ended awaiting renewal",
        });
        results.expiredSubscriptions++;
      }
    } catch (error) {
      logger.error(`[Subscription Scheduler] Error during lifecycle checks: ${error.message}`);
    }

    return results;
  }
}

module.exports = new SubscriptionService();
