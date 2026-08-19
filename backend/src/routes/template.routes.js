const express = require("express");
const router = express.Router();

const templateController = require("../controllers/template.controller");
const auth = require("../middlewares/auth.middleware");

// All routes require authentication
router.use(auth);

// Search
router.get("/search", templateController.search);

// CRUD
router.post("/", templateController.create);
router.get("/", templateController.getAll);
router.get("/:id", templateController.getById);
router.put("/:id", templateController.update);
router.delete("/:id", templateController.delete);

module.exports = router;