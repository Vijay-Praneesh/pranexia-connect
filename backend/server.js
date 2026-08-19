const app = require("./src/app");
const env = require("./src/config/env");
const sequelize = require("./src/config/database");
const db = require("./src/models");
const startCampaignScheduler = require("./src/cron/campaign.cron");

const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();
    
    // Start Campaign Scheduler
    startCampaignScheduler();

    console.log("=====================================");
    console.log("✅ Database Connected Successfully");
    console.log("🚀 Pranexia Connect API Started");
    console.log(`🌐 Server : http://localhost:${env.PORT}`);
    console.log(`🌍 Environment : ${env.NODE_ENV}`);
    console.log("=====================================");

    app.listen(env.PORT);
  } catch (error) {
    console.error("❌ Database Connection Failed");
    console.error(error.message);
  }
};

startServer();
