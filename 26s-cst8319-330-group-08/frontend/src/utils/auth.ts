export type AppRole =
  | "admin"
  | "super_admin"
  | "hbt_admin"
  | "hbt_member"
  | "company_admin"
  | "company"
  | "employee";

export type StoredUser = {
  id?: number;
  full_name?: string;
  email?: string;
  role?: AppRole | string;
  team_id?: number | null;
  partnership_id?: number | null;
  photo_url?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readStoredUser = (): StoredUser | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem("user");
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.role !== "string") return null;
    return parsed as StoredUser;
  } catch {
    return null;
  }
};

export const readStoredToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
};

export const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("user");
  document.body.classList.remove("hb-portal-mode");
};

export const hasStoredSession = () => Boolean(readStoredToken() && readStoredUser());
