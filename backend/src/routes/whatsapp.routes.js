const express = require("express");
const router = express.Router();
const controller = require("../controllers/whatsapp.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

router.use(auth);
router.use(authorize("COMPANY_ADMIN"));
router.get("/status", controller.getStatus);
router.post("/connect", controller.connect);
router.post("/disconnect", controller.disconnect);

module.exports = router;
