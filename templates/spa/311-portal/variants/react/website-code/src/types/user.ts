/** Shape of window.Microsoft.Dynamic365.Portal.User injected by Power Pages */
export interface PowerPagesPortalUser {
  contactId: string
  fullName?: string
  firstName: string
  lastName: string
  email: string
  userName: string
  userRoles: string[]
}

/** Clean domain type for the frontend */
export interface AuthUser {
  id: string
  displayName: string
  initials: string
  email: string
}

/** Check whether the portal user object has any populated identity fields */
export function hasPortalUserDetails(portalUser: PowerPagesPortalUser): boolean {
  return !!(portalUser.contactId || portalUser.email || portalUser.userName)
}

/** Convert the Power Pages global user object to our domain type */
export function mapPortalUser(portalUser: PowerPagesPortalUser): AuthUser {
  const first = (portalUser.firstName || '').trim()
  const last = (portalUser.lastName || '').trim()
  const displayName =
    portalUser.fullName ||
    `${first} ${last}`.trim() ||
    portalUser.email ||
    portalUser.userName ||
    'User'
  const initials = first && last
    ? `${first[0]}${last[0]}`.toUpperCase()
    : displayName.slice(0, 2).toUpperCase()

  return {
    id: portalUser.contactId,
    displayName,
    initials,
    email: portalUser.email || portalUser.userName,
  }
}
