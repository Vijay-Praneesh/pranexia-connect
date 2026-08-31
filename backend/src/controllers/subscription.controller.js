const subscriptionService = require("../services/subscription.service");
const planService = require("../services/plan.service");
const AppError = require("../utils/appError");

class SubscriptionController {
  /**
   * Helper to resolve tenant company ID safely
   */
  resolveCompanyId(req) {
    if (req.user.role === "SUPER_ADMIN") {
      return req.params.companyId || req.query.companyId || req.user.companyId;
    }
    if (!req.user.companyId) {
      throw new AppError("Company ID is required for this action", 400);
    }
    return req.user.companyId;
  }

  /**
   * GET /api/v1/subscriptions/current
   * Fetch current subscription and limits overview for the authenticated tenant
   */
  getCurrentSubscription = async (req, res, next) => {
    try {
      const companyId = this.resolveCompanyId(req);
      const subscription = await subscriptionService.getCurrentSubscription(companyId);
      const planOverview = await planService.getCompanyPlanOverview(companyId);

      return res.status(200).json({
        success: true,
        message: "Current subscription fetched successfully",
        data: {
          subscription,
          planOverview,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/subscriptions/history
   * Fetch chronological subscription change history
   */
  getSubscriptionHistory = async (req, res, next) => {
    try {
      const companyId = this.resolveCompanyId(req);
      const limit = parseInt(req.query.limit, 10) || 50;
      const history = await subscriptionService.getSubscriptionHistory(companyId, limit);

      return res.status(200).json({
        success: true,
        message: "Subscription history fetched successfully",
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/subscriptions/company/:companyId (SUPER_ADMIN)
   */
  getCompanySubscription = async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const subscription = await subscriptionService.getCurrentSubscription(companyId);
      const planOverview = await planService.getCompanyPlanOverview(companyId);
      const history = await subscriptionService.getSubscriptionHistory(companyId, 20);

      return res.status(200).json({
        success: true,
        message: "Company subscription fetched successfully",
        data: {
          subscription,
          planOverview,
          history,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscriptions/company/:companyId/trial (SUPER_ADMIN)
   */
  startTrial = async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const { plan, trialDays, reason } = req.body;

      const subscription = await subscriptionService.startTrial(companyId, {
        plan,
        trialDays: trialDays ? parseInt(trialDays, 10) : undefined,
        source: "ADMIN",
        performedBy: req.user.id,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: `Trial subscription started on ${subscription.plan} plan`,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscriptions/company/:companyId/activate (SUPER_ADMIN)
   */
  activateSubscription = async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const { plan, periodDays, reason } = req.body;

      const subscription = await subscriptionService.activateSubscription(companyId, {
        plan,
        periodDays: periodDays ? parseInt(periodDays, 10) : undefined,
        source: "ADMIN",
        performedBy: req.user.id,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: `Subscription activated on ${subscription.plan} plan`,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscriptions/company/:companyId/change-plan (SUPER_ADMIN)
   */
  changePlan = async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const { plan, customLimits, reason } = req.body;

      if (!plan) {
        throw new AppError("Plan is required", 400);
      }

      const subscription = await subscriptionService.changePlan(companyId, plan, {
        customLimits,
        source: "ADMIN",
        performedBy: req.user.id,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: `Plan changed to ${subscription.plan}`,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscriptions/company/:companyId/cancel (SUPER_ADMIN)
   */
  cancelSubscription = async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const { cancelAtPeriodEnd, immediate, reason } = req.body;

      const subscription = await subscriptionService.cancelSubscription(companyId, {
        cancelAtPeriodEnd: cancelAtPeriodEnd !== undefined ? Boolean(cancelAtPeriodEnd) : true,
        immediate: Boolean(immediate),
        source: "ADMIN",
        performedBy: req.user.id,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: subscription.cancelAtPeriodEnd
          ? "Subscription scheduled to cancel at the end of the current billing period"
          : "Subscription cancelled immediately",
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscriptions/company/:companyId/expire (SUPER_ADMIN)
   */
  expireSubscription = async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const { reason } = req.body;

      const subscription = await subscriptionService.expireSubscription(companyId, {
        source: "ADMIN",
        reason: reason || "Administratively expired",
      });

      return res.status(200).json({
        success: true,
        message: "Subscription expired successfully",
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/subscriptions/change-plan/preview
   * Preview impact of upgrading or downgrading plan
   */
  previewPlanChange = async (req, res, next) => {
    try {
      const companyId = this.resolveCompanyId(req);
      const targetPlan = req.query.plan;
      const targetInterval = req.query.interval || "MONTHLY";

      if (!targetPlan) {
        throw new AppError("Target plan is required in query parameter ?plan=", 400);
      }

      const preview = await planService.previewPlanChange(companyId, targetPlan, targetInterval);

      return res.status(200).json({
        success: true,
        message: "Plan change preview generated successfully",
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscriptions/change-plan
   * Schedule a downgrade or apply an administrative plan change
   */
  changePlan = async (req, res, next) => {
    try {
      const companyId = this.resolveCompanyId(req);
      const { plan, interval = "MONTHLY", reason, immediate } = req.body;

      if (!plan) {
        throw new AppError("Target plan is required", 400);
      }

      const { getPlanDirection } = require("../config/plans.config");
      const currentSub = await subscriptionService.getCurrentSubscription(companyId);
      const direction = getPlanDirection(currentSub.plan, plan);

      if (direction === "SAME") {
        throw new AppError("You are already on this plan", 400);
      }

      let result;
      // If SUPER_ADMIN explicitly passes immediate = true, apply immediately
      if (req.user.role === "SUPER_ADMIN" && immediate) {
        result = await subscriptionService.changePlan(companyId, plan, {
          source: "ADMIN",
          performedBy: req.user.id,
          reason: reason || "Administrative plan change",
        });
        return res.status(200).json({
          success: true,
          message: `Plan changed immediately to ${result.plan}`,
          data: result,
        });
      }

      if (direction === "UPGRADE") {
        throw new AppError(
          "Paid upgrades require checkout. Please initiate a payment order via POST /api/v1/payments/order",
          400
        );
      }

      // Schedule Downgrade for period end
      result = await subscriptionService.scheduleDowngrade(companyId, plan, {
        billingInterval: interval,
        source: req.user.role === "SUPER_ADMIN" ? "ADMIN" : "CLIENT",
        performedBy: req.user.id,
        reason: reason || "Downgrade requested by user",
      });

      return res.status(200).json({
        success: true,
        message: `Plan downgrade to ${plan} scheduled for ${result.pendingPlanEffectiveAt}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscriptions/cancel-pending-plan
   * Cancel a scheduled downgrade
   */
  cancelPendingDowngrade = async (req, res, next) => {
    try {
      const companyId = this.resolveCompanyId(req);
      const result = await subscriptionService.cancelPendingDowngrade(companyId, {
        source: req.user.role === "SUPER_ADMIN" ? "ADMIN" : "CLIENT",
        performedBy: req.user.id,
        reason: "User cancelled scheduled downgrade",
      });

      return res.status(200).json({
        success: true,
        message: "Scheduled plan downgrade has been cancelled",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new SubscriptionController();
