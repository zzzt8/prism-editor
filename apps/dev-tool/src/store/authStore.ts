// Auth store - manages user authentication state using Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncStorageTokens } from '../storage';

const API_BASE = '/api';
const AUTH_FETCH_TIMEOUT_MS = 20_000;

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  const merged: RequestInit = { ...init, signal: controller.signal };
  try {
    return await fetch(input, merged);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(
        'Request timed out. Start the API server (e.g. pnpm dev in /server, port 3001) and use the Vite dev URL so /api is proxied.'
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    /* non-JSON body */
  }
  return response.statusText || fallback;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await authFetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response, 'Login failed'));
        }

        const data = await response.json();
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
        });
        syncStorageTokens();
      },

      register: async (email: string, password: string, name?: string) => {
        const response = await authFetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, name }),
        });

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response, 'Registration failed'));
        }

        const data = await response.json();
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
        });
        syncStorageTokens();
      },

      logout: async () => {
        try {
          await authFetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });
          syncStorageTokens();
        }
      },

      refreshToken: async () => {
        const response = await authFetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          get().clearAuth();
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        set({
          user: data.user,
          accessToken: data.accessToken,
        });
        syncStorageTokens();
      },

      fetchCurrentUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;

        const response = await authFetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          set({
            user: data.user,
            isAuthenticated: true,
          });
        } else {
          const refreshed = await get().refreshToken().then(() => true).catch(() => false);
          if (!refreshed) {
            get().clearAuth();
          }
        }
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
        syncStorageTokens();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);