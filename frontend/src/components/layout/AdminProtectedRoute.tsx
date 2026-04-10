import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const AdminProtectedRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Client-side role check — backend middleware enforces this too (403)
  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
