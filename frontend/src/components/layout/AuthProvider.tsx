import * as React from "react";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider
 *
 * Mounted once at the top of the protected route tree. On mount it:
 *  1. Reads the persisted auth state from Zustand (localStorage).
 *  2. If tokens exist, marks auth as checked (no refresh — backend Redis disabled).
 *  3. Renders children immediately.
 *  4. ProtectedRoute will redirect unauthenticated users to /auth/login.
 *
 * NOTE: Token refresh is disabled on backend (Redis unavailable).
 * Users will need to re-login when their access token expires.
 */
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuthStore();

  // null  → still checking
  // true  → auth is checked
  const [authChecked, setAuthChecked] = React.useState<boolean>(false);

  React.useEffect(() => {
    // No stored token or not authenticated → let ProtectedRoute handle redirect
    if (!accessToken || !isAuthenticated) {
      setAuthChecked(true);
      return;
    }

    // Token exists — mark as checked (no refresh since Redis is disabled)
    setAuthChecked(true);
  }, [accessToken, isAuthenticated]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <LoadingSpinner
        fullscreen
        label="Loading…"
      />
    );
  }

  return <>{children}</>;
};

export { AuthProvider };
