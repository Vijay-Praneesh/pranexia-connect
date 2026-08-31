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
const companyRoutes = require("./company.routes");
const whatsappRoutes = require("./whatsapp.routes");
const mediaRoutes = require("./media.routes");
const usageRoutes = require("./usage.routes");
const planRoutes = require("./plan.routes");
const subscriptionRoutes = require("./subscription.routes");

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/customers", customerRoutes);
router.use("/templates", templateRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/campaign-recipients", campaignRecipientRoutes);

// Dashboard
router.use("/dashboard", dashboardRoutes);

// SaaS Client Management
router.use("/companies", companyRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/media", mediaRoutes);

// Usage & Cost Tracking
router.use("/usage", usageRoutes);

// Plans & Limits
router.use("/plans", planRoutes);

// Subscriptions
router.use("/subscriptions", subscriptionRoutes);

module.exports = router;
