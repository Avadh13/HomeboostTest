const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== "string") return "";
  return origin.trim().replace(/\/+$/, "");
};

const getAllowedOrigins = () => {
  const envOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

  const defaultOrigins = process.env.NODE_ENV === "production"
    ? ["https://homeboost-test.vercel.app"]
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:8080",
      ];

  return [...new Set([...defaultOrigins, ...envOrigins])];
};

const isAllowedVercelPreview = (origin) => {
  return /^https:\/\/homeboost-test-[a-z0-9-]+-avadh13s-projects\.vercel\.app$/i.test(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = getAllowedOrigins();
    const requestOrigin = normalizeOrigin(origin);

    if (allowedOrigins.includes(requestOrigin) || isAllowedVercelPreview(requestOrigin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS policy"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

module.exports = { corsOptions, getAllowedOrigins };
