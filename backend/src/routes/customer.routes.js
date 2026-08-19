const express = require("express");
const router = express.Router();

const customerController = require("../controllers/customer.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const upload = require("../middlewares/upload.middleware");

// Create Customer
router.post(
  "/",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.create
);

// Get All Customers
router.get(
  "/",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.getAll
);

// Search Customers
router.get(
  "/search",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.search
);

// Customer Dashboard Statistics
router.get(
  "/dashboard",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.dashboard
);

// Export Customers
router.get(
  "/export",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.exportCustomers
);

// Download Customer Import Template
router.get(
  "/template",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.downloadTemplate
);


// Bulk Delete Customers
router.delete(
  "/bulk-delete",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.bulkDelete
);

// Bulk Restore Customers
router.put(
  "/bulk-restore",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.bulkRestore
);

// Bulk Status Update
router.put(
  "/bulk-status",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.bulkStatusUpdate
);

// Import Customers
router.post(
  "/import",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  upload.single("file"),
  customerController.importCustomers
);

// Customer Campaign History
router.get(
  "/:id/history",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.getHistory
);

// Get Customer By Id
router.get(
  "/:id",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.getById
);

// Update Customer
router.put(
  "/:id",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.update
);

// Restore Customer
router.put(
  "/:id/restore",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.restore
);

// Delete Customer
router.delete(
  "/:id",
  authMiddleware,
  authorize("COMPANY_ADMIN"),
  customerController.delete
);

module.exports = router;