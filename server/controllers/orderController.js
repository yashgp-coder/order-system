const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const User = require("../models/User");
const { emitNewOrder } = require("../config/socket");

// ── Helper: calculate queue position for "Preparing" orders ──────────────────
const calcQueuePosition = async (orderId) => {
  const preparingOrders = await Order.find({ status: "Preparing" }).sort({ createdAt: 1 });
  const idx = preparingOrders.findIndex((o) => o._id.toString() === orderId.toString());
  return idx === -1 ? null : idx + 1;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { items, deliveryAddress, specialInstructions } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order must contain at least one item." });
    }

    // ── Verify each item exists and recalculate price server-side ─────────
    let totalAmount = 0;
    const verifiedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Menu item "${item.name || item.menuItem}" is no longer available.`,
        });
      }

      const verifiedItem = {
        menuItem: menuItem._id,
        name:     menuItem.name,
        price:    menuItem.price,   // Always use server price — never trust client
        quantity: item.quantity,
      };

      totalAmount += menuItem.price * item.quantity;
      verifiedItems.push(verifiedItem);

      // Increment orderCount for recommendation engine
      await MenuItem.findByIdAndUpdate(menuItem._id, { $inc: { orderCount: 1 } });
    }

    // ── Create the order ──────────────────────────────────────────────────
    const order = await Order.create({
      user:                req.user._id,
      items:               verifiedItems,
      totalAmount:         Math.round(totalAmount * 100) / 100,
      status:              "Placed",
      deliveryAddress:     deliveryAddress || "",
      specialInstructions: specialInstructions || "",
    });

    // ── Link order to user's history ──────────────────────────────────────
    await User.findByIdAndUpdate(req.user._id, { $push: { orderHistory: order._id } });

    // ── Populate for response ─────────────────────────────────────────────
    const populatedOrder = await Order.findById(order._id).populate("items.menuItem", "name image category");

    // ── Emit real-time event to admin room ────────────────────────────────
    try {
      emitNewOrder(populatedOrder);
    } catch {
      // Socket may not be ready in tests — don't fail the request
    }

    res.status(201).json({ success: true, order: populatedOrder });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all orders for the logged-in user
// @route   GET /api/orders/my
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.menuItem", "name image category")
      .sort({ createdAt: -1 }); // Newest first

    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get single order by ID (only owner can view)
// @route   GET /api/orders/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.menuItem", "name image category price")
      .populate("user", "name email");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    // Only the order owner or an admin can view it
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to view this order." });
    }

    // Attach live queue position if order is Preparing
    let queuePosition = order.queuePosition;
    let estimatedTime = order.estimatedTime;

    if (order.status === "Preparing") {
      queuePosition = await calcQueuePosition(order._id);
      const AVG_PREP_TIME = 5; // minutes per order in queue
      estimatedTime = queuePosition ? queuePosition * AVG_PREP_TIME : null;
    }

    res.status(200).json({
      success: true,
      order: { ...order.toJSON(), queuePosition, estimatedTime },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Cancel an order (only if status is "Placed")
// @route   PATCH /api/orders/:id/cancel
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this order." });
    }

    if (order.status !== "Placed") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status "${order.status}". Only "Placed" orders can be cancelled.`,
      });
    }

    order.status = "Cancelled";
    await order.save();

    res.status(200).json({ success: true, message: "Order cancelled successfully.", order });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder };
