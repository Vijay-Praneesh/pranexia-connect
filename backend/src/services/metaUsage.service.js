const axios = require("axios");
const whatsappRepository = require("../repositories/whatsapp.repository");
const metaUsageRepository = require("../repositories/metaUsage.repository");
const { decryptSecret } = require("../utils/secret.crypto");
const { getCurrentPeriod, getPeriodBounds } = require("../utils/usagePeriod.util");
const logger = require("../config/logger");
const AppError = require("../utils/appError");

class MetaUsageService {
  get apiVersion() {
    return process.env.META_API_VERSION || process.env.WHATSAPP_API_VERSION || "v21.0";
  }

  get graphBase() {
    return `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Synchronize authoritative Meta WhatsApp conversation analytics / billing data.
   * If live Meta configuration/billing is unavailable, records accurate status without inventing fake costs.
   */
  async syncCompanyMetaUsage(companyId, periodStr = null) {
    if (!companyId) {
      throw new AppError("Company ID is required", 400);
    }

    const { period, periodStart, periodEnd } = getPeriodBounds(periodStr);
    const connection = await whatsappRepository.findByCompanyId(companyId);

    if (!connection || connection.status !== "CONNECTED") {
      const result = await metaUsageRepository.upsert(companyId, connection?.wabaId || "unassigned", {
        period,
        status: "UNAVAILABLE",
        source: "META_GRAPH_API",
        syncedAt: new Date(),
        rawMetadata: { reason: "WhatsApp Business is not connected for this company" },
      });
      return {
        status: "UNAVAILABLE",
        message: "WhatsApp Business connection is not active for this company. Live Meta synchronization requires a connected WABA.",
        syncedAt: result.syncedAt,
        data: result,
      };
    }

    const wabaId = connection.wabaId;
    let token;
    try {
      token = decryptSecret(connection.accessTokenEncrypted);
    } catch {
      throw new AppError("WhatsApp connection credentials are unavailable", 503);
    }

    try {
      // Calculate Unix epoch timestamps for start and end of requested period for Meta API query
      const startEpoch = Math.floor(periodStart.getTime() / 1000);
      const endEpoch = Math.floor(periodEnd.getTime() / 1000);

      // Query Meta WABA conversation analytics endpoint
      const response = await axios.get(`${this.graphBase}/${wabaId}`, {
        params: {
          fields: `id,name,conversation_analytics.start(${startEpoch}).end(${endEpoch}).granularity(MONTHLY).metric_types([COST,COUNT])`,
          access_token: token,
        },
        timeout: 10000,
      });

      const analyticsData = response.data?.conversation_analytics?.data || [];
      let marketing = 0;
      let utility = 0;
      let auth = 0;
      let service = 0;
      let total = 0;
      let totalAmount = null;
      let currency = null;

      // Extract verified analytics breakdown if available in response
      if (Array.isArray(analyticsData) && analyticsData.length > 0) {
        for (const item of analyticsData) {
          const cat = String(item.conversation_category || "").toUpperCase();
          const count = Number(item.conversation_count || 0);
          if (cat === "MARKETING") marketing += count;
          else if (cat === "UTILITY") utility += count;
          else if (cat === "AUTHENTICATION") auth += count;
          else if (cat === "SERVICE") service += count;
          total += count;

          if (item.cost !== undefined && item.cost !== null) {
            totalAmount = (totalAmount || 0) + Number(item.cost);
            if (item.currency) currency = item.currency;
          }
        }
      }

      const syncedRecord = await metaUsageRepository.upsert(companyId, wabaId, {
        period,
        currency,
        amount: totalAmount,
        marketingConversations: marketing,
        utilityConversations: utility,
        authenticationConversations: auth,
        serviceConversations: service,
        totalConversations: total,
        status: "SYNCED",
        source: "META_GRAPH_API",
        syncedAt: new Date(),
        rawMetadata: response.data,
      });

      logger.info(`[MetaUsage] Synchronized Meta usage for company ${companyId} (Period: ${period}, Total conversations: ${total})`);

      return {
        status: "SYNCED",
        message: totalAmount !== null
          ? "Meta conversation analytics and billing synchronized successfully."
          : "Meta conversation analytics synchronized. Live Meta billing invoice sync requires Direct Credit Line / OBO configuration.",
        syncedAt: syncedRecord.syncedAt,
        data: syncedRecord,
      };
    } catch (error) {
      logger.warn(`[MetaUsage] Meta sync API call returned error: ${error.message}`);

      // Do NOT invent fake data if Meta API returns an error or permission restriction.
      // Record UNAVAILABLE / NOT_SYNCED status gracefully.
      const syncedRecord = await metaUsageRepository.upsert(companyId, wabaId, {
        period,
        status: "UNAVAILABLE",
        source: "META_GRAPH_API",
        syncedAt: new Date(),
        rawMetadata: { error: error.response?.data || error.message },
      });

      return {
        status: "UNAVAILABLE",
        message: "Meta cost tracking architecture is ready, but authoritative Meta billing data requires live Meta configuration/API verification.",
        syncedAt: syncedRecord.syncedAt,
        data: syncedRecord,
      };
    }
  }
}

module.exports = new MetaUsageService();
