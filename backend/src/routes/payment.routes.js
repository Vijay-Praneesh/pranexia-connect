const express = require("express");
const paymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const router = express.Router();

// Public: Commercial Pricing Matrix
router.get("/pricing", paymentController.getPricing);

// Public Webhook: Payment Gateway Callback (uses rawBody + HMAC signature verification)
router.post("/webhook", paymentController.handleWebhook);

// Protected Tenant Routes (Authenticated client admins and super admins)
router.use(authMiddleware);

router.post(
  "/order",
  authorize("COMPANY_ADMIN", "SUPER_ADMIN"),
  paymentController.createOrder
);

router.post(
  "/verify",
  authorize("COMPANY_ADMIN", "SUPER_ADMIN"),
  paymentController.verifyPayment
);

router.get(
  "/history",
  authorize("COMPANY_ADMIN", "SUPER_ADMIN"),
  paymentController.getHistory
);

router.get(
  "/:id",
  authorize("COMPANY_ADMIN", "SUPER_ADMIN"),
  paymentController.getPayment
);

// Protected SUPER_ADMIN Platform Routes
router.get(
  "/admin/all",
  authorize("SUPER_ADMIN"),
  paymentController.getPlatformPayments
);

module.exports = router;
