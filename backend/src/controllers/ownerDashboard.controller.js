const ownerDashboardService = require("../services/ownerDashboard.service");
const ApiResponse = require("../helpers/apiResponse");

class OwnerDashboardController {
  async getSummary(req, res, next) {
    try {
      const summary = await ownerDashboardService.getOwnerDashboardSummary();
      return ApiResponse.success(
        res,
        "Owner dashboard summary fetched successfully",
        summary
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OwnerDashboardController();
