const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboard.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// All dashboard routes require authentication
router.use(auth);
router.use(authorize("COMPANY_ADMIN"));

// Dashboard Summary
router.get("/summary", dashboardController.getSummary);

module.exports = router;
