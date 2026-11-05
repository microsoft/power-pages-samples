import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Renders children only for signed-in users. Without a `fallback`, anonymous visitors go to
 * /login and return here afterwards. UX only: table permissions enforce data access.
 */
export function RequireAuth({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return null
  if (isAuthenticated) return <>{children}</>
  if (fallback !== undefined) return <>{fallback}</>
  return <Navigate to={`/login?ReturnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />
}
