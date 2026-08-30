const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboard.controller");
const ownerDashboardController = require("../controllers/ownerDashboard.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// All dashboard routes require authentication
router.use(auth);

// Dashboard Summary
router.get("/summary", authorize("COMPANY_ADMIN"), dashboardController.getSummary);

// SaaS owner dashboard summary
router.get(
	"/owner-summary",
	authorize("SUPER_ADMIN"),
	ownerDashboardController.getSummary
);

module.exports = router;
