import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const AdminProtectedRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    // Redirect to admin login page, not regular login
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
