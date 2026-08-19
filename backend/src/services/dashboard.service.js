const dashboardRepository = require("../repositories/dashboard.repository");

class DashboardService {
  // =====================================
  // Get Dashboard Summary
  // =====================================
  async getDashboardSummary(companyId) {
    const campaignStatistics =
      await dashboardRepository.getCampaignStatistics(
        companyId
      );

    const messageStatistics =
      await dashboardRepository.getMessageStatistics(
        companyId
      );

    const totalRecipients =
      messageStatistics.totalRecipients;

    const delivered =
      messageStatistics.delivered;

    const read =
      messageStatistics.read;

    const failed =
      messageStatistics.failed;

    const deliveryRate =
      totalRecipients > 0
        ? Math.round(
            (delivered / totalRecipients) * 100
          )
        : 0;

    const readRate =
      totalRecipients > 0
        ? Math.round(
            (read / totalRecipients) * 100
          )
        : 0;

    const failureRate =
      totalRecipients > 0
        ? Math.round(
            (failed / totalRecipients) * 100
          )
        : 0;

    return {
      campaigns: campaignStatistics,

      messages: messageStatistics,

      performance: {
        deliveryRate,
        readRate,
        failureRate,
      },
    };
  }
}

module.exports = new DashboardService();