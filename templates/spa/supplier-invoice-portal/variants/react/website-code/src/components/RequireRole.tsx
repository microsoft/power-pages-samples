import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { hasAnyRole, hasAllRoles } from '../utils/authorization';

interface RequireRoleProps {
  roles: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the user has the required role(s).
 * By default checks if the user has ANY of the listed roles.
 * Set requireAll=true to require ALL roles.
 */
export function RequireRole({ roles, requireAll = false, children, fallback }: RequireRoleProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return fallback ?? null;

  const hasAccess = requireAll ? hasAllRoles(roles) : hasAnyRole(roles);
  if (!hasAccess) return fallback ?? null;

  return <>{children}</>;
}
