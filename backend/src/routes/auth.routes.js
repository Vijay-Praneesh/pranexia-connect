const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);
router.get(
  "/me",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  authController.me,
);

module.exports = router;
