const MenuItem = require("../models/MenuItem");

const getMenuItems = async (req, res, next) => {
  try {
    const { category, search, sort } = req.query;
    const query = { isAvailable: true };

    if (category && category !== "all") query.category = category.toLowerCase();

    if (search && search.trim()) {
      query.$or = [
        { name:        { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { tags:        { $in: [new RegExp(search.trim(), "i")] } },
      ];
    }

    let sortOption = { orderCount: -1 };
    if (sort === "price-asc")  sortOption = { price: 1 };
    if (sort === "price-desc") sortOption = { price: -1 };
    if (sort === "rating")     sortOption = { rating: -1 };
    if (sort === "newest")     sortOption = { createdAt: -1 };

    const items = await MenuItem.find(query).sort(sortOption);

    const allItems = await MenuItem.find({ isAvailable: true });
    const categoryCounts = allItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({ success: true, count: items.length, categoryCounts, items });
  } catch (error) {
    next(error);
  }
};

const getMenuItemById = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item || !item.isAvailable) {
      return res.status(404).json({ success: false, message: "Menu item not found." });
    }
    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await MenuItem.distinct("category", { isAvailable: true });
    res.status(200).json({ success: true, categories: ["all", ...categories] });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMenuItems, getMenuItemById, getCategories };