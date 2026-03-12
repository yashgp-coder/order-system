const express = require("express");
const router = express.Router();
const { getMenuItems, getMenuItemById, getCategories } = require("../controllers/menuController");
const { protect } = require("../middleware/authMiddleware");

router.get("/",           protect, getMenuItems);
router.get("/categories", protect, getCategories);
router.get("/:id",        protect, getMenuItemById);

module.exports = router;