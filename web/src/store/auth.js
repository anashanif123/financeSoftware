import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth state persisted to localStorage. Tokens are read by the axios client.
export const useAuth = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set((s) => ({
          user: user ?? s.user,
          accessToken: accessToken ?? s.accessToken,
          refreshToken: refreshToken ?? s.refreshToken,
        })),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'clearway.auth' },
  ),
);

export const authStore = useAuth;
