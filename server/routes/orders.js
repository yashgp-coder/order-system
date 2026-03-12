const express = require("express");
const router = express.Router();
const { createOrder, getMyOrders, getOrderById, cancelOrder } = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

// All order routes require authentication
router.post("/",            protect, createOrder);
router.get("/my",           protect, getMyOrders);
router.get("/:id",          protect, getOrderById);
router.patch("/:id/cancel", protect, cancelOrder);

module.exports = router;
