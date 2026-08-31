const express = require("express");
const router = express.Router();

const planController = require("../controllers/plan.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// All plan routes require authentication
router.use(auth);

// Get standard commercial plan definitions
router.get("/", planController.getPlans);

// Get current company plan and usage/limits overview
router.get(
  "/current",
  authorize("COMPANY_ADMIN", "MANAGER", "EMPLOYEE"),
  planController.getCurrentPlan
);

// Alias GET /usage to current plan overview
router.get(
  "/usage",
  authorize("COMPANY_ADMIN", "MANAGER", "EMPLOYEE"),
  planController.getCurrentPlan
);

// Assign / update company plan (SUPER_ADMIN only)
router.patch(
  "/assign/:companyId",
  authorize("SUPER_ADMIN"),
  planController.assignPlan
);

module.exports = router;
