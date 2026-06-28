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
    ? [
        "https://homeboosttest.vercel.app",
        "https://homeboost-test.vercel.app",
        "https://homeboosttest-git-main-avadh2708s-projects.vercel.app",
      ]
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
  const allowedPreviewPrefixes = [
    "https://homeboost-test-",
    "https://homeboosttest-",
    "https://homeboosttest-git-",
  ];

  const allowedPreviewSuffixes = [
    "-avadh13s-projects.vercel.app",
    "-avadh2708s-projects.vercel.app",
  ];

  return allowedPreviewPrefixes.some((prefix) =>
    allowedPreviewSuffixes.some((suffix) => origin.startsWith(prefix) && origin.endsWith(suffix))
  );
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
