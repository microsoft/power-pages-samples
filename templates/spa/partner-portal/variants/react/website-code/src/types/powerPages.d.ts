/**
 * Power Pages injects the portal context (including the signed-in user) as
 * `window.Microsoft.Dynamic365.Portal` on every page it serves.
 */
export interface PowerPagesUser {
  userName?: string
  firstName?: string
  lastName?: string
  email?: string
  contactId?: string
  /** Web role names assigned to the contact. */
  userRoles?: string[]
}

export interface PowerPagesPortal {
  User?: PowerPagesUser | null
  version?: string
  type?: string
  id?: string
  geo?: string
  /** Parent Entra tenant ID of the site; used to address the workforce Entra ID provider. */
  tenant?: string
  correlationId?: string
  orgEnvironmentId?: string
  orgId?: string
  portalProductionOrTrialType?: string
  isTelemetryEnabled?: string
  activeLanguages?: string[]
}

declare global {
  interface Window {
    Microsoft?: { Dynamic365?: { Portal?: PowerPagesPortal } }
  }
}
