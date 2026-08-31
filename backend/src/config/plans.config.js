/**
 * Centralized commercial plan definitions, limits, and threshold configurations.
 * Source of truth for Seyyon Connect (Pranexia Connect) tiers.
 */

const PLAN_NAMES = {
  STARTER: "STARTER",
  BUSINESS: "BUSINESS",
  PROFESSIONAL: "PROFESSIONAL",
  ENTERPRISE: "ENTERPRISE",
};

const METRIC_KEYS = {
  MONTHLY_MESSAGES: "MONTHLY_MESSAGES",
  MONTHLY_CAMPAIGNS: "MONTHLY_CAMPAIGNS",
  CUSTOMERS: "CUSTOMERS",
  TEMPLATES: "TEMPLATES",
  MEDIA_STORAGE_BYTES: "MEDIA_STORAGE_BYTES",
  MONTHLY_MEDIA_UPLOADS: "MONTHLY_MEDIA_UPLOADS",
  TEAM_MEMBERS: "TEAM_MEMBERS",
  WHATSAPP_CONNECTIONS: "WHATSAPP_CONNECTIONS",
};

const METRIC_DEFINITIONS = {
  [METRIC_KEYS.MONTHLY_MESSAGES]: {
    key: METRIC_KEYS.MONTHLY_MESSAGES,
    label: "WhatsApp Messages",
    description: "Monthly billable WhatsApp messages sent to recipients",
    isMonthly: true,
    unit: "messages",
  },
  [METRIC_KEYS.MONTHLY_CAMPAIGNS]: {
    key: METRIC_KEYS.MONTHLY_CAMPAIGNS,
    label: "Campaigns",
    description: "Monthly campaigns created in the active billing period",
    isMonthly: true,
    unit: "campaigns",
  },
  [METRIC_KEYS.CUSTOMERS]: {
    key: METRIC_KEYS.CUSTOMERS,
    label: "Contacts / Customers",
    description: "Total active customer records stored in customer database",
    isMonthly: false,
    unit: "contacts",
  },
  [METRIC_KEYS.TEMPLATES]: {
    key: METRIC_KEYS.TEMPLATES,
    label: "Templates",
    description: "Total WhatsApp message templates created for this company",
    isMonthly: false,
    unit: "templates",
  },
  [METRIC_KEYS.MEDIA_STORAGE_BYTES]: {
    key: METRIC_KEYS.MEDIA_STORAGE_BYTES,
    label: "Media Storage",
    description: "Total active file storage consumption across media library",
    isMonthly: false,
    unit: "bytes",
  },
  [METRIC_KEYS.MONTHLY_MEDIA_UPLOADS]: {
    key: METRIC_KEYS.MONTHLY_MEDIA_UPLOADS,
    label: "Media Uploads",
    description: "Monthly media file uploads in active billing period",
    isMonthly: true,
    unit: "uploads",
  },
  [METRIC_KEYS.TEAM_MEMBERS]: {
    key: METRIC_KEYS.TEAM_MEMBERS,
    label: "Team Members",
    description: "Total client team member user accounts",
    isMonthly: false,
    unit: "users",
  },
  [METRIC_KEYS.WHATSAPP_CONNECTIONS]: {
    key: METRIC_KEYS.WHATSAPP_CONNECTIONS,
    label: "WhatsApp Connections",
    description: "Active WhatsApp Business Account connections",
    isMonthly: false,
    unit: "connections",
  },
};

const PLANS = {
  [PLAN_NAMES.STARTER]: {
    name: PLAN_NAMES.STARTER,
    displayName: "Starter",
    tagline: "Essential WhatsApp messaging for small businesses and startups.",
    limits: {
      [METRIC_KEYS.MONTHLY_MESSAGES]: 5000,
      [METRIC_KEYS.MONTHLY_CAMPAIGNS]: 20,
      [METRIC_KEYS.CUSTOMERS]: 1000,
      [METRIC_KEYS.TEMPLATES]: 10,
      [METRIC_KEYS.MEDIA_STORAGE_BYTES]: 1 * 1024 * 1024 * 1024, // 1 GB
      [METRIC_KEYS.MONTHLY_MEDIA_UPLOADS]: 50,
      [METRIC_KEYS.TEAM_MEMBERS]: 2,
      [METRIC_KEYS.WHATSAPP_CONNECTIONS]: 1,
    },
  },
  [PLAN_NAMES.BUSINESS]: {
    name: PLAN_NAMES.BUSINESS,
    displayName: "Business",
    tagline: "Growing businesses scaling campaigns and customer engagement.",
    limits: {
      [METRIC_KEYS.MONTHLY_MESSAGES]: 25000,
      [METRIC_KEYS.MONTHLY_CAMPAIGNS]: 100,
      [METRIC_KEYS.CUSTOMERS]: 10000,
      [METRIC_KEYS.TEMPLATES]: 50,
      [METRIC_KEYS.MEDIA_STORAGE_BYTES]: 5 * 1024 * 1024 * 1024, // 5 GB
      [METRIC_KEYS.MONTHLY_MEDIA_UPLOADS]: 250,
      [METRIC_KEYS.TEAM_MEMBERS]: 10,
      [METRIC_KEYS.WHATSAPP_CONNECTIONS]: 1,
    },
  },
  [PLAN_NAMES.PROFESSIONAL]: {
    name: PLAN_NAMES.PROFESSIONAL,
    displayName: "Professional",
    tagline: "High-volume marketing and enterprise-grade multi-agent operations.",
    limits: {
      [METRIC_KEYS.MONTHLY_MESSAGES]: 100000,
      [METRIC_KEYS.MONTHLY_CAMPAIGNS]: 500,
      [METRIC_KEYS.CUSTOMERS]: 50000,
      [METRIC_KEYS.TEMPLATES]: 200,
      [METRIC_KEYS.MEDIA_STORAGE_BYTES]: 20 * 1024 * 1024 * 1024, // 20 GB
      [METRIC_KEYS.MONTHLY_MEDIA_UPLOADS]: 1000,
      [METRIC_KEYS.TEAM_MEMBERS]: 25,
      [METRIC_KEYS.WHATSAPP_CONNECTIONS]: 2,
    },
  },
  [PLAN_NAMES.ENTERPRISE]: {
    name: PLAN_NAMES.ENTERPRISE,
    displayName: "Enterprise",
    tagline: "Custom limits, dedicated infrastructure, and unlimited scale.",
    limits: {
      [METRIC_KEYS.MONTHLY_MESSAGES]: null, // null represents unlimited
      [METRIC_KEYS.MONTHLY_CAMPAIGNS]: null,
      [METRIC_KEYS.CUSTOMERS]: null,
      [METRIC_KEYS.TEMPLATES]: null,
      [METRIC_KEYS.MEDIA_STORAGE_BYTES]: null,
      [METRIC_KEYS.MONTHLY_MEDIA_UPLOADS]: null,
      [METRIC_KEYS.TEAM_MEMBERS]: null,
      [METRIC_KEYS.WHATSAPP_CONNECTIONS]: null,
    },
  },
};

const WARNING_THRESHOLDS = {
  NORMAL: "NORMAL", // < 80%
  WARNING: "WARNING", // 80% - 89%
  CRITICAL: "CRITICAL", // 90% - 99%
  EXHAUSTED: "EXHAUSTED", // 100%
  OVER_LIMIT: "OVER_LIMIT", // > 100%
};

function calculateThresholdStatus(currentUsage, limit) {
  if (limit === null || limit === undefined) {
    return WARNING_THRESHOLDS.NORMAL;
  }

  if (limit <= 0) {
    return currentUsage > 0
      ? WARNING_THRESHOLDS.OVER_LIMIT
      : WARNING_THRESHOLDS.EXHAUSTED;
  }

  const ratio = currentUsage / limit;
  if (ratio > 1) return WARNING_THRESHOLDS.OVER_LIMIT;
  if (ratio === 1) return WARNING_THRESHOLDS.EXHAUSTED;
  if (ratio >= 0.9) return WARNING_THRESHOLDS.CRITICAL;
  if (ratio >= 0.8) return WARNING_THRESHOLDS.WARNING;
  return WARNING_THRESHOLDS.NORMAL;
}

const PLAN_TIER_LEVELS = Object.freeze({
  [PLAN_NAMES.STARTER]: 1,
  [PLAN_NAMES.BUSINESS]: 2,
  [PLAN_NAMES.PROFESSIONAL]: 3,
  [PLAN_NAMES.ENTERPRISE]: 4,
});

/**
 * Determine plan change direction: 'UPGRADE', 'DOWNGRADE', or 'SAME'
 */
function getPlanDirection(currentPlan, targetPlan) {
  const currentLevel = PLAN_TIER_LEVELS[currentPlan] || 0;
  const targetLevel = PLAN_TIER_LEVELS[targetPlan] || 0;

  if (targetLevel > currentLevel) return "UPGRADE";
  if (targetLevel < currentLevel) return "DOWNGRADE";
  return "SAME";
}

module.exports = {
  PLAN_NAMES,
  METRIC_KEYS,
  METRIC_DEFINITIONS,
  PLANS,
  PLAN_TIER_LEVELS,
  WARNING_THRESHOLDS,
  calculateThresholdStatus,
  getPlanDirection,
};
