const express = require("express");

const router = express.Router();

const companyController = require("../controllers/company.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// All client-management routes require authentication
// and are restricted to the Pranexia platform owner.
router.use(authMiddleware);
router.use(authorize("SUPER_ADMIN"));

// Client companies
router.get("/", companyController.getAll);
router.post("/", companyController.create);
router.get("/:id", companyController.getById);
router.put("/:id", companyController.update);
router.patch("/:id/status", companyController.updateStatus);

module.exports = router;