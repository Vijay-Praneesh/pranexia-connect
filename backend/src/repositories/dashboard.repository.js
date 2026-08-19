const { Op } = require("sequelize");
const {
  Campaign,
  CampaignRecipient,
} = require("../models");

class DashboardRepository {
  // =====================================
  // Campaign Statistics
  // =====================================
  async getCampaignStatistics(companyId) {
    const total = await Campaign.count({
      where: {
        companyId,
      },
    });

    const draft = await Campaign.count({
      where: {
        companyId,
        status: "DRAFT",
      },
    });

    const scheduled = await Campaign.count({
      where: {
        companyId,
        status: "SCHEDULED",
      },
    });

    const running = await Campaign.count({
      where: {
        companyId,
        status: "RUNNING",
      },
    });

    const completed = await Campaign.count({
      where: {
        companyId,
        status: "COMPLETED",
      },
    });

    const failed = await Campaign.count({
      where: {
        companyId,
        status: "FAILED",
      },
    });

    const cancelled = await Campaign.count({
      where: {
        companyId,
        status: "CANCELLED",
      },
    });

    return {
      total,
      draft,
      scheduled,
      running,
      completed,
      failed,
      cancelled,
    };
  }

  // =====================================
  // Message Statistics
  // =====================================
  async getMessageStatistics(companyId) {
    const totalRecipients =
      await CampaignRecipient.count({
        where: {
          companyId,
        },
      });

    const sent =
      await CampaignRecipient.count({
        where: {
          companyId,
          status: {
            [Op.in]: [
              "SENT",
              "DELIVERED",
              "READ",
            ],
          },
        },
      });

    const delivered =
      await CampaignRecipient.count({
        where: {
          companyId,
          status: {
            [Op.in]: [
              "DELIVERED",
              "READ",
            ],
          },
        },
      });

    const read =
      await CampaignRecipient.count({
        where: {
          companyId,
          status: "READ",
        },
      });

    const failed =
      await CampaignRecipient.count({
        where: {
          companyId,
          status: "FAILED",
        },
      });

    return {
      totalRecipients,
      sent,
      delivered,
      read,
      failed,
    };
  }
}

module.exports = new DashboardRepository();