const { Server } = require("socket.io");

let io; // Singleton instance

/**
 * Initialize Socket.io with the HTTP server
 * @param {http.Server} httpServer
 * @returns {Server} io instance
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Reconnection settings
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── Room Management ──────────────────────────────────────────────────
    // Users join their personal room to receive private order updates
    socket.on("join:user", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined room: user_${userId}`);
    });

    // Admins join the shared admin room
    socket.on("join:admin", () => {
      socket.join("admin_room");
      console.log(`🛡️  Admin joined admin_room`);
    });

    // Leave rooms on explicit request
    socket.on("leave:user", (userId) => {
      socket.leave(`user_${userId}`);
      console.log(`👤 User ${userId} left room: user_${userId}`);
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} — Reason: ${reason}`);
    });

    // ── Error Handling ───────────────────────────────────────────────────
    socket.on("error", (error) => {
      console.error(`❌ Socket error on ${socket.id}:`, error);
    });
  });

  console.log("✅ Socket.io initialized");
  return io;
};

/**
 * Get the Socket.io instance anywhere in the app
 * Usage: const io = getIO(); io.to('room').emit('event', data);
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocket(server) first.");
  }
  return io;
};

// ── Emit Helpers (used by controllers) ──────────────────────────────────────

/**
 * Notify admin room of a new order
 */
const emitNewOrder = (order) => {
  getIO().to("admin_room").emit("order:placed", { order });
};

/**
 * Notify user and admins of an order status change
 */
const emitStatusUpdate = (order) => {
  // order.user may be a populated object {_id,...} or a plain ObjectId — handle both
  const userId = order.user?._id ?? order.user;
  getIO().to(`user_${userId}`).emit("order:statusUpdated", { order });
  getIO().to("admin_room").emit("order:statusUpdated", { order });
};

/**
 * Broadcast queue update to all connected clients
 * Called whenever queue positions shift (status changes)
 */
const emitQueueUpdate = (queueData) => {
  getIO().emit("queue:updated", queueData);
};

module.exports = {
  initSocket,
  getIO,
  emitNewOrder,
  emitStatusUpdate,
  emitQueueUpdate,
};