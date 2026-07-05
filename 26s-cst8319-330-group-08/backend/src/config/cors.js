const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== "string") return "";
  return origin.trim().replace(/\/+$/, "");
};

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const getAllowedOrigins = () => {
  const envOrigins = parseOrigins(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "");

  const localOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:8080",
  ];

  const vercelOrigins = [
    "https://homeboost-test.vercel.app",
    "https://homeboosttest.vercel.app",
  ];

  return [...new Set([...localOrigins, ...vercelOrigins, ...envOrigins])];
};

const isAllowedVercelPreview = (origin) => {
  if (process.env.ALLOW_VERCEL_PREVIEWS === "false") return false;

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

const isAllowedCodespacesOrigin = (origin) => {
  return process.env.ALLOW_CODESPACES_ORIGINS === "true" && origin.startsWith("https://") && origin.endsWith(".app.github.dev");
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = getAllowedOrigins();
    const requestOrigin = normalizeOrigin(origin);

    if (
      allowedOrigins.includes(requestOrigin) ||
      isAllowedVercelPreview(requestOrigin) ||
      isAllowedCodespacesOrigin(requestOrigin)
    ) {
      return callback(null, true);
    }

    console.log("CORS blocked origin:", requestOrigin);
    return callback(new Error("Origin is not allowed by CORS policy"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

module.exports = { corsOptions, getAllowedOrigins };
