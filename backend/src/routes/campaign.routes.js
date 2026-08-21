const express = require("express");
const router = express.Router();

const campaignController = require("../controllers/campaign.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

// All campaign routes require authentication
router.use(auth);
router.use(authorize("COMPANY_ADMIN"));

// Search
router.get("/search", campaignController.search);

// Campaign Report
router.get("/:id/report", campaignController.getReport);

// Send Campaign
router.post("/:id/send", campaignController.sendCampaign);

// Cancel Campaign
router.post("/:id/cancel", campaignController.cancel);

// CRUD
router.post("/", campaignController.create);
router.get("/", campaignController.getAll);
router.get("/:id", campaignController.getById);
router.put("/:id", campaignController.update);
router.delete("/:id", campaignController.delete);

module.exports = router;
