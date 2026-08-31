const { Op } = require("sequelize");
const {
  Usage,
  UsageEvent,
  Media,
  Campaign,
  CampaignRecipient,
  WhatsAppConnection,
  Company,
} = require("../models");
const { getPeriodBounds } = require("../utils/usagePeriod.util");

class UsageRepository {
  /**
   * Get or create a monthly Usage record for a company.
   */
  async findOrCreateUsage(companyId, periodStr, transaction = null) {
    const { period, periodStart, periodEnd } = getPeriodBounds(periodStr);

    const [usage] = await Usage.findOrCreate({
      where: {
        companyId,
        period,
      },
      defaults: {
        companyId,
        period,
        periodStart,
        periodEnd,
        messagesSent: 0,
        messagesDelivered: 0,
        messagesRead: 0,
        messagesFailed: 0,
        campaignsCreated: 0,
        campaignsCompleted: 0,
        mediaUploadedCount: 0,
        mediaUploadedBytes: 0,
        templatesUsed: 0,
      },
      transaction,
    });

    return usage;
  }

  /**
   * Try to record an idempotent usage event.
   * Returns { isNew: true, event } if created, or { isNew: false, event: existing } if duplicate.
   */
  async recordIdempotentEvent(
    companyId,
    { eventType, eventKey, period: periodStr, quantity = 1, metadata = null },
    transaction = null
  ) {
    const { period } = getPeriodBounds(periodStr);

    try {
      const event = await UsageEvent.create(
        {
          companyId,
          eventType,
          eventKey,
          period,
          quantity,
          metadata,
        },
        { transaction }
      );
      return { isNew: true, event };
    } catch (error) {
      if (
        error.name === "SequelizeUniqueConstraintError" ||
        error.original?.code === "ER_DUP_ENTRY"
      ) {
        const existing = await UsageEvent.findOne({
          where: { companyId, eventKey },
          transaction,
        });
        return { isNew: false, event: existing };
      }
      throw error;
    }
  }

  /**
   * Atomically increment one or more usage metrics for a company period.
   */
  async incrementUsageMetrics(companyId, periodStr, increments, transaction = null) {
    const usage = await this.findOrCreateUsage(companyId, periodStr, transaction);
    await usage.increment(increments, { transaction });
    return await usage.reload({ transaction });
  }

  /**
   * Find monthly usage by company and period.
   */
  async findByCompanyAndPeriod(companyId, periodStr) {
    const { period } = getPeriodBounds(periodStr);
    return await Usage.findOne({
      where: {
        companyId,
        period,
      },
    });
  }

  /**
   * Find usage history for a company.
   */
  async findHistoryByCompany(companyId, limit = 12) {
    return await Usage.findAll({
      where: { companyId },
      order: [["period", "DESC"]],
      limit: Math.min(Math.max(parseInt(limit, 10) || 12, 1), 60),
    });
  }

  /**
   * Calculate current live active media storage stats for a company.
   */
  async getActiveMediaStats(companyId) {
    const activeMedia = await Media.findAll({
      where: {
        companyId,
        status: "READY",
      },
      attributes: [
        [Media.sequelize.fn("COUNT", Media.sequelize.col("id")), "fileCount"],
        [Media.sequelize.fn("COALESCE", Media.sequelize.fn("SUM", Media.sequelize.col("size")), 0), "totalBytes"],
      ],
      raw: true,
    });

    const row = activeMedia[0] || {};
    return {
      activeFileCount: Number(row.fileCount || 0),
      activeStorageBytes: Number(row.totalBytes || 0),
    };
  }

  /**
   * Get platform aggregate usage metrics across all companies for owner dashboard.
   */
  async getPlatformAggregateUsage(periodStr) {
    const { period, periodStart, periodEnd } = getPeriodBounds(periodStr);

    const [
      periodUsageSum,
      allTimeUsageSum,
      totalActiveConnections,
      activeMediaAggregate,
      totalCompanies,
      totalCampaigns,
      totalRecipients,
    ] = await Promise.all([
      // Aggregates for requested period
      Usage.findAll({
        where: { period },
        attributes: [
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("messages_sent")), 0), "messagesSent"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("messages_delivered")), 0), "messagesDelivered"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("messages_read")), 0), "messagesRead"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("messages_failed")), 0), "messagesFailed"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("campaigns_created")), 0), "campaignsCreated"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("campaigns_completed")), 0), "campaignsCompleted"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("media_uploaded_count")), 0), "mediaUploadedCount"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("media_uploaded_bytes")), 0), "mediaUploadedBytes"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("templates_used")), 0), "templatesUsed"],
        ],
        raw: true,
      }),

      // All-time aggregates across usages
      Usage.findAll({
        attributes: [
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("messages_sent")), 0), "messagesSent"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("messages_delivered")), 0), "messagesDelivered"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("messages_read")), 0), "messagesRead"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("messages_failed")), 0), "messagesFailed"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("campaigns_created")), 0), "campaignsCreated"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("campaigns_completed")), 0), "campaignsCompleted"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("media_uploaded_count")), 0), "mediaUploadedCount"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("media_uploaded_bytes")), 0), "mediaUploadedBytes"],
          [Usage.sequelize.fn("COALESCE", Usage.sequelize.fn("SUM", Usage.sequelize.col("templates_used")), 0), "templatesUsed"],
        ],
        raw: true,
      }),

      // Total active WhatsApp connections
      WhatsAppConnection.count({ where: { status: "CONNECTED" } }),

      // Total active media across platform
      Media.findAll({
        where: { status: "READY" },
        attributes: [
          [Media.sequelize.fn("COUNT", Media.sequelize.col("id")), "fileCount"],
          [Media.sequelize.fn("COALESCE", Media.sequelize.fn("SUM", Media.sequelize.col("size")), 0), "totalBytes"],
        ],
        raw: true,
      }),

      // Total companies
      Company.count(),

      // Total campaigns (all-time)
      Campaign.count(),

      // Total recipients (all-time)
      CampaignRecipient.count(),
    ]);

    const periodRow = periodUsageSum[0] || {};
    const allTimeRow = allTimeUsageSum[0] || {};
    const mediaRow = activeMediaAggregate[0] || {};

    return {
      period,
      periodStart,
      periodEnd,
      currentPeriod: {
        messagesSent: Number(periodRow.messagesSent || 0),
        messagesDelivered: Number(periodRow.messagesDelivered || 0),
        messagesRead: Number(periodRow.messagesRead || 0),
        messagesFailed: Number(periodRow.messagesFailed || 0),
        campaignsCreated: Number(periodRow.campaignsCreated || 0),
        campaignsCompleted: Number(periodRow.campaignsCompleted || 0),
        mediaUploadedCount: Number(periodRow.mediaUploadedCount || 0),
        mediaUploadedBytes: Number(periodRow.mediaUploadedBytes || 0),
        templatesUsed: Number(periodRow.templatesUsed || 0),
      },
      allTime: {
        totalCompanies,
        totalCampaigns,
        totalRecipients,
        activeWhatsAppConnections: totalActiveConnections,
        activeMediaFiles: Number(mediaRow.fileCount || 0),
        activeMediaStorageBytes: Number(mediaRow.totalBytes || 0),
        messagesSent: Number(allTimeRow.messagesSent || 0),
        messagesDelivered: Number(allTimeRow.messagesDelivered || 0),
        messagesRead: Number(allTimeRow.messagesRead || 0),
        messagesFailed: Number(allTimeRow.messagesFailed || 0),
        campaignsCreated: Number(allTimeRow.campaignsCreated || 0),
        campaignsCompleted: Number(allTimeRow.campaignsCompleted || 0),
        mediaUploadedCount: Number(allTimeRow.mediaUploadedCount || 0),
        mediaUploadedBytes: Number(allTimeRow.mediaUploadedBytes || 0),
        templatesUsed: Number(allTimeRow.templatesUsed || 0),
      },
    };
  }
}

module.exports = new UsageRepository();
