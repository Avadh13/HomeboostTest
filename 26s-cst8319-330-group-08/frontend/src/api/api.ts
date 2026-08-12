const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const ensureApiPath = (value: string) => {
  const cleaned = trimTrailingSlash(value || "");
  if (!cleaned) return cleaned;
  return cleaned.endsWith("/api") ? cleaned : `${cleaned}/api`;
};

const railwayFallbackApiUrl = "https://tender-laughter-production-7cd3.up.railway.app/api";
const localFallbackApiUrl = "http://localhost:5000/api";

const envApiUrl = ensureApiPath(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ""
);

const browserHostname = typeof window !== "undefined" ? window.location.hostname : "";
const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";

const isLocalBrowser = ["localhost", "127.0.0.1"].includes(browserHostname);
const isCodespacesBrowser = browserHostname.endsWith(".app.github.dev");
const useCodespaceBackend = import.meta.env.VITE_USE_CODESPACE_BACKEND === "true";

const codespaceBackendApiUrl =
  browserOrigin && isCodespacesBrowser
    ? ensureApiPath(browserOrigin.replace(/-\d+\.app\.github\.dev$/, "-5000.app.github.dev"))
    : "";

const getApiBaseUrl = () => {
  // Local PC: use local Node backend unless the developer explicitly points to another API.
  if (import.meta.env.DEV && isLocalBrowser) {
    if (!envApiUrl || envApiUrl.includes("railway.app") || envApiUrl.includes("app.github.dev")) {
      return localFallbackApiUrl;
    }
    return envApiUrl;
  }

  // GitHub Codespaces frontend: default to Railway backend for stable demo data.
  // To test a Codespaces backend instead, set VITE_USE_CODESPACE_BACKEND=true.
  if (import.meta.env.DEV && isCodespacesBrowser) {
    if (useCodespaceBackend && codespaceBackendApiUrl) return codespaceBackendApiUrl;
    if (envApiUrl && !envApiUrl.includes("app.github.dev") && !envApiUrl.includes("localhost")) return envApiUrl;
    return railwayFallbackApiUrl;
  }

  // Vercel production/preview: use Vercel env first, Railway fallback second.
  return envApiUrl || railwayFallbackApiUrl;
};

const API_BASE_URL = trimTrailingSlash(getApiBaseUrl());

export default API_BASE_URL;
