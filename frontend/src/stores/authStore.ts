import { create } from 'zustand';
import type { User } from '../api/auth';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: (() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    } catch {
      return null;
    }
  })(),
  user: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  logout: () => {
    try {
      localStorage.removeItem('accessToken');
      sessionStorage.removeItem('accessToken');
    } catch {}
    set({ accessToken: null, user: null });
  },
}));
