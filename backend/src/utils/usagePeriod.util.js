/**
 * Standardized UTC monthly period calculation utilities.
 * Ensures consistent billing and usage intervals across all services.
 */

function formatPeriod(date = new Date()) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCurrentPeriod() {
  return formatPeriod(new Date());
}

function getPeriodBounds(periodStr) {
  const period = periodStr && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(periodStr)
    ? periodStr
    : getCurrentPeriod();

  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed

  // Month in JS Date constructor (0-indexed)
  const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // Last millisecond of month: 1ms before start of next month
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return {
    period,
    periodStart,
    periodEnd,
  };
}

function getRecentPeriods(count = 12) {
  const periods = [];
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed

  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(currentYear, currentMonth - i, 1));
    periods.push(formatPeriod(d));
  }

  return periods;
}

module.exports = {
  formatPeriod,
  getCurrentPeriod,
  getPeriodBounds,
  getRecentPeriods,
};
