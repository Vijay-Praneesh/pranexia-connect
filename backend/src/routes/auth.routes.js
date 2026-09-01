const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const { authRateLimiter } = require("../middlewares/rateLimiter.middleware");

// Email/Password Register & Login
router.post("/register", authRateLimiter, authController.register);
router.post("/login", authRateLimiter, authController.login);

// Google Sign-In & Onboarding
router.post("/google", authRateLimiter, authController.googleAuth);
router.post("/google/onboard", authRateLimiter, authController.googleOnboard);

// Google Account Linking (Authenticated)
router.post("/google/link", authMiddleware, authRateLimiter, authController.googleLink);
router.post("/google/unlink", authMiddleware, authRateLimiter, authController.googleUnlink);

// Current User Profile
router.get(
  "/me",
  authMiddleware,
  authorize("COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER", "EMPLOYEE"),
  authController.me
);

module.exports = router;

