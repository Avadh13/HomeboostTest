import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type AdminRouteProps = {
  children: ReactNode;
};

function AdminRoute({ children }: AdminRouteProps) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) return <Navigate to="/login" replace />;
  if (user.role !== "admin" && user.role !== "super_admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default AdminRoute;
