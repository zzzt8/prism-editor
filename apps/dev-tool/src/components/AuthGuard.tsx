// AuthGuard - Route protection component
import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    useAuthStore
      .getState()
      .fetchCurrentUser()
      .catch(() => {
        useAuthStore.getState().clearAuth();
      });
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// PublicRoute - Authenticated users must not full-page redirect: App keeps authView as 'login'
// until useEffect syncs, so window.location would reload forever and exhaust browser resources.
interface PublicRouteProps {
  children: React.ReactNode;
  /** Kept for API compatibility; navigation is handled by App state, not location.href */
  redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().fetchCurrentUser().catch(() => {});
    }
  }, []);

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}