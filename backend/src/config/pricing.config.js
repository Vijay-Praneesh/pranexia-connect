const { PLAN_NAMES } = require("./plans.config");

const BILLING_INTERVALS = Object.freeze({
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
});

const INTERVAL_DAYS = Object.freeze({
  [BILLING_INTERVALS.MONTHLY]: 30,
  [BILLING_INTERVALS.YEARLY]: 365,
});

const PAYMENT_STATUSES = Object.freeze({
  CREATED: "CREATED",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
});

const PAYMENT_TYPES = Object.freeze({
  INITIAL_SUBSCRIPTION: "INITIAL_SUBSCRIPTION",
  RENEWAL: "RENEWAL",
  PLAN_CHANGE: "PLAN_CHANGE",
});

const PAYMENT_PROVIDERS = Object.freeze({
  RAZORPAY: "RAZORPAY",
  STRIPE: "STRIPE",
  MOCK: "MOCK",
});

/**
 * Authoritative commercial pricing matrix.
 * Stored in integer minor units (paise for INR).
 * 1 INR = 100 paise.
 */
const PLAN_PRICING = Object.freeze({
  [PLAN_NAMES.STARTER]: {
    currency: "INR",
    [BILLING_INTERVALS.MONTHLY]: {
      amount: 99900, // ₹999 / month
      displayAmount: 999,
      formatted: "₹999/mo",
    },
    [BILLING_INTERVALS.YEARLY]: {
      amount: 999000, // ₹9,990 / year (~2 months free)
      displayAmount: 9990,
      formatted: "₹9,990/yr",
    },
  },
  [PLAN_NAMES.BUSINESS]: {
    currency: "INR",
    [BILLING_INTERVALS.MONTHLY]: {
      amount: 249900, // ₹2,499 / month
      displayAmount: 2499,
      formatted: "₹2,499/mo",
    },
    [BILLING_INTERVALS.YEARLY]: {
      amount: 2499000, // ₹24,990 / year
      displayAmount: 24990,
      formatted: "₹24,990/yr",
    },
  },
  [PLAN_NAMES.PROFESSIONAL]: {
    currency: "INR",
    [BILLING_INTERVALS.MONTHLY]: {
      amount: 599900, // ₹5,999 / month
      displayAmount: 5999,
      formatted: "₹5,999/mo",
    },
    [BILLING_INTERVALS.YEARLY]: {
      amount: 5999000, // ₹59,990 / year
      displayAmount: 59990,
      formatted: "₹59,990/yr",
    },
  },
  [PLAN_NAMES.ENTERPRISE]: {
    currency: "INR",
    [BILLING_INTERVALS.MONTHLY]: null, // Custom / Contact Sales
    [BILLING_INTERVALS.YEARLY]: null,
  },
});

/**
 * Get plan price configuration
 */
function getPlanPrice(plan, interval = BILLING_INTERVALS.MONTHLY) {
  const planConfig = PLAN_PRICING[plan];
  if (!planConfig) return null;
  return planConfig[interval] || null;
}

/**
 * Validate whether a plan has a commercial checkout price configured
 */
function isPlanPurchasable(plan, interval = BILLING_INTERVALS.MONTHLY) {
  const price = getPlanPrice(plan, interval);
  return price !== null && typeof price.amount === "number" && price.amount > 0;
}

/**
 * Safe conversion from minor units (paise) to major units (rupees)
 */
function formatPaiseToRupees(paise) {
  if (typeof paise !== "number") return "0.00";
  return (paise / 100).toFixed(2);
}

module.exports = {
  BILLING_INTERVALS,
  INTERVAL_DAYS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  PAYMENT_PROVIDERS,
  PLAN_PRICING,
  getPlanPrice,
  isPlanPurchasable,
  formatPaiseToRupees,
};
