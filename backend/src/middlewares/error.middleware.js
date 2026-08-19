const ApiResponse = require("../helpers/apiResponse");
const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(err);

  console.log("ERROR NAME:", err.name);
  console.log("ERROR MESSAGE:", err.message);
  console.log("ERROR:", err);

  return ApiResponse.error(
    res,
    err.message || "Internal Server Error",
    err.statusCode || 500,
    err.errors || null
  );
};

module.exports = errorHandler;