const { OAuth2Client } = require("google-auth-library");
const env = require("../config/env");
const AppError = require("../utils/appError");
const logger = require("../config/logger");

const VALID_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

class GoogleAuthHelper {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      this.client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    }
    return this.client;
  }

  // Hook for testing / dependency injection
  setOAuth2Client(client) {
    this.client = client;
  }

  resetOAuth2Client() {
    this.client = null;
  }

  /**
   * Cryptographically verify a Google ID Token credential server-side
   * @param {string} idToken - The Google ID Token from Google Identity Services
   * @param {string} [customClientId] - Optional override for clientId verification
   * @returns {Promise<{ sub: string, email: string, emailVerified: boolean, firstName: string, lastName: string|null, picture: string|null }>}
   */
  async verifyIdToken(idToken, customClientId = null) {
    if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
      throw new AppError("Google credential is required", 400);
    }

    const clientId = customClientId || env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      logger.warn("[GoogleAuth] GOOGLE_CLIENT_ID is not configured on this server");
      throw new AppError("Google authentication is not configured on the server", 500);
    }

    try {
      const client = this.getClient();
      const ticket = await client.verifyIdToken({
        idToken: idToken.trim(),
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError("Invalid Google credential payload", 401);
      }

      // Validate Issuer
      if (!VALID_ISSUERS.includes(payload.iss)) {
        logger.warn(`[GoogleAuth] Invalid token issuer: ${payload.iss}`);
        throw new AppError("Invalid Google token issuer", 401);
      }

      // Validate Audience / Client ID
      if (payload.aud !== clientId) {
        logger.warn(`[GoogleAuth] Token audience mismatch. Expected: ${clientId}, Got: ${payload.aud}`);
        throw new AppError("Google credential audience mismatch", 401);
      }

      // Validate Expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        logger.warn(`[GoogleAuth] Google token expired at: ${payload.exp}, current: ${now}`);
        throw new AppError("Google credential has expired", 401);
      }

      // Validate Subject Identifier
      if (!payload.sub) {
        throw new AppError("Google credential missing subject identifier", 401);
      }

      // Validate Email
      if (!payload.email) {
        throw new AppError("Google credential missing email", 400);
      }

      // Validate Email Verified status
      if (payload.email_verified !== true && payload.email_verified !== "true") {
        logger.warn(`[GoogleAuth] Google email ${payload.email} is not verified`);
        throw new AppError("Google account email is not verified", 400);
      }

      const email = payload.email.toLowerCase().trim();
      const firstName = payload.given_name || payload.name?.split(" ")[0] || "User";
      const lastName = payload.family_name || (payload.name?.split(" ").slice(1).join(" ") || null);

      return {
        sub: payload.sub,
        email,
        emailVerified: true,
        firstName,
        lastName,
        picture: payload.picture || null,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.warn(`[GoogleAuth] Verification failed: ${error.message}`);
      throw new AppError("Invalid or expired Google credential", 401);
    }
  }
}

module.exports = new GoogleAuthHelper();
