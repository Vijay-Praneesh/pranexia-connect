const authService = require("../services/auth.service");
const authValidator = require("../validators/auth.validator");
const ApiResponse = require("../helpers/apiResponse");

class AuthController {
  async register(req, res, next) {
    try {
      // Validate Request
      const { error } = authValidator.register(req.body);

      if (error) {
        return ApiResponse.error(
          res,
          error.details.map((item) => item.message).join(", "),
          400
        );
      }

      // Register Company & Admin User
      const data = await authService.register(req.body);

      return ApiResponse.success(
        res,
        "Company registered successfully",
        data,
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      // Validate Request
      const { error } = authValidator.login(req.body);

      if (error) {
        return ApiResponse.error(
          res,
          error.details[0].message,
          400
        );
      }

      // Login User
      const result = await authService.login(req.body);

      return ApiResponse.success(
        res,
        "Login successful",
        result
      );
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    return ApiResponse.success(
      res,
      "User fetched successfully",
      user
    );
  } catch (error) {
    next(error);
  }
}
}

module.exports = new AuthController();