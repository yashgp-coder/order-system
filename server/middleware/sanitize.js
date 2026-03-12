/**
 * Input Sanitization Middleware
 *
 * Strips MongoDB operator injection ($ and .) from req.body, req.query, req.params.
 * Also trims string values to prevent whitespace-only inputs slipping validation.
 *
 * Usage: app.use(sanitize) — place AFTER express.json(), BEFORE routes.
 */

const MONGO_OPERATOR_RE = /\$/;

const scrub = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  for (const key of Object.keys(obj)) {
    if (MONGO_OPERATOR_RE.test(key)) {
      delete obj[key]; // Remove keys like $where, $gt, etc.
    } else {
      const val = obj[key];
      if (typeof val === "string") {
        obj[key] = val.trim();
      } else if (typeof val === "object") {
        scrub(val); // Recurse into nested objects / arrays
      }
    }
  }
  return obj;
};

const sanitize = (req, _res, next) => {
  scrub(req.body);
  scrub(req.query);
  scrub(req.params);
  next();
};

module.exports = sanitize;
