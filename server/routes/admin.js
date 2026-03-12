const express = require("express");
const router = express.Router();
const { updateOrderStatus, getAllOrders, getQueue, getDashboardStats } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.use(protect, adminOnly); // All routes admin-only

router.get("/stats",               getDashboardStats);
router.get("/orders",              getAllOrders);
router.get("/queue",               getQueue);
router.patch("/orders/:id/status", updateOrderStatus);

module.exports = router;