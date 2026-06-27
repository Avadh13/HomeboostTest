const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const envApiUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

const productionFallback = "https://tender-laughter-production-7cd3.up.railway.app/api";
const localFallback = "http://localhost:5000/api";

const fallbackApiUrl =
  typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
    ? productionFallback
    : localFallback;

const API_BASE_URL = trimTrailingSlash(envApiUrl || fallbackApiUrl);

export default API_BASE_URL;
