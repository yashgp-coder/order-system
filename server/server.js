require("dotenv").config();
const http        = require("http");
const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const rateLimit   = require("express-rate-limit");
const sanitize    = require("./middleware/sanitize");

const connectDB       = require("./config/db");
const { initSocket }  = require("./config/socket");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const indexRouter = require("./routes/index");

const app        = express();
const httpServer = http.createServer(app);

// ── Database + Socket ─────────────────────────────────────────────────────────
connectDB();
initSocket(httpServer);

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: process.env.NODE_ENV === "production"
      ? undefined   // Use helmet defaults in production
      : false,      // Disable CSP in development (Vite HMR etc.)
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin (no Origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: process.env.NODE_ENV === "production" ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again in 15 minutes." },
});
app.use("/api", globalLimiter);

// Tighter limiter for auth endpoints (also applied in routes/auth.js per-route)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts. Please wait 15 minutes." },
});
app.use("/api/auth", authLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));         // Reduced from 10mb — no file uploads
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Input Sanitization (anti-injection) ───────────────────────────────────────
app.use(sanitize);

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ── API Routes ────────────────────────────────────────────────────────────────
// Root health ping — for Render uptime checks
app.get("/", (_req, res) => res.status(200).json({ status: "ok", app: "OrderFlow API" }));

// Silence browser favicon requests
app.get("/favicon.ico", (_req, res) => res.status(204).end());

app.use("/api",              indexRouter);
app.use("/api/auth",         require("./routes/auth"));
app.use("/api/menu",         require("./routes/menu"));
app.use("/api/orders",       require("./routes/orders"));
app.use("/api/admin",        require("./routes/admin"));
app.use("/api/recommendations", require("./routes/recommendations"));

// ── Production: Serve React build ─────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname, "../client/dist", "index.html"))
  );
}

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log("\n================================================");
  console.log(`🚀 OrderFlow server — ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 API:    http://localhost:${PORT}/api`);
  console.log(`🔌 Socket: ws://localhost:${PORT}`);
  console.log(`💊 Health: http://localhost:${PORT}/api/health`);
  console.log("================================================\n");
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully`);
  httpServer.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  httpServer.close(() => process.exit(1));
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

