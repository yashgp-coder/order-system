const express = require("express");
const router  = express.Router();
const { getPersonalRecommendations, getSimilarItems, getTrending } = require("../controllers/recommendController");
const { protect } = require("../middleware/authMiddleware");

router.get("/personal",  protect, getPersonalRecommendations);
router.get("/similar",   protect, getSimilarItems);
router.get("/trending",  protect, getTrending);

module.exports = router;
