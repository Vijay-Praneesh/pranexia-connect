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
        console.log("✅ WhatsApp Webhook Verified");
        return res.status(200).send(challenge);
      }

      console.log("❌ Webhook Verification Failed");
      return res.sendStatus(403);
    } catch (error) {
      console.error("Webhook Verification Error:", error.message);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // =====================================================
  // Receive Webhook Events
  // =====================================================
async receiveWebhook(req, res) {
  try {
    console.log("========== WEBHOOK EVENT ==========");
    console.dir(req.body, { depth: null });
    console.log("===================================");

    await webhookService.processWebhook(req.body);

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Processing Error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
}

module.exports = new WebhookController();