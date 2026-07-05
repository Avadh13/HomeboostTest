const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const envApiUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

const localFallbackApiUrl = "http://localhost:5000/api";
const rawApiUrl = envApiUrl || (import.meta.env.DEV ? localFallbackApiUrl : "");

if (!rawApiUrl && import.meta.env.PROD) {
  throw new Error("VITE_API_BASE_URL is required for production builds.");
}

const API_BASE_URL = trimTrailingSlash(rawApiUrl);

export default API_BASE_URL;
