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

  async googleAuth(req, res, next) {
    try {
      const { error } = authValidator.googleAuth(req.body);

      if (error) {
        return ApiResponse.error(
          res,
          error.details[0].message,
          400
        );
      }

      const result = await authService.googleLogin(req.body);

      if (result && result.onboardingRequired) {
        return ApiResponse.success(
          res,
          "Onboarding required for new Google account",
          result,
          200
        );
      }

      return ApiResponse.success(
        res,
        "Google authentication successful",
        result,
        200
      );
    } catch (error) {
      next(error);
    }
  }

  async googleOnboard(req, res, next) {
    try {
      const { error } = authValidator.googleOnboard(req.body);

      if (error) {
        return ApiResponse.error(
          res,
          error.details.map((item) => item.message).join(", "),
          400
        );
      }

      const result = await authService.googleOnboard(req.body);

      return ApiResponse.success(
        res,
        "Company registered with Google successfully",
        result,
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async googleLink(req, res, next) {
    try {
      const { error } = authValidator.googleLink(req.body);

      if (error) {
        return ApiResponse.error(
          res,
          error.details[0].message,
          400
        );
      }

      const result = await authService.linkGoogleAccount(req.user.id, req.body);

      return ApiResponse.success(
        res,
        "Google account linked successfully",
        result,
        200
      );
    } catch (error) {
      next(error);
    }
  }

  async googleUnlink(req, res, next) {
    try {
      const result = await authService.unlinkGoogleAccount(req.user.id);

      return ApiResponse.success(
        res,
        "Google account disconnected successfully",
        result,
        200
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();