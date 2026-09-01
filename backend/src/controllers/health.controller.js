const ApiResponse = require("../helpers/apiResponse");
const sequelize = require("../config/database");

const healthCheck = async (req, res) => {
  let dbStatus = "CONNECTED";

  try {
    await sequelize.authenticate();
  } catch (error) {
    dbStatus = "DISCONNECTED";
  }

  const isHealthy = dbStatus === "CONNECTED";

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy
      ? "Seyyon Connect API is healthy and running."
      : "Seyyon Connect API is experiencing database connectivity issues.",
    data: {
      status: isHealthy ? "UP" : "DEGRADED",
      database: dbStatus,
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = {
  healthCheck,
};