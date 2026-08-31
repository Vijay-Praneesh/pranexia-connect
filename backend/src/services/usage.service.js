const usageRepository = require("../repositories/usage.repository");
const metaUsageRepository = require("../repositories/metaUsage.repository");
const { getCurrentPeriod, getPeriodBounds } = require("../utils/usagePeriod.util");
const logger = require("../config/logger");
const AppError = require("../utils/appError");

class UsageService {
  /**
   * Record a WhatsApp message sent event (when Meta accepts the message).
   * Idempotently increments messagesSent.
   */
  async recordMessageSent(companyId, { campaignRecipientId, metaMessageId, campaignId, templateId }) {
    if (!companyId || !campaignRecipientId || !metaMessageId) {
      return null;
    }

    const currentPeriod = getCurrentPeriod();
    const eventKey = `msg_sent:${campaignRecipientId}:${metaMessageId}`;

    try {
      const { isNew } = await usageRepository.recordIdempotentEvent(companyId, {
        eventType: "MESSAGE_SENT",
        eventKey,
        period: currentPeriod,
        quantity: 1,
        metadata: { campaignRecipientId, metaMessageId, campaignId, templateId },
      });

      if (isNew) {
        await usageRepository.incrementUsageMetrics(companyId, currentPeriod, {
          messagesSent: 1,
        });
        logger.info(`[Usage] Message sent recorded for tenant ${companyId} (msg: ${metaMessageId})`);
      }

      return { recorded: isNew };
    } catch (error) {
      logger.error(`[Usage] Failed to record message sent: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }

  /**
   * Record a message status change (DELIVERED, READ, FAILED) from Meta webhooks.
   * Updates delivery status counters idempotently without increasing billable message count.
   */
  async recordMessageStatus(companyId, { campaignRecipientId, metaMessageId, status }) {
    if (!companyId || !campaignRecipientId || !status) {
      return null;
    }

    const normalizedStatus = String(status).toUpperCase();
    const metricFieldMap = {
      DELIVERED: { eventType: "MESSAGE_DELIVERED", column: "messagesDelivered" },
      READ: { eventType: "MESSAGE_READ", column: "messagesRead" },
      FAILED: { eventType: "MESSAGE_FAILED", column: "messagesFailed" },
    };

    const target = metricFieldMap[normalizedStatus];
    if (!target) {
      return null; // Ignore unknown or non-countable status
    }

    const currentPeriod = getCurrentPeriod();
    const eventKey = `msg_status:${normalizedStatus}:${campaignRecipientId}`;

    try {
      const { isNew } = await usageRepository.recordIdempotentEvent(companyId, {
        eventType: target.eventType,
        eventKey,
        period: currentPeriod,
        quantity: 1,
        metadata: { campaignRecipientId, metaMessageId, status: normalizedStatus },
      });

      if (isNew) {
        await usageRepository.incrementUsageMetrics(companyId, currentPeriod, {
          [target.column]: 1,
        });
        logger.info(`[Usage] Message status ${normalizedStatus} recorded for tenant ${companyId} (recipient: ${campaignRecipientId})`);
      }

      return { recorded: isNew };
    } catch (error) {
      logger.error(`[Usage] Failed to record message status: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }

  /**
   * Record campaign creation.
   */
  async recordCampaignCreated(companyId, campaignId) {
    if (!companyId || !campaignId) return null;

    const currentPeriod = getCurrentPeriod();
    const eventKey = `camp_created:${campaignId}`;

    try {
      const { isNew } = await usageRepository.recordIdempotentEvent(companyId, {
        eventType: "CAMPAIGN_CREATED",
        eventKey,
        period: currentPeriod,
        quantity: 1,
        metadata: { campaignId },
      });

      if (isNew) {
        await usageRepository.incrementUsageMetrics(companyId, currentPeriod, {
          campaignsCreated: 1,
        });
      }

      return { recorded: isNew };
    } catch (error) {
      logger.error(`[Usage] Failed to record campaign creation: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }

  /**
   * Record campaign completion.
   */
  async recordCampaignCompleted(companyId, campaignId) {
    if (!companyId || !campaignId) return null;

    const currentPeriod = getCurrentPeriod();
    const eventKey = `camp_completed:${campaignId}`;

    try {
      const { isNew } = await usageRepository.recordIdempotentEvent(companyId, {
        eventType: "CAMPAIGN_COMPLETED",
        eventKey,
        period: currentPeriod,
        quantity: 1,
        metadata: { campaignId },
      });

      if (isNew) {
        await usageRepository.incrementUsageMetrics(companyId, currentPeriod, {
          campaignsCompleted: 1,
        });
      }

      return { recorded: isNew };
    } catch (error) {
      logger.error(`[Usage] Failed to record campaign completion: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }

  /**
   * Record media upload.
   */
  async recordMediaUpload(companyId, { mediaId, size }) {
    if (!companyId || !mediaId) return null;

    const currentPeriod = getCurrentPeriod();
    const eventKey = `media_up:${mediaId}`;
    const uploadBytes = Number(size) || 0;

    try {
      const { isNew } = await usageRepository.recordIdempotentEvent(companyId, {
        eventType: "MEDIA_UPLOADED",
        eventKey,
        period: currentPeriod,
        quantity: 1,
        metadata: { mediaId, size: uploadBytes },
      });

      if (isNew) {
        await usageRepository.incrementUsageMetrics(companyId, currentPeriod, {
          mediaUploadedCount: 1,
          mediaUploadedBytes: uploadBytes,
        });
      }

      return { recorded: isNew };
    } catch (error) {
      logger.error(`[Usage] Failed to record media upload: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }

  /**
   * Record template used in a campaign.
   */
  async recordTemplateUsed(companyId, { campaignId, templateId }) {
    if (!companyId || !campaignId || !templateId) return null;

    const currentPeriod = getCurrentPeriod();
    const eventKey = `tpl_used:${campaignId}:${templateId}`;

    try {
      const { isNew } = await usageRepository.recordIdempotentEvent(companyId, {
        eventType: "TEMPLATE_USED",
        eventKey,
        period: currentPeriod,
        quantity: 1,
        metadata: { campaignId, templateId },
      });

      if (isNew) {
        await usageRepository.incrementUsageMetrics(companyId, currentPeriod, {
          templatesUsed: 1,
        });
      }

      return { recorded: isNew };
    } catch (error) {
      logger.error(`[Usage] Failed to record template usage: ${error.message}`);
      return { recorded: false, error: error.message };
    }
  }

  /**
   * Get comprehensive usage summary for a company in a given billing period.
   */
  async getCompanyUsageSummary(companyId, periodStr) {
    if (!companyId) {
      throw new AppError("Company ID is required", 400);
    }

    const { period, periodStart, periodEnd } = getPeriodBounds(periodStr);

    const [usageRecord, mediaStats, metaUsageRecord] = await Promise.all([
      usageRepository.findByCompanyAndPeriod(companyId, period),
      usageRepository.getActiveMediaStats(companyId),
      metaUsageRepository.findByCompanyAndPeriod(companyId, period),
    ]);

    const saasUsage = {
      messagesSent: usageRecord?.messagesSent || 0,
      messagesDelivered: usageRecord?.messagesDelivered || 0,
      messagesRead: usageRecord?.messagesRead || 0,
      messagesFailed: usageRecord?.messagesFailed || 0,
      campaignsCreated: usageRecord?.campaignsCreated || 0,
      campaignsCompleted: usageRecord?.campaignsCompleted || 0,
      mediaUploadedCount: usageRecord?.mediaUploadedCount || 0,
      mediaUploadedBytes: Number(usageRecord?.mediaUploadedBytes || 0),
      templatesUsed: usageRecord?.templatesUsed || 0,
    };

    const metaUsage = {
      status: metaUsageRecord?.status || "NOT_SYNCED",
      wabaId: metaUsageRecord?.wabaId || null,
      syncedAt: metaUsageRecord?.syncedAt || null,
      currency: metaUsageRecord?.currency || null,
      amount: metaUsageRecord?.amount !== null && metaUsageRecord?.amount !== undefined
        ? Number(metaUsageRecord.amount)
        : null,
      costAvailable: metaUsageRecord?.amount !== null && metaUsageRecord?.amount !== undefined,
      marketingConversations: metaUsageRecord?.marketingConversations || 0,
      utilityConversations: metaUsageRecord?.utilityConversations || 0,
      authenticationConversations: metaUsageRecord?.authenticationConversations || 0,
      serviceConversations: metaUsageRecord?.serviceConversations || 0,
      totalConversations: metaUsageRecord?.totalConversations || 0,
      notice:
        "Meta WhatsApp conversation charges are billed directly by Meta Platforms, Inc. Seyyon Connect tracks authoritative usage without inventing prices.",
    };

    return {
      period: {
        period,
        periodStart,
        periodEnd,
      },
      saas: {
        messages: {
          sent: saasUsage.messagesSent,
          delivered: saasUsage.messagesDelivered,
          read: saasUsage.messagesRead,
          failed: saasUsage.messagesFailed,
        },
        campaigns: {
          created: saasUsage.campaignsCreated,
          completed: saasUsage.campaignsCompleted,
        },
        media: {
          uploadedCount: saasUsage.mediaUploadedCount,
          uploadedBytes: saasUsage.mediaUploadedBytes,
          activeFileCount: mediaStats.activeFileCount,
          activeStorageBytes: mediaStats.activeStorageBytes,
        },
        templates: {
          used: saasUsage.templatesUsed,
        },
      },
      meta: metaUsage,
    };
  }

  /**
   * Get usage history for a company across past billing periods.
   */
  async getCompanyUsageHistory(companyId, limit = 12) {
    if (!companyId) {
      throw new AppError("Company ID is required", 400);
    }

    const [usageList, metaList] = await Promise.all([
      usageRepository.findHistoryByCompany(companyId, limit),
      metaUsageRepository.findHistoryByCompany(companyId, limit),
    ]);

    const metaByPeriod = new Map();
    for (const item of metaList) {
      metaByPeriod.set(item.period, item);
    }

    return usageList.map((item) => {
      const meta = metaByPeriod.get(item.period);
      return {
        period: item.period,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        messages: {
          sent: item.messagesSent,
          delivered: item.messagesDelivered,
          read: item.messagesRead,
          failed: item.messagesFailed,
        },
        campaigns: {
          created: item.campaignsCreated,
          completed: item.campaignsCompleted,
        },
        media: {
          uploadedCount: item.mediaUploadedCount,
          uploadedBytes: Number(item.mediaUploadedBytes || 0),
        },
        templates: {
          used: item.templatesUsed,
        },
        meta: {
          status: meta?.status || "NOT_SYNCED",
          syncedAt: meta?.syncedAt || null,
          currency: meta?.currency || null,
          amount: meta?.amount !== null && meta?.amount !== undefined ? Number(meta.amount) : null,
          totalConversations: meta?.totalConversations || 0,
        },
      };
    });
  }

  /**
   * Get platform-wide aggregate usage for SUPER_ADMIN.
   */
  async getOwnerAggregateUsage(periodStr) {
    const [platformUsage, platformMeta] = await Promise.all([
      usageRepository.getPlatformAggregateUsage(periodStr),
      metaUsageRepository.getPlatformAggregate(periodStr),
    ]);

    return {
      period: platformUsage.period,
      periodStart: platformUsage.periodStart,
      periodEnd: platformUsage.periodEnd,
      currentPeriod: platformUsage.currentPeriod,
      allTime: platformUsage.allTime,
      metaAggregate: platformMeta,
    };
  }

  // =====================================
  // Plan-Readiness Helpers (Module Hook)
  // =====================================

  async getCompanyUsage(companyId, periodStr = null) {
    return await this.getCompanyUsageSummary(companyId, periodStr);
  }

  async getUsageForPeriod(companyId, periodStr) {
    return await usageRepository.findByCompanyAndPeriod(companyId, periodStr);
  }

  async getRemainingAllowance(companyId, metric) {
    const summary = await this.getCompanyUsageSummary(companyId);
    return {
      metric,
      used: summary.saas[metric] ?? null,
      limit: null,
      remaining: null,
      unlimited: true,
    };
  }
}

module.exports = new UsageService();
