const Order = require("../models/Order");
const { emitStatusUpdate, emitQueueUpdate } = require("../config/socket");

// Valid status transitions — prevents illegal state jumps
const VALID_TRANSITIONS = {
  "Placed":           ["Preparing",        "Cancelled"],
  "Preparing":        ["Out for Delivery", "Cancelled"],
  "Out for Delivery": ["Delivered"],
  "Delivered":        [],   // Terminal state
  "Cancelled":        [],   // Terminal state
};

// ── Helper: build and broadcast current queue snapshot ───────────────────────
const broadcastQueueUpdate = async () => {
  const preparingOrders = await Order.find({ status: "Preparing" })
    .sort({ createdAt: 1 })
    .populate("user", "name")
    .select("_id user items totalAmount createdAt");

  const queueData = preparingOrders.map((order, idx) => ({
    _id:         order._id,
    position:    idx + 1,
    user:        order.user?.name || "Unknown",
    itemCount:   order.items.reduce((sum, i) => sum + i.quantity, 0),
    totalAmount: order.totalAmount,
    createdAt:   order.createdAt,
    estimatedTime: (idx + 1) * 5, // 5 minutes per position
  }));

  emitQueueUpdate(queueData);
  return queueData;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update an order's status (admin only)
// @route   PATCH /api/admin/orders/:id/status
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const order = await Order.findById(req.params.id).populate("user", "_id name email");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    // ── Validate transition ───────────────────────────────────────────────
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from "${order.status}" to "${status}". Allowed: ${allowed.join(", ") || "none"}.`,
      });
    }

    // ── Apply update ──────────────────────────────────────────────────────
    const prevStatus = order.status;
    order.status = status;

    // Set queuePosition when order enters Preparing
    if (status === "Preparing") {
      const preparingCount = await Order.countDocuments({ status: "Preparing" });
      order.queuePosition = preparingCount + 1;
      order.estimatedTime = order.queuePosition * 5;
    }

    // Clear queue data when leaving Preparing
    if (prevStatus === "Preparing" && status !== "Preparing") {
      order.queuePosition = null;
      order.estimatedTime = null;
    }

    await order.save();

    // ── Emit real-time events ─────────────────────────────────────────────
    // Notify the user whose order was updated
    emitStatusUpdate(order);

    // Rebuild and broadcast updated queue if queue changed
    if (prevStatus === "Preparing" || status === "Preparing") {
      await broadcastQueueUpdate();
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to "${status}".`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all orders (admin view, newest first)
// @route   GET /api/admin/orders
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== "all") query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("items.menuItem", "name image category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // ── Status summary counts ─────────────────────────────────────────────
    const summary = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusCounts = summary.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      statusCounts,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get current kitchen queue (Preparing orders)
// @route   GET /api/admin/queue
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const getQueue = async (req, res, next) => {
  try {
    const queueData = await broadcastQueueUpdate();
    res.status(200).json({ success: true, queue: queueData });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get dashboard stats (orders today, revenue, active count)
// @route   GET /api/admin/stats
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const now    = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayOrders, totalRevenue, activeOrders, allTimeOrders] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.aggregate([
        { $match: { status: { $in: ["Delivered"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.countDocuments({ status: { $in: ["Placed", "Preparing", "Out for Delivery"] } }),
      Order.countDocuments(),
    ]);

    const todayRevenue = await Order.aggregate([
      { $match: { status: "Delivered", createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        todayOrders,
        todayRevenue:  todayRevenue[0]?.total  || 0,
        totalRevenue:  totalRevenue[0]?.total  || 0,
        activeOrders,
        allTimeOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateOrderStatus, getAllOrders, getQueue, getDashboardStats };
