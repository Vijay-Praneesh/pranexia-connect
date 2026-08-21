const ApiResponse = require("../helpers/apiResponse");
const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  // Do not pass driver errors or request data to logs: they can contain credentials or tokens.
  logger.error(`Request failed with status ${statusCode}`);
  const message =
    statusCode >= 500 && process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  return ApiResponse.error(
    res,
    message,
    statusCode,
    err.errors || null
  );
};

module.exports = errorHandler;
