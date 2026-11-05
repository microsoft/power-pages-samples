import type { ReactNode } from 'react'
import { useAuthorization } from '../hooks/useAuthorization'

/**
 * Renders children only when the user has one of `roles` (or all of them with `requireAll`).
 * UX only: server-side table permissions enforce what each web role can read or change.
 */
export function RequireRole({
  roles,
  requireAll = false,
  fallback = null,
  children,
}: {
  roles: string[]
  requireAll?: boolean
  fallback?: ReactNode
  children: ReactNode
}) {
  const { hasAnyRole, hasAllRoles } = useAuthorization()
  return <>{(requireAll ? hasAllRoles(roles) : hasAnyRole(roles)) ? children : fallback}</>
}
