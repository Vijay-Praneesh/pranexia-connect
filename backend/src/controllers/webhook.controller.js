const crypto = require("crypto");
const logger = require("../config/logger");
const env = require("../config/env");
const webhookService = require("../services/webhook.service");

class WebhookController {
  // =====================================================
  // Verify Meta Webhook (GET)
  // =====================================================
  async verifyWebhook(req, res) {
    try {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];
      const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN || env.WHATSAPP_VERIFY_TOKEN;

      if (
        mode === "subscribe" &&
        configuredToken &&
        token === configuredToken
      ) {
        logger.info("WhatsApp webhook verified successfully");
        return res.status(200).send(challenge);
      }

      logger.warn("WhatsApp webhook verification failed: invalid mode or token");
      return res.sendStatus(403);
    } catch (error) {
      logger.error("WhatsApp webhook verification encountered an error");
      return res.sendStatus(500);
    }
  }

  // =====================================================
  // Receive Webhook Events (POST)
  // =====================================================
  async receiveWebhook(req, res) {
    try {
      const signature = req.get("x-hub-signature-256");
      const appSecret = process.env.WHATSAPP_APP_SECRET || env.WHATSAPP_APP_SECRET;

      if (!appSecret || !signature || !req.rawBody) {
        logger.warn("WhatsApp webhook rejected: missing secret, signature, or rawBody");
        return res.sendStatus(401);
      }

      const expected = `sha256=${crypto
        .createHmac("sha256", appSecret)
        .update(req.rawBody)
        .digest("hex")}`;
      const supplied = Buffer.from(signature);
      const computed = Buffer.from(expected);

      if (
        supplied.length !== computed.length ||
        !crypto.timingSafeEqual(supplied, computed)
      ) {
        logger.warn("WhatsApp webhook rejected: HMAC signature mismatch");
        return res.sendStatus(401);
      }

      await webhookService.processWebhook(req.body);

      return res.sendStatus(200);
    } catch (error) {
      logger.error("WhatsApp webhook processing failed");
      return res.sendStatus(500);
    }
  }
}

module.exports = new WebhookController();
