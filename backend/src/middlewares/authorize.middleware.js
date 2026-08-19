const ApiResponse = require("../helpers/apiResponse");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(
        res,
        "Unauthorized",
        401
      );
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        "Forbidden: You do not have permission to access this resource",
        403
      );
    }

    next();
  };
};

module.exports = authorize;