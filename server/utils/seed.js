require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");

const users = [
  { name: "Admin User",  email: "admin@orderflow.com", password: "admin123", role: "admin" },
  { name: "John Doe",    email: "user@orderflow.com",  password: "user123",  role: "user"  },
  { name: "Jane Smith",  email: "jane@orderflow.com",  password: "user123",  role: "user"  },
];

const menuItems = [
  // ── Burgers ───────────────────────────────────────────────────────────────
  {
    name: "Classic Smash Burger",
    description: "Double smashed beef patty, American cheese, pickles, onions, mustard & ketchup on a toasted brioche bun.",
    price: 12.99, category: "burger",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
    tags: ["bestseller", "beef", "classic"], preparationTime: 8, rating: 4.8, orderCount: 320,
  },
  {
    name: "BBQ Bacon Burger",
    description: "Thick beef patty, crispy smoked bacon, cheddar cheese, BBQ sauce, caramelized onions and jalapeños.",
    price: 14.99, category: "burger",
    image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&q=80",
    tags: ["spicy", "beef", "bacon"], preparationTime: 10, rating: 4.7, orderCount: 210,
  },
  {
    name: "Crispy Chicken Burger",
    description: "Buttermilk fried chicken breast, coleslaw, pickles, and sriracha mayo on a sesame bun.",
    price: 13.49, category: "burger",
    image: "https://images.unsplash.com/photo-1606755962773-d324e9a13086?w=400&q=80",
    tags: ["chicken", "crispy", "spicy"], preparationTime: 10, rating: 4.6, orderCount: 185,
  },
  {
    name: "Veggie Mushroom Burger",
    description: "Grilled portobello mushroom, pesto aioli, roasted red peppers, goat cheese, and arugula.",
    price: 11.99, category: "burger",
    image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&q=80",
    tags: ["vegetarian", "healthy"], preparationTime: 7, rating: 4.3, orderCount: 95,
  },
  // ── Pizza ─────────────────────────────────────────────────────────────────
  {
    name: "Pepperoni Inferno",
    description: "San Marzano tomato base, triple pepperoni, fresh mozzarella, chilli oil drizzle. 12-inch thin crust.",
    price: 16.99, category: "pizza",
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80",
    tags: ["bestseller", "spicy", "meat"], preparationTime: 12, rating: 4.9, orderCount: 405,
  },
  {
    name: "Margherita Classica",
    description: "San Marzano tomatoes, fresh buffalo mozzarella, basil, extra virgin olive oil. Simple. Perfect.",
    price: 14.49, category: "pizza",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80",
    tags: ["vegetarian", "classic", "italian"], preparationTime: 10, rating: 4.7, orderCount: 290,
  },
  {
    name: "BBQ Chicken & Bacon",
    description: "Smoky BBQ base, grilled chicken, crispy bacon, red onion, mozzarella, and fresh coriander.",
    price: 17.99, category: "pizza",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
    tags: ["chicken", "bacon", "bbq"], preparationTime: 12, rating: 4.6, orderCount: 220,
  },
  // ── Sides ─────────────────────────────────────────────────────────────────
  {
    name: "Garlic Parmesan Fries",
    description: "Crispy shoestring fries tossed in roasted garlic butter, Parmesan, and fresh parsley.",
    price: 5.99, category: "sides",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80",
    tags: ["vegetarian", "crispy", "popular"], preparationTime: 5, rating: 4.7, orderCount: 510,
  },
  {
    name: "Loaded Onion Rings",
    description: "Beer-battered thick-cut onion rings served with smoky chipotle dipping sauce.",
    price: 6.49, category: "sides",
    image: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&q=80",
    tags: ["vegetarian", "crispy"], preparationTime: 6, rating: 4.5, orderCount: 260,
  },
  {
    name: "Garlic Bread",
    description: "Toasted sourdough with herb garlic butter and a sprinkle of Parmesan. Perfect pizza companion.",
    price: 4.49, category: "sides",
    image: "https://images.unsplash.com/photo-1619535860434-cf9b902a9938?w=400&q=80",
    tags: ["vegetarian", "italian", "shareable"], preparationTime: 4, rating: 4.4, orderCount: 380,
  },
  // ── Drinks ────────────────────────────────────────────────────────────────
  {
    name: "Craft Lemonade",
    description: "Freshly squeezed lemonade with mint, basil, and a hint of honey. Still or sparkling.",
    price: 3.99, category: "drinks",
    image: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&q=80",
    tags: ["cold", "fresh", "non-alcoholic"], preparationTime: 2, rating: 4.6, orderCount: 340,
  },
  {
    name: "Chocolate Milkshake",
    description: "Thick and creamy shake made with premium Belgian chocolate ice cream. Topped with whipped cream.",
    price: 6.99, category: "drinks",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80",
    tags: ["cold", "sweet", "indulgent"], preparationTime: 3, rating: 4.8, orderCount: 275,
  },
  // ── Dessert ───────────────────────────────────────────────────────────────
  {
    name: "Warm Brownie Sundae",
    description: "Fudgy dark chocolate brownie, vanilla bean ice cream, hot fudge sauce, and crushed walnuts.",
    price: 7.99, category: "dessert",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80",
    tags: ["sweet", "chocolate", "warm"], preparationTime: 5, rating: 4.9, orderCount: 195,
  },
  // ── Salad ─────────────────────────────────────────────────────────────────
  {
    name: "Caesar Salad",
    description: "Crisp romaine, house-made Caesar dressing, anchovy croutons, shaved Parmesan. Add grilled chicken +$3.",
    price: 10.99, category: "salad",
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&q=80",
    tags: ["healthy", "classic", "vegetarian"], preparationTime: 5, rating: 4.5, orderCount: 130,
  },
  {
    name: "Avocado & Quinoa Bowl",
    description: "Tri-color quinoa, sliced avocado, cherry tomatoes, cucumber, feta, lemon-tahini dressing.",
    price: 12.49, category: "salad",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
    tags: ["healthy", "vegetarian", "gluten-free"], preparationTime: 5, rating: 4.4, orderCount: 88,
  },
];

const clearDB = async () => {
  console.log("🗑️  Clearing existing data...");
  await Promise.all([User.deleteMany({}), MenuItem.deleteMany({}), Order.deleteMany({})]);
  console.log("✅ Database cleared");
};

const seedUsers = async () => {
  console.log("\n👤 Seeding users...");
  const createdUsers = [];
  for (const userData of users) {
    const user = new User(userData);
    await user.save();
    createdUsers.push(user);
    console.log(`   ✅ Created ${user.role}: ${user.email}`);
  }
  return createdUsers;
};

const seedMenuItems = async () => {
  console.log("\n🍔 Seeding menu items...");
  const items = await MenuItem.insertMany(menuItems);
  const byCategory = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  Object.entries(byCategory).forEach(([cat, count]) => console.log(`   ✅ ${count} ${cat} item(s)`));
  console.log(`   📦 Total: ${items.length} menu items`);
  return items;
};

const seedOrders = async (users, menuItems) => {
  console.log("\n📋 Seeding sample orders...");
  const regularUser = users.find((u) => u.email === "user@orderflow.com");
  const janeUser    = users.find((u) => u.email === "jane@orderflow.com");
  const find = (name) => menuItems.find((i) => i.name === name);

  const sampleOrders = [
    {
      user: regularUser._id,
      items: [
        { menuItem: find("Classic Smash Burger")._id, name: "Classic Smash Burger",    price: 12.99, quantity: 2 },
        { menuItem: find("Garlic Parmesan Fries")._id, name: "Garlic Parmesan Fries",   price: 5.99,  quantity: 1 },
        { menuItem: find("Craft Lemonade")._id,        name: "Craft Lemonade",           price: 3.99,  quantity: 2 },
      ],
      totalAmount: 39.95, status: "Delivered", deliveryAddress: "123 Main Street, Apt 4B",
      statusHistory: [
        { status: "Placed",           changedAt: new Date(Date.now() - 3600000 * 3)   },
        { status: "Preparing",        changedAt: new Date(Date.now() - 3600000 * 2.5) },
        { status: "Out for Delivery", changedAt: new Date(Date.now() - 3600000 * 2)   },
        { status: "Delivered",        changedAt: new Date(Date.now() - 3600000 * 1.5) },
      ],
    },
    {
      user: regularUser._id,
      items: [
        { menuItem: find("Pepperoni Inferno")._id,   name: "Pepperoni Inferno",   price: 16.99, quantity: 1 },
        { menuItem: find("Garlic Bread")._id,         name: "Garlic Bread",        price: 4.49,  quantity: 1 },
        { menuItem: find("Chocolate Milkshake")._id,  name: "Chocolate Milkshake", price: 6.99,  quantity: 1 },
      ],
      totalAmount: 28.47, status: "Preparing", queuePosition: 2, estimatedTime: 10,
      deliveryAddress: "123 Main Street, Apt 4B",
      statusHistory: [
        { status: "Placed",    changedAt: new Date(Date.now() - 600000) },
        { status: "Preparing", changedAt: new Date(Date.now() - 300000) },
      ],
    },
    {
      user: janeUser._id,
      items: [
        { menuItem: find("BBQ Bacon Burger")._id,   name: "BBQ Bacon Burger",   price: 14.99, quantity: 1 },
        { menuItem: find("Loaded Onion Rings")._id,  name: "Loaded Onion Rings", price: 6.49,  quantity: 1 },
        { menuItem: find("Craft Lemonade")._id,      name: "Craft Lemonade",     price: 3.99,  quantity: 1 },
      ],
      totalAmount: 25.47, status: "Placed", deliveryAddress: "456 Oak Avenue",
      statusHistory: [{ status: "Placed", changedAt: new Date(Date.now() - 120000) }],
    },
    {
      user: janeUser._id,
      items: [
        { menuItem: find("Pepperoni Inferno")._id, name: "Pepperoni Inferno", price: 16.99, quantity: 1 },
        { menuItem: find("Garlic Bread")._id,       name: "Garlic Bread",     price: 4.49,  quantity: 2 },
        { menuItem: find("Caesar Salad")._id,        name: "Caesar Salad",     price: 10.99, quantity: 1 },
      ],
      totalAmount: 46.46, status: "Delivered", deliveryAddress: "456 Oak Avenue",
      statusHistory: [
        { status: "Placed",           changedAt: new Date(Date.now() - 3600000 * 6)   },
        { status: "Preparing",        changedAt: new Date(Date.now() - 3600000 * 5.5) },
        { status: "Out for Delivery", changedAt: new Date(Date.now() - 3600000 * 5)   },
        { status: "Delivered",        changedAt: new Date(Date.now() - 3600000 * 4.5) },
      ],
    },
    {
      user: regularUser._id,
      items: [
        { menuItem: find("Avocado & Quinoa Bowl")._id, name: "Avocado & Quinoa Bowl", price: 12.49, quantity: 1 },
        { menuItem: find("Craft Lemonade")._id,         name: "Craft Lemonade",         price: 3.99,  quantity: 1 },
      ],
      totalAmount: 16.48, status: "Out for Delivery", deliveryAddress: "123 Main Street, Apt 4B",
      statusHistory: [
        { status: "Placed",           changedAt: new Date(Date.now() - 3600000 * 1)   },
        { status: "Preparing",        changedAt: new Date(Date.now() - 3600000 * 0.7) },
        { status: "Out for Delivery", changedAt: new Date(Date.now() - 3600000 * 0.3) },
      ],
    },
  ];

  const createdOrders = await Order.insertMany(sampleOrders);
  for (const order of createdOrders) {
    await User.findByIdAndUpdate(order.user, { $push: { orderHistory: order._id } });
  }
  console.log(`   ✅ ${createdOrders.length} orders created & linked to users`);
  return createdOrders;
};

const printSummary = (users, menuItems, orders) => {
  console.log("\n══════════════════════════════════════════════");
  console.log("  ✅  DATABASE SEEDED SUCCESSFULLY");
  console.log("══════════════════════════════════════════════");
  console.log(`\n  Users:      ${users.length}`);
  console.log(`  Menu Items: ${menuItems.length}`);
  console.log(`  Orders:     ${orders.length}`);
  console.log("\n  ── Login Credentials ──────────────────────");
  console.log("  Admin:  admin@orderflow.com / admin123");
  console.log("  User 1: user@orderflow.com  / user123");
  console.log("  User 2: jane@orderflow.com  / user123");
  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
  console.log("\n  ── Order Statuses Seeded ───────────────────");
  Object.entries(statusCounts).forEach(([s, c]) => console.log(`  ${s.padEnd(20)} ${c} order(s)`));
  console.log("══════════════════════════════════════════════\n");
};

const runSeed = async () => {
  try {
    console.log("\n🌱 Starting database seed...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    await clearDB();
    const seededUsers   = await seedUsers();
    const seededItems   = await seedMenuItems();
    const seededOrders  = await seedOrders(seededUsers, seededItems);
    printSummary(seededUsers, seededItems, seededOrders);
    await mongoose.disconnect();
    console.log("✅ Seed complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runSeed();