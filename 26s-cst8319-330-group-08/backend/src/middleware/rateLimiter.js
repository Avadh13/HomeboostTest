const buckets = new Map();

const createLimiter = ({ windowMs, limit, message }) => {
  return (req, res, next) => {
    const key = `${req.ip || req.headers["x-forwarded-for"] || "unknown"}:${req.originalUrl}`;
    const now = Date.now();
    const current = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    buckets.set(key, current);

    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(Math.max(limit - current.count, 0)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > limit) {
      return res.status(429).json({ status: "error", message });
    }

    next();
  };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}, 15 * 60 * 1000).unref();

const authLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 50,
  message: "Too many login attempts. Please wait 5 minutes and try again.",
});

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: "Too many requests. Please slow down and try again later.",
});

module.exports = { authLimiter, apiLimiter };
