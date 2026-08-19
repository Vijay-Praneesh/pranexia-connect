const cron = require("node-cron");

const campaignRepository = require("../repositories/campaign.repository");
const campaignService = require("../services/campaign.service");

const startCampaignScheduler = () => {
  console.log("🕒 Campaign Scheduler Started");

  // Runs every minute
  cron.schedule("* * * * *", async () => {
    try {
      console.log("==================================");
      console.log("Checking Scheduled Campaigns...");
      console.log(new Date().toLocaleString());
      console.log("==================================");

      const campaigns = await campaignRepository.findScheduledCampaigns();

      if (!campaigns.length) {
        console.log("No scheduled campaigns found.");
        return;
      }

      console.log(`${campaigns.length} scheduled campaign(s) found.`);

      for (const campaign of campaigns) {
        try {
          console.log(`Sending Campaign: ${campaign.name}`);

          await campaignService.sendCampaign(
            campaign.companyId,
            campaign.id
          );

          console.log(`✅ Campaign Sent: ${campaign.name}`);
        } catch (error) {
          console.error(
            `❌ Failed Campaign: ${campaign.name}`
          );
          console.error(error.message);
        }
      }
    } catch (error) {
      console.error("Cron Error:", error.message);
    }
  });
};

module.exports = startCampaignScheduler;