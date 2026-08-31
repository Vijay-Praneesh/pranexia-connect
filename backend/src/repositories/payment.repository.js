const { Op } = require("sequelize");
const { Payment, PaymentWebhookEvent, Company, Subscription } = require("../models");

class PaymentRepository {
  /**
   * Create a new payment record
   */
  async createPayment(data, options = {}) {
    return await Payment.create(data, {
      transaction: options.transaction,
    });
  }

  /**
   * Find payment by primary key ID
   */
  async findPaymentById(id, options = {}) {
    return await Payment.findByPk(id, {
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "companyName", "email", "plan"],
        },
        {
          model: Subscription,
          as: "subscription",
        },
      ],
      transaction: options.transaction,
    });
  }

  /**
   * Find payment by provider order ID
   */
  async findPaymentByOrderId(providerOrderId, options = {}) {
    return await Payment.findOne({
      where: { providerOrderId },
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "companyName", "email", "plan"],
        },
      ],
      transaction: options.transaction,
    });
  }

  /**
   * Find payment by provider payment ID
   */
  async findPaymentByProviderPaymentId(providerPaymentId, options = {}) {
    return await Payment.findOne({
      where: { providerPaymentId },
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "companyName", "email", "plan"],
        },
      ],
      transaction: options.transaction,
    });
  }

  /**
   * Find payments for a specific tenant company
   */
  async findPaymentsByCompanyId(companyId, limit = 50, offset = 0) {
    return await Payment.findAndCountAll({
      where: { companyId },
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
  }

  /**
   * Update payment record
   */
  async updatePayment(payment, data, options = {}) {
    return await payment.update(data, {
      transaction: options.transaction,
    });
  }

  /**
   * Record webhook event for idempotency
   */
  async recordWebhookEvent(data, options = {}) {
    return await PaymentWebhookEvent.create(data, {
      transaction: options.transaction,
    });
  }

  /**
   * Find webhook event by provider event ID
   */
  async findWebhookEvent(providerEventId, options = {}) {
    return await PaymentWebhookEvent.findOne({
      where: { providerEventId },
      transaction: options.transaction,
    });
  }

  /**
   * SUPER_ADMIN: Find platform-wide payments with optional status/plan filtering
   */
  async findAllPlatformPayments(limit = 50, offset = 0, filter = {}) {
    const where = {};
    if (filter.status) where.status = filter.status;
    if (filter.plan) where.plan = filter.plan;
    if (filter.companyId) where.companyId = filter.companyId;

    return await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "companyName", "email", "plan"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
  }
}

module.exports = new PaymentRepository();
