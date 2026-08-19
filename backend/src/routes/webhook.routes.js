const express = require("express");
const router = express.Router();

const webhookController = require("../controllers/webhook.controller");

// Meta Webhook Verification
router.get("/", webhookController.verifyWebhook);

// Meta Webhook Events
router.post("/", webhookController.receiveWebhook);

module.exports = router;