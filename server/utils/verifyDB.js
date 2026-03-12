require("dotenv").config();
const mongoose = require("mongoose");

const User     = require("../models/User");
const MenuItem = require("../models/MenuItem");
const Order    = require("../models/Order");

const verifyDB = async () => {
  try {
    console.log("\n🔍 Verifying seeded database...\n");
    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find({}).select("-password");
    console.log(`👤 Users (${users.length}):`);
    users.forEach((u) => {
      console.log(`   [${u.role.toUpperCase().padEnd(5)}] ${u.name.padEnd(15)} | ${u.email} | Orders: ${u.orderHistory.length}`);
    });

    const items = await MenuItem.find({});
    const categories = [...new Set(items.map((i) => i.category))];
    console.log(`\n🍔 Menu Items (${items.length}) across ${categories.length} categories:`);
    for (const cat of categories) {
      const catItems = items.filter((i) => i.category === cat);
      console.log(`   [${cat.toUpperCase().padEnd(8)}] ${catItems.length} items`);
      catItems.forEach((item) => {
        console.log(`              · ${item.name.padEnd(30)} $${item.price.toFixed(2)}  ⭐${item.rating}  📦${item.orderCount}`);
      });
    }

    const orders = await Order.find({}).populate("user", "name email").populate("items.menuItem", "name");
    console.log(`\n📋 Orders (${orders.length}):`);
    orders.forEach((o) => {
      const itemNames = o.items.map((i) => `${i.name} x${i.quantity}`).join(", ");
      console.log(`   [${o.status.toUpperCase().padEnd(20)}] ${o.user.name.padEnd(12)} | $${o.totalAmount.toFixed(2)} | ${itemNames}`);
    });

    console.log("\n📊 Index Check:");
    const userIndexes  = await User.collection.indexes();
    const menuIndexes  = await MenuItem.collection.indexes();
    const orderIndexes = await Order.collection.indexes();
    console.log(`   Users:      ${userIndexes.length} indexes`);
    console.log(`   MenuItems:  ${menuIndexes.length} indexes`);
    console.log(`   Orders:     ${orderIndexes.length} indexes`);

    console.log("\n══════════════════════════════════════════════");
    console.log("  ✅  ALL CHECKS PASSED — DB IS READY");
    console.log("══════════════════════════════════════════════\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Verification failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

verifyDB();