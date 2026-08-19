const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboard.controller");
const auth = require("../middlewares/auth.middleware");

// All dashboard routes require authentication
router.use(auth);

// Dashboard Summary
router.get("/summary", dashboardController.getSummary);

module.exports = router;