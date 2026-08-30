const express = require("express");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const uploadMedia = require("../middlewares/media-upload.middleware");
const mediaController = require("../controllers/media.controller");

const router = express.Router();
router.use(auth, authorize("COMPANY_ADMIN"));
router.get("/", mediaController.list);
router.post("/upload", uploadMedia.single("file"), mediaController.upload);
router.get("/:id", mediaController.get);
router.delete("/:id", mediaController.delete);
module.exports = router;
