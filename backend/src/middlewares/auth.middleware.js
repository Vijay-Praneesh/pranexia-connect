const jwtHelper = require("../helpers/jwt.helper");
const ApiResponse = require("../helpers/apiResponse");

const authMiddleware = (req, res, next) => {
  try {
    // Get Authorization Header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return ApiResponse.error(
        res,
        "Authorization token is required",
        401
      );
    }

    // Check Bearer Token
    if (!authHeader.startsWith("Bearer ")) {
      return ApiResponse.error(
        res,
        "Invalid authorization format",
        401
      );
    }

    // Extract Token
    const token = authHeader.split(" ")[1];

    // Verify Token
    const decoded = jwtHelper.verifyToken(token);

    // Attach User Payload
    req.user = decoded;

    next();
  } catch (error) {
    return ApiResponse.error(
      res,
      "Invalid or expired token",
      401
    );
  }
};

module.exports = authMiddleware;