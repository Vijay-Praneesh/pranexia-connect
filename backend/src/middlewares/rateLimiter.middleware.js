const rateLimit = require("express-rate-limit");
const ApiResponse = require("../helpers/apiResponse");

/**
 * Authentication rate limiter to protect login, registration, and Google OAuth endpoints
 * Allows 60 requests per 15-minute window per IP in production/development, configurable.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 auth requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      "Too many authentication attempts from this IP, please try again after 15 minutes.",
      429
    );
  },
  skip: (req) => {
    // Skip in test environment if needed
    return process.env.NODE_ENV === "test" && process.env.ENABLE_TEST_RATE_LIMIT !== "true";
  },
});

module.exports = {
  authRateLimiter,
};
