import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse, User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (response: AuthResponse) => {
        set({
          user: {
            user_id: response.user_id,
            email: response.email,
            role: 'user', // Default to 'user', backend will enforce admin checks
          },
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },
    }),
    {
      name: "payvault-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
