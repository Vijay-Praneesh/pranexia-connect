const cron = require("node-cron");
const subscriptionService = require("../services/subscription.service");
const logger = require("../config/logger");

const startSubscriptionScheduler = () => {
  logger.info("🕒 Subscription Scheduler Initialized");

  // Run every hour to check expired trials, expired periods, and cancel-at-period-end subscriptions
  cron.schedule("0 * * * *", async () => {
    try {
      logger.info("Running scheduled subscription lifecycle checks...");
      const results = await subscriptionService.processScheduledLifecycleChecks();
      logger.info(
        `Subscription lifecycle checks complete: ${results.expiredTrials} trials expired, ${results.cancelledAtPeriodEnd} cancelled at period end, ${results.expiredSubscriptions} subscriptions expired`
      );
    } catch (error) {
      logger.error(`[Subscription Scheduler Cron Error]: ${error.message}`);
    }
  });
};

module.exports = startSubscriptionScheduler;
