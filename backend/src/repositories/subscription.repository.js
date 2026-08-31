const { Op } = require("sequelize");
const { Subscription, SubscriptionHistory, Company } = require("../models");
const { SUBSCRIPTION_STATUSES } = require("../config/subscriptions.config");

class SubscriptionRepository {
  /**
   * Find current authoritative subscription for a company
   */
  async findCurrentByCompanyId(companyId, options = {}) {
    if (!companyId) return null;

    // Prioritize active, trialing, or past_due subscriptions first
    const activeSub = await Subscription.findOne({
      where: {
        companyId,
        status: {
          [Op.in]: [
            SUBSCRIPTION_STATUSES.ACTIVE,
            SUBSCRIPTION_STATUSES.TRIALING,
            SUBSCRIPTION_STATUSES.PAST_DUE,
          ],
        },
      },
      order: [["created_at", "DESC"]],
      transaction: options.transaction,
    });

    if (activeSub) return activeSub;

    // Fall back to most recent subscription (e.g. CANCELLED or EXPIRED)
    return await Subscription.findOne({
      where: { companyId },
      order: [["created_at", "DESC"]],
      transaction: options.transaction,
    });
  }

  /**
   * Find all active/trialing subscriptions for a company
   */
  async findAllActiveByCompanyId(companyId, options = {}) {
    return await Subscription.findAll({
      where: {
        companyId,
        status: {
          [Op.in]: [
            SUBSCRIPTION_STATUSES.ACTIVE,
            SUBSCRIPTION_STATUSES.TRIALING,
            SUBSCRIPTION_STATUSES.PAST_DUE,
          ],
        },
      },
      order: [["created_at", "DESC"]],
      transaction: options.transaction,
    });
  }

  /**
   * Find subscription by ID
   */
  async findById(id, options = {}) {
    return await Subscription.findByPk(id, {
      transaction: options.transaction,
    });
  }

  /**
   * Create a new subscription
   */
  async createSubscription(data, options = {}) {
    return await Subscription.create(data, {
      transaction: options.transaction,
    });
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(subscription, data, options = {}) {
    return await subscription.update(data, {
      transaction: options.transaction,
    });
  }

  /**
   * Record history event
   */
  async recordHistory(data, options = {}) {
    return await SubscriptionHistory.create(data, {
      transaction: options.transaction,
    });
  }

  /**
   * Get subscription history for a company
   */
  async findHistoryByCompanyId(companyId, limit = 50) {
    return await SubscriptionHistory.findAll({
      where: { companyId },
      order: [["created_at", "DESC"]],
      limit,
    });
  }

  /**
   * Find active subscriptions whose currentPeriodEnd is in the past
   */
  async findExpiredSubscriptions(now = new Date()) {
    return await Subscription.findAll({
      where: {
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: {
          [Op.lt]: now,
        },
      },
      limit: 100,
    });
  }

  /**
   * Find trialing subscriptions whose trialEnd is in the past
   */
  async findExpiredTrials(now = new Date()) {
    return await Subscription.findAll({
      where: {
        status: SUBSCRIPTION_STATUSES.TRIALING,
        trialEnd: {
          [Op.lt]: now,
        },
      },
      limit: 100,
    });
  }

  /**
   * Find active subscriptions marked to cancel at period end that have passed their period
   */
  async findSubscriptionsToCancelAtPeriodEnd(now = new Date()) {
    return await Subscription.findAll({
      where: {
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: {
          [Op.lte]: now,
        },
      },
      limit: 100,
    });
  }
}

module.exports = new SubscriptionRepository();
