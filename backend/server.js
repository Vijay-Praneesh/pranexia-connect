const app = require("./src/app");
const env = require("./src/config/env");
const db = require("./src/models");
const startCampaignScheduler = require("./src/cron/campaign.cron");
const logger = require("./src/config/logger");

const containsSensitiveData = (value) => {
  const text = String(value);

  return /password|secret|token|authorization|bearer|api[_ -]?key|:\/\/[^\s]*@/i.test(
    text
  );
};

const addSafeErrorDetail = (details, label, value) => {
  if (value === undefined || value === null || value === "") return;

  details.push(
    containsSensitiveData(value)
      ? `${label}: [withheld because it may contain sensitive data]`
      : `${label}: ${value}`
  );
};

const logStartupError = (error) => {
  const details = ["Pranexia Connect API startup failed"];
  const databaseError = error.parent || error.original;

  addSafeErrorDetail(details, "Error name", error.name);
  addSafeErrorDetail(details, "Error message", error.message);
  addSafeErrorDetail(details, "Database error code", error.code);

  if (databaseError) {
    addSafeErrorDetail(details, "Database error name", databaseError.name);
    addSafeErrorDetail(details, "Database error message", databaseError.message);
    addSafeErrorDetail(details, "Database error code", databaseError.code);
  }

  logger.error(details.join(" | "));

  if (error.stack && !containsSensitiveData(error.stack)) {
    logger.error(error.stack);
  }
};

const startServer = async () => {
  try {
    env.validateEnvironment();
    await db.sequelize.authenticate();
    await db.sequelize.sync(
      env.NODE_ENV === "development" ? { alter: true } : {}
    );
    
    // Start Campaign Scheduler
    startCampaignScheduler();

    app.listen(env.PORT, () => {
      logger.info("Database connected successfully");
      logger.info(
        `Pranexia Connect API started on port ${env.PORT} in ${env.NODE_ENV} mode`
      );
    });
  } catch (error) {
    logStartupError(error);
  }
};

startServer();
