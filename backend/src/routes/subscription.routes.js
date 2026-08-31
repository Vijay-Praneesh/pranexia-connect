const express = require("express");
const router = express.Router();

const subscriptionController = require("../controllers/subscription.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// All subscription routes require authentication
router.use(auth);

// Tenant-scoped endpoints
router.get(
  "/current",
  authorize("COMPANY_ADMIN", "MANAGER", "EMPLOYEE", "SUPER_ADMIN"),
  subscriptionController.getCurrentSubscription
);

router.get(
  "/history",
  authorize("COMPANY_ADMIN", "MANAGER", "EMPLOYEE", "SUPER_ADMIN"),
  subscriptionController.getSubscriptionHistory
);

router.get(
  "/change-plan/preview",
  authorize("COMPANY_ADMIN", "SUPER_ADMIN"),
  subscriptionController.previewPlanChange
);

router.post(
  "/change-plan",
  authorize("COMPANY_ADMIN", "SUPER_ADMIN"),
  subscriptionController.changePlan
);

router.post(
  "/cancel-pending-plan",
  authorize("COMPANY_ADMIN", "SUPER_ADMIN"),
  subscriptionController.cancelPendingDowngrade
);

// SUPER_ADMIN Management Endpoints
router.get(
  "/company/:companyId",
  authorize("SUPER_ADMIN"),
  subscriptionController.getCompanySubscription
);

router.post(
  "/company/:companyId/trial",
  authorize("SUPER_ADMIN"),
  subscriptionController.startTrial
);

router.post(
  "/company/:companyId/activate",
  authorize("SUPER_ADMIN"),
  subscriptionController.activateSubscription
);

router.post(
  "/company/:companyId/change-plan",
  authorize("SUPER_ADMIN"),
  subscriptionController.changePlan
);

router.post(
  "/company/:companyId/cancel",
  authorize("SUPER_ADMIN"),
  subscriptionController.cancelSubscription
);

router.post(
  "/company/:companyId/expire",
  authorize("SUPER_ADMIN"),
  subscriptionController.expireSubscription
);

module.exports = router;
