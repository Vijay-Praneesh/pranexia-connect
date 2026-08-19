const express = require("express");
const router = express.Router();

const campaignRecipientController = require("../controllers/campaignRecipient.controller");
const auth = require("../middlewares/auth.middleware");

// All recipient routes require authentication
router.use(auth);

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