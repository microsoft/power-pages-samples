import { useMemo } from 'react'
import { useAuth } from './useAuth'
import {
  getUserRoles,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  isAdmin,
} from '../utils/authorization'

export function useAuthorization() {
  const { isAuthenticated } = useAuth()

  const roles = useMemo(() => getUserRoles(), [isAuthenticated])

  return {
    roles,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAuthenticated,
    isAdmin: isAdmin(),
  }
}
