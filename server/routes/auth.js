const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { register, login, getMe, updateMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
});

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters."),
  body("email").trim().notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required.")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
];

const loginValidation = [
  body("email").trim().notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required."),
];

router.post("/register", authLimiter, registerValidation, register);
router.post("/login",    authLimiter, loginValidation,    login);
router.get("/me",        protect, getMe);
router.patch("/me",      protect, updateMe);

module.exports = router;