const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const envApiUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

const localFallbackApiUrl = "http://localhost:5000/api";
const isLocalBrowser =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

// In local Vite development, old deployed Railway URLs can make login fail with
// a network/CORS error. Prefer the local backend when running on localhost.
const shouldUseLocalFallback =
  import.meta.env.DEV &&
  isLocalBrowser &&
  (!envApiUrl || envApiUrl.includes("railway.app"));

const rawApiUrl = shouldUseLocalFallback
  ? localFallbackApiUrl
  : envApiUrl || (import.meta.env.DEV ? localFallbackApiUrl : "");

if (!rawApiUrl && import.meta.env.PROD) {
  throw new Error("VITE_API_BASE_URL is required for production builds.");
}

const API_BASE_URL = trimTrailingSlash(rawApiUrl);

export default API_BASE_URL;
