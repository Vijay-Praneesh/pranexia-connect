const usageService = require("../services/usage.service");
const metaUsageService = require("../services/metaUsage.service");
const ApiResponse = require("../helpers/apiResponse");

class UsageController {
  /**
   * GET /api/v1/usage/summary
   * Fetch company usage summary for current or specified period.
   */
  async getSummary(req, res, next) {
    try {
      const summary = await usageService.getCompanyUsageSummary(
        req.user.companyId,
        req.query.period
      );

      return ApiResponse.success(
        res,
        "Usage summary fetched successfully",
        summary
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/usage/history
   * Fetch company usage history across previous billing periods.
   */
  async getHistory(req, res, next) {
    try {
      const history = await usageService.getCompanyUsageHistory(
        req.user.companyId,
        req.query.limit
      );

      return ApiResponse.success(
        res,
        "Usage history fetched successfully",
        history
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/usage/meta/sync
   * Trigger synchronization with Meta Graph API for conversation analytics / billing.
   */
  async syncMetaUsage(req, res, next) {
    try {
      const period = req.body?.period || req.query?.period;
      const result = await metaUsageService.syncCompanyMetaUsage(
        req.user.companyId,
        period
      );

      return ApiResponse.success(
        res,
        result.message || "Meta usage synchronized successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/usage/owner-aggregate
   * Fetch platform-wide aggregate usage for SUPER_ADMIN.
   */
  async getOwnerAggregate(req, res, next) {
    try {
      const aggregate = await usageService.getOwnerAggregateUsage(
        req.query.period
      );

      return ApiResponse.success(
        res,
        "Platform aggregate usage fetched successfully",
        aggregate
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UsageController();
