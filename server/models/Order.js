const mongoose = require("mongoose");

// ── Order Item Sub-Schema ─────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    name: {
      type: String,
      required: true, // Snapshot at time of order (in case menu changes)
    },
    price: {
      type: Number,
      required: true, // Snapshot at time of order
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      max: [20, "Cannot order more than 20 of one item"],
    },
  },
  { _id: false } // No separate _id for sub-documents
);

// ── Order Schema ──────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must contain at least one item",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Placed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Placed",
    },
    // ── Queue Tracking ────────────────────────────────────────────────────
    queuePosition: {
      type: Number,
      default: null, // Set when order enters "Preparing" state
    },
    estimatedTime: {
      type: Number, // in minutes
      default: null, // Calculated: queuePosition × avgPrepTime
    },
    // ── Delivery Info ─────────────────────────────────────────────────────
    deliveryAddress: {
      type: String,
      default: "",
    },
    specialInstructions: {
      type: String,
      default: "",
      maxlength: [300, "Special instructions cannot exceed 300 characters"],
    },
    // ── Timestamps for each status change ────────────────────────────────
    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 }); // For queue position queries
orderSchema.index({ createdAt: -1 }); // For admin listing (newest first)

// ── Pre-save Hook: Auto-append to statusHistory on status change ──────────────
orderSchema.pre("save", function () {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
});

// ── Virtual: itemCount ────────────────────────────────────────────────────────
orderSchema.virtual("itemCount").get(function () {
  return (this.items || []).reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Order", orderSchema);
