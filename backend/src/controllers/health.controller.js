const ApiResponse = require("../helpers/apiResponse");

const healthCheck = (req, res) => {
  return ApiResponse.success(
    res,
    "Pranexia Connect API is running successfully.",
    {
      version: "1.0.0",
      environment: process.env.NODE_ENV,
      timestamp: new Date(),
    }
  );
};

module.exports = {
  healthCheck,
};