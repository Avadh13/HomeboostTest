import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type AdminProtectedRouteProps = {
  children: ReactNode;
};

function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  if (!token || !userData) {
    return <Navigate to="/login" replace />;
  }

  let user: { role?: string } = {};

  try {
    user = JSON.parse(userData);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    if (user.role === "hbt_admin") return <Navigate to="/hbt/dashboard" replace />;
    if (user.role === "hbt_member") return <Navigate to="/hbt/member-dashboard" replace />;
    if (user.role === "employee") return <Navigate to="/employee-portal" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default AdminProtectedRoute;
