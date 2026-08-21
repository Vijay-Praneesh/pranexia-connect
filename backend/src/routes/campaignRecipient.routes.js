const express = require("express");
const router = express.Router();

const campaignRecipientController = require("../controllers/campaignRecipient.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// All recipient routes require authentication
router.use(auth);
router.use(authorize("COMPANY_ADMIN"));

// Search
router.get("/search", campaignRecipientController.search);

// Assign recipients
router.post("/assign", campaignRecipientController.assignRecipients);

// CRUD
router.get("/", campaignRecipientController.getAll);
router.get("/:id", campaignRecipientController.getById);
router.put("/:id", campaignRecipientController.update);
router.delete("/:id", campaignRecipientController.delete);

module.exports = router;
