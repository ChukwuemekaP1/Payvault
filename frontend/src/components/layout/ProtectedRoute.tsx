import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
