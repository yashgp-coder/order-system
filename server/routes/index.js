const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

  res.status(200).json({
    success: true,
    message: "Order Management System API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: {
      status: statusMap[dbStatus] || "unknown",
      host: mongoose.connection.host || "not connected",
    },
    version: "1.0.0",
  });
});

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Real-Time Order Management System API",
    version: "1.0.0",
    endpoints: {
      health: "GET /api/health",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me",
      },
      menu: {
        list: "GET /api/menu",
        single: "GET /api/menu/:id",
      },
      orders: {
        create: "POST /api/orders",
        myOrders: "GET /api/orders/my",
        single: "GET /api/orders/:id",
      },
      admin: {
        allOrders: "GET /api/admin/orders",
        updateStatus: "PATCH /api/admin/orders/:id/status",
      },
    },
  });
});

module.exports = router;