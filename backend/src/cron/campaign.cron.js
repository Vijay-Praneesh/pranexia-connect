const cron = require("node-cron");
const campaignRepository = require("../repositories/campaign.repository");
const campaignService = require("../services/campaign.service");
const logger = require("../config/logger");

const startCampaignScheduler = () => {
  logger.info("🕒 Campaign Scheduler Initialized");

  // Runs every minute
  cron.schedule("* * * * *", async () => {
    try {
      const campaigns = await campaignRepository.findScheduledCampaigns();

      if (!campaigns || !campaigns.length) {
        return;
      }

      logger.info(`[Campaign Scheduler] ${campaigns.length} scheduled campaign(s) due for dispatch.`);

      for (const campaign of campaigns) {
        try {
          logger.info(`[Campaign Scheduler] Dispatching campaign: ${campaign.name} (${campaign.id}) for company: ${campaign.companyId}`);

          await campaignService.sendCampaign(
            campaign.companyId,
            campaign.id
          );

          logger.info(`[Campaign Scheduler] ✅ Campaign dispatch initiated: ${campaign.name} (${campaign.id})`);
        } catch (error) {
          logger.error(
            `[Campaign Scheduler] ❌ Failed to dispatch campaign ${campaign.name} (${campaign.id}): ${error.message}`
          );
        }
      }
    } catch (error) {
      logger.error(`[Campaign Scheduler] Cron cycle error: ${error.message}`);
    }
  });
};

module.exports = startCampaignScheduler;