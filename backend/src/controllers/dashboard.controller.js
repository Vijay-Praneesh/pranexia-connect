const dashboardService = require("../services/dashboard.service");
const ApiResponse = require("../helpers/apiResponse");

class DashboardController {
  // =====================================
  // Get Dashboard Summary
  // =====================================
  async getSummary(req, res, next) {
    try {
      const summary =
        await dashboardService.getDashboardSummary(
          req.user.companyId
        );

      return ApiResponse.success(
        res,
        "Dashboard summary fetched successfully",
        summary
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();