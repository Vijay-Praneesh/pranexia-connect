const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const customerRoutes = require("./customer.routes");
const templateRoutes = require("./template.routes");
const campaignRoutes = require("./campaign.routes");
const campaignRecipientRoutes = require("./campaignRecipient.routes");
const webhookRoutes = require("./webhook.routes");
const dashboardRoutes = require("./dashboard.routes");

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/customers", customerRoutes);
router.use("/templates", templateRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/campaign-recipients", campaignRecipientRoutes);

// Dashboard
router.use("/dashboard", dashboardRoutes);

module.exports = router;
