// IMPORTANT: Client-side authorization is for UX only, not security.
// Server-side table permissions enforce actual access control.
// Always configure table permissions via /integrate-webapi.
import type { PowerPagesUser } from '../types/powerPages'
import { getCurrentUser, isAuthenticated as serverIsAuthenticated } from '../services/authService'

/** Web role names on this site (see .powerpages-site/web-roles). */
export const WEB_ROLES = {
  administrators: 'Administrators',
  authenticatedUsers: 'Authenticated Users',
  partnerAdmin: 'Partner Admin',
  partnerManager: 'Partner Manager',
  partnerSeller: 'Partner Seller',
  partnerTechnician: 'Partner Technician',
  nonPartner: 'Non-Partner Portal User',
} as const

const norm = (r: string) => r.trim().toLowerCase()

export function getUserRoles(user: PowerPagesUser | undefined = getCurrentUser()): string[] {
  return user?.userRoles ?? []
}

export function hasRole(roleName: string, user?: PowerPagesUser): boolean {
  return getUserRoles(user).some(r => norm(r) === norm(roleName))
}

export function hasAnyRole(roleNames: string[], user?: PowerPagesUser): boolean {
  return roleNames.some(r => hasRole(r, user))
}

export function hasAllRoles(roleNames: string[], user?: PowerPagesUser): boolean {
  return roleNames.every(r => hasRole(r, user))
}

export function isAuthenticated(): boolean {
  return serverIsAuthenticated()
}

export function isAdmin(user?: PowerPagesUser): boolean {
  return hasRole(WEB_ROLES.administrators, user)
}

export function hasElevatedAccess(additionalRoles: string[] = [], user?: PowerPagesUser): boolean {
  return isAdmin(user) || hasAnyRole(additionalRoles, user)
}
