const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["burger", "pizza", "sides", "drinks", "dessert", "salad"],
      lowercase: true,
    },
    image: { type: String, default: "" },
    tags: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    preparationTime: {
      type: Number,
      default: 5,
      min: [1, "Preparation time must be at least 1 minute"],
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ orderCount: -1 });
menuItemSchema.index({ name: "text", description: "text", tags: "text" });

module.exports = mongoose.model("MenuItem", menuItemSchema);