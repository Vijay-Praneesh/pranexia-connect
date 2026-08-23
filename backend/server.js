const app = require("./src/app");
const env = require("./src/config/env");
const db = require("./src/models");
const startCampaignScheduler = require("./src/cron/campaign.cron");
const logger = require("./src/config/logger");

const startServer = async () => {
  try {
    env.validateEnvironment();
    await db.sequelize.authenticate();
    await db.sequelize.sync();
    
    // Start Campaign Scheduler
    startCampaignScheduler();

    app.listen(env.PORT, () => {
      logger.info("Database connected successfully");
      logger.info(
        `Pranexia Connect API started on port ${env.PORT} in ${env.NODE_ENV} mode`
      );
    });
  } catch {
    logger.error("Pranexia Connect API startup failed");
  }
};

startServer();
