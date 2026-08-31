const sequelize = require("../config/database");
const {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_ACTIONS,
  SUBSCRIPTION_SOURCES,
  SUBSCRIPTION_DEFAULTS,
} = require("../config/subscriptions.config");
const { PLAN_NAMES, PLANS } = require("../config/plans.config");
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
   * Change plan for an active/trialing subscription (Upgrade or Downgrade)
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

    // Idempotent: same plan and same custom limits
    if (
      current.plan === newPlan &&
      JSON.stringify(company.customLimits || null) === JSON.stringify(customLimits || null)
    ) {
      return current;
    }

    const prevPlan = current.plan;
    const prevStatus = current.status;

    const updated = await subscriptionRepository.updateSubscription(current, {
      plan: newPlan,
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
      action: SUBSCRIPTION_ACTIONS.PLAN_CHANGED,
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

    // Idempotent check
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
      // Cancel at period end
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
   * Renew subscription period
   */
  async renewSubscriptionPeriod(companyId, options = {}) {
    const {
      periodDays = SUBSCRIPTION_DEFAULTS.PERIOD_DAYS,
      source = SUBSCRIPTION_SOURCES.SYSTEM,
    } = options;

    const current = await this.getCurrentSubscription(companyId);
    const now = new Date();
    const currentEnd = new Date(current.currentPeriodEnd);
    const newStart = currentEnd > now ? currentEnd : now;
    const newEnd = this.addDays(newStart, periodDays);

    const updated = await subscriptionRepository.updateSubscription(current, {
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      cancelAtPeriodEnd: false,
    });

    await this.safeRecordHistory({
      companyId,
      subscriptionId: updated.id,
      previousPlan: current.plan,
      newPlan: current.plan,
      previousStatus: current.status,
      newStatus: SUBSCRIPTION_STATUSES.ACTIVE,
      action: SUBSCRIPTION_ACTIONS.RENEWED,
      source,
      reason: "Subscription period renewed",
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
   * Scans expired trials, expired periods, and cancel-at-period-end subscriptions.
   */
  async processScheduledLifecycleChecks(now = new Date()) {
    const results = {
      expiredTrials: 0,
      cancelledAtPeriodEnd: 0,
      expiredSubscriptions: 0,
    };

    try {
      // 1. Expire trials that passed trialEnd
      const expiredTrials = await subscriptionRepository.findExpiredTrials(now);
      for (const sub of expiredTrials) {
        await this.expireSubscription(sub.companyId, {
          source: SUBSCRIPTION_SOURCES.SYSTEM,
          reason: "Trial duration ended without activation",
        });
        results.expiredTrials++;
      }

      // 2. Transition cancelAtPeriodEnd subscriptions that passed currentPeriodEnd
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

      // 3. Expire active non-cancelling subscriptions whose period ended (awaiting renewal / payment in Module #13)
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
