const Order     = require("../models/Order");
const MenuItem  = require("../models/MenuItem");

// ── Helper: score map → ranked MenuItem docs ─────────────────────────────────
const topItems = async (scoreMap, excludeIds = [], limit = 8) => {
  const excludeSet = new Set(excludeIds.map(String));
  const ranked = Object.entries(scoreMap)
    .filter(([id]) => !excludeSet.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (ranked.length === 0) return [];

  const items = await MenuItem.find({
    _id: { $in: ranked }, isAvailable: true,
  }).select("name description price category image tags rating preparationTime orderCount");

  const map = Object.fromEntries(items.map((i) => [String(i._id), i]));
  return ranked.map((id) => map[id]).filter(Boolean);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recommendations/personal   (Private)
// ─────────────────────────────────────────────────────────────────────────────
const getPersonalRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Step 1: user's last 10 orders
    const recentOrders = await Order.find({ user: userId })
      .sort({ createdAt: -1 }).limit(10).select("items");

    const userItemFreq = {};
    const recentItemIds = [];
    for (const order of recentOrders) {
      for (const item of (order.items || [])) {
        const id = String(item.menuItem);
        userItemFreq[id] = (userItemFreq[id] || 0) + item.quantity;
        recentItemIds.push(id);
      }
    }
    const userItemIds = Object.keys(userItemFreq);

    // Step 2-3: co-occurrence across other orders
    const scoreMap = {};
    if (userItemIds.length > 0) {
      const coOrders = await Order.find({
        "items.menuItem": { $in: userItemIds },
        user: { $ne: userId },
      }).limit(200).select("items");

      for (const order of coOrders) {
        for (const item of (order.items || [])) {
          const id = String(item.menuItem);
          if (userItemIds.includes(id)) continue;
          let score = 0;
          for (const seedId of userItemIds) {
            score += (userItemFreq[seedId] || 0) * 0.5;
          }
          scoreMap[id] = (scoreMap[id] || 0) + score;
        }
      }
    }

    // Step 4: popularity bonus
    const allItems = await MenuItem.find({ isAvailable: true }).select("_id orderCount");
    for (const item of allItems) {
      const id = String(item._id);
      scoreMap[id] = (scoreMap[id] || 0) + Math.min(item.orderCount / 50, 3);
    }

    // Step 5: build result
    let recommended = await topItems(scoreMap, recentItemIds, 8);

    // Step 6: pad with trending if sparse
    if (recommended.length < 4) {
      const existingIds = recommended.map((i) => String(i._id));
      const trending = await MenuItem.find({
        _id: { $nin: [...recentItemIds, ...existingIds] }, isAvailable: true,
      }).sort({ orderCount: -1 }).limit(8 - recommended.length)
        .select("name description price category image tags rating preparationTime orderCount");
      recommended = [...recommended, ...trending];
    }

    res.status(200).json({
      success: true,
      source:  recentOrders.length > 0 ? "personalized" : "trending",
      count:   recommended.length,
      items:   recommended,
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recommendations/similar?itemIds=id1,id2   (Private)
// ─────────────────────────────────────────────────────────────────────────────
const getSimilarItems = async (req, res, next) => {
  try {
    const itemIds = (req.query.itemIds || "").split(",").filter(Boolean).slice(0, 10);
    if (itemIds.length === 0) {
      return res.status(400).json({ success: false, message: "itemIds query param is required." });
    }

    const coOrders = await Order.find({ "items.menuItem": { $in: itemIds } })
      .limit(300).select("items");

    const scoreMap = {};
    for (const order of coOrders) {
      for (const item of (order.items || [])) {
        const id = String(item.menuItem);
        if (itemIds.includes(id)) continue;
        scoreMap[id] = (scoreMap[id] || 0) + 1;
      }
    }

    const items = await topItems(scoreMap, itemIds, 6);

    // Pad with trending if no co-occurrence data
    if (items.length < 3) {
      const existingIds = items.map((i) => String(i._id));
      const trending = await MenuItem.find({
        _id: { $nin: [...itemIds, ...existingIds] }, isAvailable: true,
      }).sort({ orderCount: -1 }).limit(6 - items.length)
        .select("name description price category image tags rating preparationTime orderCount");
      return res.status(200).json({
        success: true, source: "trending", count: trending.length + items.length,
        items: [...items, ...trending],
      });
    }

    res.status(200).json({ success: true, source: "co-occurrence", count: items.length, items });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recommendations/trending   (Private)
// ─────────────────────────────────────────────────────────────────────────────
const getTrending = async (req, res, next) => {
  try {
    const items = await MenuItem.find({ isAvailable: true })
      .sort({ orderCount: -1, rating: -1 }).limit(8)
      .select("name description price category image tags rating preparationTime orderCount");
    res.status(200).json({ success: true, source: "trending", count: items.length, items });
  } catch (error) { next(error); }
};

module.exports = { getPersonalRecommendations, getSimilarItems, getTrending };
