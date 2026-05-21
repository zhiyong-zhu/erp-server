import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getTokenStorage } from '../storage';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  permissions: string[];

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setPermissions: (permissions: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      permissions: [],

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) => {
        getTokenStorage().setItem('access_token', accessToken);
        set({ accessToken, refreshToken });
      },

      setPermissions: (permissions) => set({ permissions }),

      logout: () => {
        getTokenStorage().removeItem('access_token');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          permissions: [],
        });
      },
    }),
    {
      name: 'erp-auth-storage',
      storage: createJSONStorage(() => getTokenStorage()),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
);
