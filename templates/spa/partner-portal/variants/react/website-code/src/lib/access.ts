import type { Account, Contact, Database, Opportunity, Role } from '../data/types'
import { PARTNER_A } from '../data/seed'

/** Account Manager workspace (sales) roles: opportunities, deal registration, customers and partner admin. */
export const PARTNER_ROLES: Role[] = ['partner-admin', 'partner-manager', 'partner-seller']

/** Roles that belong to a partner organization. Use `can` for feature access. */
export const isPartnerOrgRole = (role: Role) => PARTNER_ROLES.includes(role)

export const ROLE_LABELS: Record<Role, string> = {
  anonymous: 'Anonymous visitor',
  'non-partner': 'Non-Partner Portal User',
  'partner-admin': 'Partner Admin',
  'partner-manager': 'Partner Manager',
  'partner-seller': 'Partner Seller',
}

/** Persona contact used for each signed-in role. */
export const ROLE_PERSONA: Partial<Record<Exclude<Role, 'anonymous'>, string>> = {
  'non-partner': 'c-taylor',
  'partner-admin': 'c-avery',
  'partner-manager': 'c-jordan',
  'partner-seller': 'c-sam',
}

export type Capability =
  | 'signed-in'
  | 'partner'
  | 'customers'
  | 'customer-account:create'
  | 'customer-account:edit'
  | 'customer-account:deactivate'
  | 'customer-contact:create'
  | 'customer-contact:edit'
  | 'opportunities'
  | 'distributed'
  | 'manage-access'
  | 'parent-account'
  | 'parent-account:edit'
  | 'register-partner'

/** Access matrix from CLONE-SPEC §3 (roles/access) and the SPA requirements route gating. */
export function can(role: Role, cap: Capability): boolean {
  const partner = PARTNER_ROLES.includes(role)
  const adminOrManager = role === 'partner-admin' || role === 'partner-manager'
  switch (cap) {
    case 'signed-in':
      return role !== 'anonymous'
    case 'partner':
    case 'customers':
    case 'opportunities':
    case 'parent-account':
    case 'customer-contact:edit':
      return partner
    case 'customer-account:create':
    case 'customer-account:edit':
    case 'customer-account:deactivate':
    case 'customer-contact:create':
    case 'distributed':
    case 'parent-account:edit':
      return adminOrManager
    case 'manage-access':
      return role === 'partner-admin'
    case 'register-partner':
      return role === 'non-partner'
  }
}

export interface Session {
  role: Role
  contact?: Contact
  partnerId?: string
}

/** Portal role implied by a contact's partner web role (no partner role = Non-Partner Portal User). */
export function roleForContact(contact: Contact): Exclude<Role, 'anonymous'> {
  if (contact.partnerRole === 'Partner Admin') return 'partner-admin'
  if (contact.partnerRole === 'Partner Manager') return 'partner-manager'
  if (contact.partnerRole === 'Partner Seller') return 'partner-seller'
  return 'non-partner'
}

/**
 * Builds the session for the signed-in contact. When `contactId` resolves to an active contact the role is
 * derived from that contact; otherwise the seed persona for `role` is used.
 */
export function buildSession(db: Database, role: Role, contactId?: string | null): Session {
  const custom = contactId ? db.contacts.find(c => c.id === contactId && c.active) : undefined
  const effectiveRole: Role = custom ? roleForContact(custom) : role
  if (effectiveRole === 'anonymous') return { role: effectiveRole }
  const contact = custom ?? db.contacts.find(c => c.id === ROLE_PERSONA[effectiveRole])
  if (!contact) return { role: 'anonymous' }
  const partnerId = isPartnerOrgRole(effectiveRole) ? (contact?.parentAccountId ?? PARTNER_A) : undefined
  return { role: effectiveRole, contact, partnerId }
}

const MANAGED_STATUSES = new Set(['Accepted', 'Purchased', 'Won', 'Lost', 'Canceled', 'On Hold'])

function belongsToPartner(o: Opportunity, partnerId: string) {
  return o.partnerId === partnerId || o.collaboratingPartnerIds.includes(partnerId)
}

/** Distributed list: Delivered + not collaborative, owned by the current partner (Admin/Manager only). */
export function distributedOpportunities(db: Database, s: Session): Opportunity[] {
  if (!s.partnerId || !can(s.role, 'distributed')) return []
  return db.opportunities.filter(o => o.partnerId === s.partnerId && o.status === 'Delivered' && !o.collaboration)
}

/**
 * Managed list: Accepted/Purchased/Won/Lost/Canceled plus partner-created In Progress.
 * Sellers additionally only see opportunities assigned to them, or collaborative ones.
 */
export function managedOpportunities(db: Database, s: Session): Opportunity[] {
  if (!s.partnerId || !can(s.role, 'opportunities')) return []
  return db.opportunities.filter(o => {
    if (!belongsToPartner(o, s.partnerId!)) return false
    const listed = MANAGED_STATUSES.has(o.status) || (o.status === 'In Progress' && o.partnerCreated)
    if (!listed) return false
    if (s.role === 'partner-seller')
      return o.partnerContactId === s.contact?.id || o.collaboration || (!!s.contact && !!o.sharedContactIds?.includes(s.contact.id))
    return true
  })
}

export function canViewOpportunity(db: Database, s: Session, o: Opportunity): boolean {
  return managedOpportunities(db, s).some(x => x.id === o.id) || distributedOpportunities(db, s).some(x => x.id === o.id)
}

/** Collaborative opportunities owned by another partner are read-only to the collaborator. */
export function isSharedView(o: Opportunity) {
  return o.collaboration
}

export function customerAccounts(db: Database, s: Session): Account[] {
  if (!s.partnerId || !can(s.role, 'customers')) return []
  return db.accounts.filter(a => a.classification === 'Customer' && a.managingPartnerId === s.partnerId)
}

export function customerContacts(db: Database, s: Session): Contact[] {
  if (!s.partnerId || !can(s.role, 'customers')) return []
  const accountIds = new Set(customerAccounts(db, s).map(a => a.id))
  return db.contacts.filter(c => !c.partnerRole && c.parentAccountId && accountIds.has(c.parentAccountId))
}

export function partnerContacts(db: Database, s: Session): Contact[] {
  if (!s.partnerId || !can(s.role, 'partner')) return []
  return db.contacts.filter(c => c.parentAccountId === s.partnerId)
}
