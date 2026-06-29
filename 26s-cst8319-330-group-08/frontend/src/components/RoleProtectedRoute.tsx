import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  team_id?: number | null;
  partnership_id?: number | null;
};

type RoleProtectedRouteProps = {
  children: ReactNode;
  allowedRoles: string[];
};

function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  if (!token || !userData) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  let user: User;

  try {
    user = JSON.parse(userData);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "super_admin" || user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "hbt_admin") return <Navigate to="/hbt/dashboard" replace />;
    if (user.role === "hbt_member") return <Navigate to="/hbt/member-dashboard" replace />;
    if (user.role === "company_admin" || user.role === "company") return <Navigate to="/company/dashboard" replace />;
    if (user.role === "employee") return <Navigate to="/employee-portal" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default RoleProtectedRoute;
