import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the user is authenticated.
 * Shows the fallback (or nothing) when not authenticated.
 */
export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return fallback ?? null;
  return <>{children}</>;
}
