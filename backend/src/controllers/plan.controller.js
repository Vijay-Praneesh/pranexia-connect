const planService = require("../services/plan.service");
const ApiResponse = require("../helpers/apiResponse");
const AppError = require("../utils/appError");

class PlanController {
  /**
   * GET /api/v1/plans
   * List all standard commercial plan definitions
   */
  async getPlans(req, res, next) {
    try {
      const plans = planService.getPlanDefinitions();
      return ApiResponse.success(res, "Plans retrieved successfully", plans);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/plans/current
   * Get current company plan, usage, remaining allowance, and warning status for all metrics
   */
  async getCurrentPlan(req, res, next) {
    try {
      const companyId = req.user.companyId;
      if (!companyId) {
        throw new AppError("Company context is required", 400);
      }

      const { period } = req.query;
      const overview = await planService.getCompanyPlanOverview(companyId, period);
      return ApiResponse.success(res, "Current plan overview retrieved successfully", overview);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/plans/assign/:companyId
   * SUPER_ADMIN assignment of company plan (and optional custom limits)
   */
  async assignPlan(req, res, next) {
    try {
      const { companyId } = req.params;
      const { plan, customLimits } = req.body;

      if (!plan) {
        throw new AppError("Plan name is required", 400);
      }

      const overview = await planService.assignCompanyPlan(companyId, plan, customLimits);
      return ApiResponse.success(res, "Company plan updated successfully", overview);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PlanController();
