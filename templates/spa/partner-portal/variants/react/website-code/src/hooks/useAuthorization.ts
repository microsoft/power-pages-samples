import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { getUserRoles, hasAllRoles, hasAnyRole, hasRole, isAdmin } from '../utils/authorization'

/** Role checks for the signed-in user (works in live and mock mode). UX only: table permissions enforce. */
export function useAuthorization() {
  const { user, isAuthenticated } = useAuth()
  return useMemo(
    () => ({
      roles: getUserRoles(user),
      isAuthenticated,
      isAdmin: isAdmin(user),
      hasRole: (role: string) => hasRole(role, user),
      hasAnyRole: (roles: string[]) => hasAnyRole(roles, user),
      hasAllRoles: (roles: string[]) => hasAllRoles(roles, user),
    }),
    [user, isAuthenticated],
  )
}
