// AuthGuard - simplified in Phase 2 (PRD §6.3 mall trust mode)
// No auth guard: dev-tool trusts VITE_PRISM_SECRET for internal calls.
// Removed: JWT flow, login redirect, PublicRoute.

import React from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  return <>{children}</>;
};

// Kept as no-op placeholder to avoid breaking existing imports.
// Remove consumers and this export in a future cleanup.
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
