import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { hasAnyRole, hasAllRoles } from '../utils/authorization'

interface RequireRoleProps {
  roles: string[]
  requireAll?: boolean
  children: ReactNode
  fallback?: ReactNode
}

export function RequireRole({
  roles,
  requireAll = false,
  children,
  fallback,
}: RequireRoleProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null
  if (!isAuthenticated) return <>{fallback}</>

  const hasAccess = requireAll ? hasAllRoles(roles) : hasAnyRole(roles)
  if (!hasAccess) return <>{fallback}</>

  return <>{children}</>
}
