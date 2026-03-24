import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { refreshTokens } from "../../lib/api";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider
 *
 * Mounted once at the top of the protected route tree. On mount it:
 *  1. Reads the persisted auth state from Zustand (localStorage).
 *  2. If an access token exists, attempts a silent token refresh so the
 *     user never has to log in again after a page reload (as long as the
 *     refresh token is still valid).
 *  3. If the refresh succeeds, stores the new token pair and renders children.
 *  4. If the refresh fails (expired / revoked refresh token), clears auth
 *     state and redirects the user to /auth/login.
 *  5. While the check is in progress, shows a full-page LoadingSpinner so
 *     protected pages never flash with stale / missing data.
 */
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const { accessToken, refreshToken, updateTokens, logout, isAuthenticated } =
    useAuthStore();

  // null  → still checking
  // true  → auth is valid (or user is not authenticated — public routes)
  // false → refresh failed, redirecting
  const [authChecked, setAuthChecked] = React.useState<boolean>(false);

  React.useEffect(() => {
    let cancelled = false;

    const verifyAuth = async () => {
      // No stored token at all → nothing to refresh, show the app immediately.
      // ProtectedRoute will redirect unauthenticated users to /auth/login.
      if (!accessToken || !isAuthenticated) {
        setAuthChecked(true);
        return;
      }

      // We have a stored token. Try a silent refresh to get a fresh pair.
      // This also validates that the refresh token hasn't been revoked server-side.
      if (!refreshToken) {
        // Access token without a refresh token is an inconsistent state — log out.
        logout();
        setAuthChecked(true);
        navigate("/auth/login", { replace: true });
        return;
      }

      try {
        const { access_token, refresh_token } = await refreshTokens(refreshToken);

        if (!cancelled) {
          updateTokens(access_token, refresh_token);
          setAuthChecked(true);
        }
      } catch {
        // Refresh token is expired or invalid — force the user to re-authenticate.
        if (!cancelled) {
          logout();
          setAuthChecked(true);
          navigate("/auth/login", { replace: true });
        }
      }
    };

    verifyAuth();

    return () => {
      cancelled = true;
    };
    // We intentionally only run this on mount (empty-ish deps).
    // Subsequent token updates are handled by the Axios interceptor in api.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <LoadingSpinner
        fullscreen
        label="Securing your session…"
      />
    );
  }

  return <>{children}</>;
};

export { AuthProvider };
