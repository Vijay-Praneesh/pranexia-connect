const crypto = require("crypto");
const logger = require("../config/logger");
const webhookService = require("../services/webhook.service");

class WebhookController {
  // =====================================================
  // Verify Meta Webhook
  // =====================================================
  async verifyWebhook(req, res) {
    try {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (
        mode === "subscribe" &&
        token === process.env.WHATSAPP_VERIFY_TOKEN
      ) {
        logger.info("WhatsApp webhook verified");
        return res.status(200).send(challenge);
      }

      logger.warn("WhatsApp webhook verification failed");
      return res.sendStatus(403);
    } catch (error) {
      logger.error("WhatsApp webhook verification failed");

      return res.status(500).json({
        success: false,
        message: "Webhook verification failed",
      });
    }
  }

  // =====================================================
  // Receive Webhook Events
  // =====================================================
  async receiveWebhook(req, res) {
    try {
      const signature = req.get("x-hub-signature-256");
      const appSecret = process.env.WHATSAPP_APP_SECRET;

      if (!appSecret || !signature || !req.rawBody) {
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
        return res.sendStatus(401);
      }

      await webhookService.processWebhook(req.body);

      return res.sendStatus(200);
    } catch (error) {
      logger.error("WhatsApp webhook processing failed");

      return res.status(500).json({
        success: false,
        message: "Webhook processing failed",
      });
    }
  }
}

module.exports = new WebhookController();
