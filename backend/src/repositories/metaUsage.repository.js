const { MetaUsage } = require("../models");
const { getPeriodBounds } = require("../utils/usagePeriod.util");

class MetaUsageRepository {
  /**
   * Find Meta usage by company and period.
   */
  async findByCompanyAndPeriod(companyId, periodStr) {
    const { period } = getPeriodBounds(periodStr);
    return await MetaUsage.findOne({
      where: {
        companyId,
        period,
      },
    });
  }

  /**
   * Find Meta usage history for a company.
   */
  async findHistoryByCompany(companyId, limit = 12) {
    return await MetaUsage.findAll({
      where: { companyId },
      order: [["period", "DESC"]],
      limit: Math.min(Math.max(parseInt(limit, 10) || 12, 1), 60),
    });
  }

  /**
   * Upsert Meta usage record.
   */
  async upsert(companyId, wabaId, data) {
    const { period, periodStart, periodEnd } = getPeriodBounds(data.period);

    const existing = await MetaUsage.findOne({
      where: {
        companyId,
        wabaId,
        period,
      },
    });

    const payload = {
      companyId,
      wabaId,
      period,
      periodStart,
      periodEnd,
      currency: data.currency ?? null,
      amount: data.amount ?? null,
      marketingConversations: data.marketingConversations ?? 0,
      utilityConversations: data.utilityConversations ?? 0,
      authenticationConversations: data.authenticationConversations ?? 0,
      serviceConversations: data.serviceConversations ?? 0,
      totalConversations: data.totalConversations ?? 0,
      status: data.status || "SYNCED",
      source: data.source || "META_GRAPH_API",
      syncedAt: data.syncedAt || new Date(),
      rawMetadata: data.rawMetadata ?? null,
    };

    if (existing) {
      return await existing.update(payload);
    }

    return await MetaUsage.create(payload);
  }

  /**
   * Get platform aggregate Meta usage across all companies.
   */
  async getPlatformAggregate(periodStr) {
    const { period } = getPeriodBounds(periodStr);

    const result = await MetaUsage.findAll({
      where: { period },
      attributes: [
        [MetaUsage.sequelize.fn("COALESCE", MetaUsage.sequelize.fn("SUM", MetaUsage.sequelize.col("marketing_conversations")), 0), "marketingConversations"],
        [MetaUsage.sequelize.fn("COALESCE", MetaUsage.sequelize.fn("SUM", MetaUsage.sequelize.col("utility_conversations")), 0), "utilityConversations"],
        [MetaUsage.sequelize.fn("COALESCE", MetaUsage.sequelize.fn("SUM", MetaUsage.sequelize.col("authentication_conversations")), 0), "authenticationConversations"],
        [MetaUsage.sequelize.fn("COALESCE", MetaUsage.sequelize.fn("SUM", MetaUsage.sequelize.col("service_conversations")), 0), "serviceConversations"],
        [MetaUsage.sequelize.fn("COALESCE", MetaUsage.sequelize.fn("SUM", MetaUsage.sequelize.col("total_conversations")), 0), "totalConversations"],
        [MetaUsage.sequelize.fn("COALESCE", MetaUsage.sequelize.fn("SUM", MetaUsage.sequelize.col("amount")), 0), "totalAmount"],
        [MetaUsage.sequelize.fn("COUNT", MetaUsage.sequelize.col("id")), "syncedCount"],
      ],
      raw: true,
    });

    const row = result[0] || {};
    return {
      period,
      marketingConversations: Number(row.marketingConversations || 0),
      utilityConversations: Number(row.utilityConversations || 0),
      authenticationConversations: Number(row.authenticationConversations || 0),
      serviceConversations: Number(row.serviceConversations || 0),
      totalConversations: Number(row.totalConversations || 0),
      totalAmount: row.totalAmount !== null ? Number(row.totalAmount) : null,
      syncedCompaniesCount: Number(row.syncedCount || 0),
    };
  }
}

module.exports = new MetaUsageRepository();
