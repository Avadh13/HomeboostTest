import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { clearStoredSession, readStoredToken, readStoredUser } from "../../utils/auth";
import { dashboardPathForRole } from "../../utils/routes";

type AdminProtectedRouteProps = {
  children: ReactNode;
};

function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const location = useLocation();
  const token = readStoredToken();
  const user = readStoredUser();

  if (!token || !user?.role) {
    clearStoredSession();
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  if (user.role !== "admin" && user.role !== "super_admin") {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

export default AdminProtectedRoute;
