const express = require("express");
const router = express.Router();

const usageController = require("../controllers/usage.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// All usage routes require authentication
router.use(auth);

// Tenant usage summary
router.get(
  "/summary",
  authorize("COMPANY_ADMIN", "MANAGER", "EMPLOYEE"),
  usageController.getSummary
);

// Alias GET / to summary
router.get(
  "/",
  authorize("COMPANY_ADMIN", "MANAGER", "EMPLOYEE"),
  usageController.getSummary
);

// Tenant historical usage
router.get(
  "/history",
  authorize("COMPANY_ADMIN", "MANAGER", "EMPLOYEE"),
  usageController.getHistory
);

// Meta conversation analytics & billing sync
router.post(
  "/meta/sync",
  authorize("COMPANY_ADMIN"),
  usageController.syncMetaUsage
);

// Platform aggregate usage for SUPER_ADMIN
router.get(
  "/owner-aggregate",
  authorize("SUPER_ADMIN"),
  usageController.getOwnerAggregate
);

module.exports = router;
