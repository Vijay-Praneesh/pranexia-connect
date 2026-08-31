const { Op } = require("sequelize");
const {
  PLAN_NAMES,
  METRIC_KEYS,
  METRIC_DEFINITIONS,
  PLANS,
  WARNING_THRESHOLDS,
  calculateThresholdStatus,
} = require("../config/plans.config");
const {
  Company,
  Customer,
  Template,
  User,
  WhatsAppConnection,
} = require("../models");
const usageService = require("./usage.service");
const usageRepository = require("../repositories/usage.repository");
const AppError = require("../utils/appError");

class PlanService {
  /**
   * Get all standard plan definitions
   */
  getPlanDefinitions() {
    return Object.values(PLANS).map((plan) => ({
      name: plan.name,
      displayName: plan.displayName,
      tagline: plan.tagline,
      limits: { ...plan.limits },
    }));
  }

  /**
   * Get standard plan definition by name
   */
  getPlan(planName) {
    const plan = PLANS[planName];
    if (!plan) {
      throw new AppError(`Invalid plan: ${planName}`, 400);
    }
    return {
      name: plan.name,
      displayName: plan.displayName,
      tagline: plan.tagline,
      limits: { ...plan.limits },
    };
  }

  /**
   * Get effective company plan and limits (merging custom limits if applicable)
   */
  async getCompanyPlan(companyId) {
    const company = await Company.findByPk(companyId, {
      attributes: ["id", "companyName", "plan", "customLimits", "status"],
    });

    if (!company) {
      throw new AppError("Company not found", 404);
    }

    const planName = company.plan || PLAN_NAMES.STARTER;
    const basePlan = this.getPlan(planName);

    // Merge custom limits if configured (e.g. for ENTERPRISE)
    const effectiveLimits = { ...basePlan.limits };
    if (company.customLimits && typeof company.customLimits === "object") {
      for (const [key, value] of Object.entries(company.customLimits)) {
        if (Object.prototype.hasOwnProperty.call(effectiveLimits, key)) {
          effectiveLimits[key] = value;
        }
      }
    }

    return {
      companyId: company.id,
      companyName: company.companyName,
      planName: basePlan.name,
      displayName: basePlan.displayName,
      tagline: basePlan.tagline,
      limits: effectiveLimits,
      customLimits: company.customLimits || null,
    };
  }

  /**
   * Query current usage for a specific metric
   */
  async getCurrentUsage(companyId, metricKey, periodStr = null) {
    switch (metricKey) {
      case METRIC_KEYS.MONTHLY_MESSAGES: {
        const summary = await usageService.getCompanyUsageSummary(companyId, periodStr);
        return summary.saas.messages.sent || 0;
      }

      case METRIC_KEYS.MONTHLY_CAMPAIGNS: {
        const summary = await usageService.getCompanyUsageSummary(companyId, periodStr);
        return summary.saas.campaigns.created || 0;
      }

      case METRIC_KEYS.MONTHLY_MEDIA_UPLOADS: {
        const summary = await usageService.getCompanyUsageSummary(companyId, periodStr);
        return summary.saas.media.uploadedCount || 0;
      }

      case METRIC_KEYS.CUSTOMERS: {
        return await Customer.count({
          where: { companyId },
        });
      }

      case METRIC_KEYS.TEMPLATES: {
        return await Template.count({
          where: { companyId },
        });
      }

      case METRIC_KEYS.MEDIA_STORAGE_BYTES: {
        const stats = await usageRepository.getActiveMediaStats(companyId);
        return stats.activeStorageBytes || 0;
      }

      case METRIC_KEYS.TEAM_MEMBERS: {
        return await User.count({
          where: {
            companyId,
            role: { [Op.ne]: "SUPER_ADMIN" },
          },
        });
      }

      case METRIC_KEYS.WHATSAPP_CONNECTIONS: {
        return await WhatsAppConnection.count({
          where: {
            companyId,
            status: "CONNECTED",
          },
        });
      }

      default:
        throw new AppError(`Unknown plan metric: ${metricKey}`, 400);
    }
  }

  /**
   * Check if a requested quantity is within the plan allowance
   */
  async checkLimit(companyId, metricKey, requestedQuantity = 1, periodStr = null) {
    if (!METRIC_DEFINITIONS[metricKey]) {
      throw new AppError(`Unknown plan metric: ${metricKey}`, 400);
    }

    const companyPlan = await this.getCompanyPlan(companyId);
    const limit = companyPlan.limits[metricKey];
    const metricDef = METRIC_DEFINITIONS[metricKey];
    const currentUsage = await this.getCurrentUsage(companyId, metricKey, periodStr);

    // Unlimited limit
    if (limit === null || limit === undefined) {
      return {
        allowed: true,
        metric: metricKey,
        label: metricDef.label,
        unit: metricDef.unit,
        currentUsage,
        limit: null,
        remaining: null,
        requested: requestedQuantity,
        plan: companyPlan.planName,
        status: WARNING_THRESHOLDS.NORMAL,
      };
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage + requestedQuantity <= limit;
    const status = calculateThresholdStatus(currentUsage, limit);

    return {
      allowed,
      metric: metricKey,
      label: metricDef.label,
      unit: metricDef.unit,
      currentUsage,
      limit,
      remaining,
      requested: requestedQuantity,
      plan: companyPlan.planName,
      status,
    };
  }

  /**
   * Assert within limit, throwing a user-friendly AppError (409) if exceeded
   */
  async assertWithinLimit(companyId, metricKey, requestedQuantity = 1, periodStr = null) {
    const result = await this.checkLimit(companyId, metricKey, requestedQuantity, periodStr);

    if (!result.allowed) {
      let formattedLimit = result.limit;
      let formattedUsage = result.currentUsage;

      if (metricKey === METRIC_KEYS.MEDIA_STORAGE_BYTES) {
        formattedLimit = `${(result.limit / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        formattedUsage = `${(result.currentUsage / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      }

      const err = new AppError(
        `You have reached your ${result.plan} plan limit for ${result.label} (${formattedUsage} / ${formattedLimit}). Upgrade your plan to increase limits.`,
        409
      );
      err.limitDetails = result;
      throw err;
    }

    return result;
  }

  /**
   * Get comprehensive company plan overview with all metric limits and usage
   */
  async getCompanyPlanOverview(companyId, periodStr = null) {
    const companyPlan = await this.getCompanyPlan(companyId);
    const metricsOverview = [];

    for (const [key, def] of Object.entries(METRIC_DEFINITIONS)) {
      const limit = companyPlan.limits[key];
      const currentUsage = await this.getCurrentUsage(companyId, key, periodStr);
      const remaining = limit !== null && limit !== undefined ? Math.max(0, limit - currentUsage) : null;
      const percentage =
        limit !== null && limit !== undefined && limit > 0
          ? Math.min(100, Math.round((currentUsage / limit) * 100))
          : null;
      const status = calculateThresholdStatus(currentUsage, limit);

      metricsOverview.push({
        metric: key,
        label: def.label,
        description: def.description,
        unit: def.unit,
        isMonthly: def.isMonthly,
        currentUsage,
        limit,
        remaining,
        percentage,
        status,
      });
    }

    return {
      plan: {
        name: companyPlan.planName,
        displayName: companyPlan.displayName,
        tagline: companyPlan.tagline,
        customLimits: companyPlan.customLimits,
      },
      metrics: metricsOverview,
      availablePlans: this.getPlanDefinitions(),
    };
  }

  /**
   * SUPER_ADMIN plan assignment
   */
  async assignCompanyPlan(companyId, planName, customLimits = null) {
    if (!PLANS[planName]) {
      throw new AppError(`Invalid plan: ${planName}`, 400);
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new AppError("Company not found", 404);
    }

    await company.update({
      plan: planName,
      customLimits: customLimits || null,
    });

    return await this.getCompanyPlanOverview(companyId);
  }
}

module.exports = new PlanService();
