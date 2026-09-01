const logger = require("../config/logger");

const AUDIT_EVENTS = {
  GOOGLE_LOGIN_SUCCESS: "GOOGLE_LOGIN_SUCCESS",
  GOOGLE_LOGIN_FAILED: "GOOGLE_LOGIN_FAILED",
  GOOGLE_ACCOUNT_LINKED: "GOOGLE_ACCOUNT_LINKED",
  GOOGLE_ONBOARDING_COMPLETED: "GOOGLE_ONBOARDING_COMPLETED",
  LOCAL_LOGIN_SUCCESS: "LOCAL_LOGIN_SUCCESS",
  LOCAL_LOGIN_FAILED: "LOCAL_LOGIN_FAILED",
};

class AuditLogger {
  /**
   * Log structured authentication and security audit events
   * @param {string} event - One of AUDIT_EVENTS
   * @param {object} details - Metadata about the event (e.g. userId, companyId, email, ip)
   */
  logAuthEvent(event, details = {}) {
    const timestamp = new Date().toISOString();
    const safeDetails = { ...details };

    // Ensure sensitive fields are NEVER logged in audit records
    delete safeDetails.password;
    delete safeDetails.credential;
    delete safeDetails.idToken;
    delete safeDetails.token;
    delete safeDetails.rawBody;

    const message = `[AUDIT] [${event}] ${JSON.stringify({
      event,
      timestamp,
      ...safeDetails,
    })}`;

    if (event.includes("FAILED")) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  }
}

module.exports = {
  AuditLogger: new AuditLogger(),
  AUDIT_EVENTS,
};
