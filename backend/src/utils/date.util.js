/**
 * Centralized UTC Billing Period and Date Calculation Utilities
 * Handles month-length variations (e.g. Jan 31 -> Feb 28/29), leap years, and calendar cycles in pure UTC.
 */

const { BILLING_INTERVALS } = require("../config/pricing.config");

/**
 * Calculate next billing period (start date and end date)
 *
 * @param {Date|string|null} fromPeriodEnd Current period end date (if renewal is active)
 * @param {string} interval 'MONTHLY' | 'YEARLY'
 * @param {Date} [now=new Date()] Reference time
 * @returns {{ start: Date, end: Date }}
 */
function calculateNextBillingPeriod(fromPeriodEnd, interval = BILLING_INTERVALS.MONTHLY, now = new Date()) {
  // If fromPeriodEnd is in the future, start the new period seamlessly from fromPeriodEnd.
  // If subscription is expired or missing, start the new period from now.
  const start =
    fromPeriodEnd && new Date(fromPeriodEnd) > now
      ? new Date(fromPeriodEnd)
      : new Date(now);

  const end = new Date(start);

  if (interval === BILLING_INTERVALS.YEARLY) {
    const startYear = start.getUTCFullYear();
    const startMonth = start.getUTCMonth();
    const startDate = start.getUTCDate();

    // Add 1 calendar year
    end.setUTCFullYear(startYear + 1, startMonth, startDate);

    // Leap-year edge case: Feb 29 on leap year -> Feb 28 on non-leap year
    if (end.getUTCMonth() !== startMonth) {
      end.setUTCDate(0); // Clamps to last day of previous month (Feb 28)
    }
  } else {
    // Default: 1 calendar month
    const startYear = start.getUTCFullYear();
    const startMonth = start.getUTCMonth();
    const startDate = start.getUTCDate();

    const targetMonth = (startMonth + 1) % 12;
    const targetYear = startMonth === 11 ? startYear + 1 : startYear;

    // Set to 1st of target month first to prevent month overflow
    end.setUTCFullYear(targetYear, targetMonth, 1);

    // Determine number of days in target month in UTC
    const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const clampedDate = Math.min(startDate, daysInTargetMonth);
    end.setUTCDate(clampedDate);
  }

  return {
    start,
    end,
  };
}

module.exports = {
  calculateNextBillingPeriod,
};
