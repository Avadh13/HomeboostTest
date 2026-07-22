import type { AppRole } from "./auth";

const RESERVED_SINGLE_SEGMENTS = new Set([
  "admin",
  "hbt",
  "employee",
  "company",
  "resources",
  "quiz",
  "profile",
  "notifications",
  "login",
  "signup",
  "hbt-signup",
  "payment-success",
  "partners",
  "pricing",
  "contact",
  "mortgage-request",
  "invite",
  "employee-portal",
]);

export const normalizePath = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

export const isAdminPath = (pathname: string) => {
  const path = normalizePath(pathname);
  return path === "/admin" || path.startsWith("/admin/");
};

export const isPortalPath = (pathname: string) => {
  const path = normalizePath(pathname);

  return (
    path === "/profile" ||
    path === "/notifications" ||
    path === "/employee-portal" ||
    path === "/resources" ||
    path.startsWith("/resources/") ||
    path === "/quiz" ||
    path.startsWith("/quiz/") ||
    path.startsWith("/employee/") ||
    path.startsWith("/company/") ||
    path.startsWith("/hbt/")
  );
};

export const isPartnershipSlugPath = (pathname: string) => {
  const path = normalizePath(pathname);
  const parts = path.split("/").filter(Boolean);
  return parts.length === 1 && !RESERVED_SINGLE_SEGMENTS.has(parts[0]);
};

export const dashboardPathForRole = (role?: AppRole | string | null) => {
  if (role === "admin" || role === "super_admin") return "/admin";
  if (role === "hbt_admin") return "/hbt/dashboard";
  if (role === "hbt_member") return "/hbt/member-dashboard";
  if (role === "company" || role === "company_admin") return "/company/dashboard";
  if (role === "employee") return "/employee-portal";
  return "/login";
};
