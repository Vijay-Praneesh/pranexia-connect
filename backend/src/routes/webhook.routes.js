const express = require("express");
const router = express.Router();

const webhookController = require("../controllers/webhook.controller");

// Meta Webhook Verification
router.get("/", webhookController.verifyWebhook);
router.get("/whatsapp", webhookController.verifyWebhook);

// Meta Webhook Events
router.post("/", webhookController.receiveWebhook);
router.post("/whatsapp", webhookController.receiveWebhook);

module.exports = router;