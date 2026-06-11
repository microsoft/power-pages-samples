// IMPORTANT: Client-side authorization is for UX only, not security.
// Server-side table permissions enforce actual access control.
// Always configure table permissions via /integrate-webapi.

import { getCurrentUser, isAuthenticated as checkAuthenticated } from '../services/authService'

export function getUserRoles(): string[] {
  const user = getCurrentUser()
  return user?.userRoles ?? []
}

export function hasRole(roleName: string): boolean {
  return getUserRoles().some(role => role.toLowerCase() === roleName.toLowerCase())
}

export function hasAnyRole(roleNames: string[]): boolean {
  return roleNames.some(role => hasRole(role))
}

export function hasAllRoles(roleNames: string[]): boolean {
  return roleNames.every(role => hasRole(role))
}

export function isAuthenticated(): boolean {
  return checkAuthenticated()
}

export function isAdmin(): boolean {
  return hasRole('Administrators')
}

export function hasElevatedAccess(additionalRoles: string[] = []): boolean {
  return isAdmin() || hasAnyRole(additionalRoles)
}
