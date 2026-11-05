// Live-mode screen loaders: one Server Logic (or single Web API) call per screen, mapped into cache patches
// that AppStore merges into its normalized `db`. Components keep rendering from `db` exactly as in mock mode.
import type { Account, Booking, Comment, Contact, Database, Invitation, Opportunity, Role, WorkOrder } from '../data/types'
import { serverLogic } from './http'
import { portalUser } from './config'
import { toAccount, toAccountRef, toComment, toContact, toInvitation, toOpportunity, toProduct, toRegistration, type Row } from './mappers'

/** Records to upsert into the cache; `replace` drops stale cached records in a scope before the upsert. */
export interface CachePatch {
  accounts?: Account[]
  contacts?: Contact[]
  opportunities?: Opportunity[]
  dealRegistrations?: Database['dealRegistrations']
  comments?: Comment[]
  invitations?: Invitation[]
  workOrders?: WorkOrder[]
  bookings?: Booking[]
  /** Lookup expansions: inserted only when the full record isn't cached yet. */
  accountRefs?: Account[]
  contactRefs?: Contact[]
  replace?: {
    dealRegistrations?: (r: Database['dealRegistrations'][number]) => boolean
    comments?: (c: Comment) => boolean
    invitations?: (i: Invitation) => boolean
    contacts?: (c: Contact) => boolean
    opportunities?: (o: Opportunity) => boolean
    workOrders?: (w: WorkOrder) => boolean
    bookings?: (b: Booking) => boolean
  }
}

export interface Territory {
  id: string
  name: string
}

/** Territory names are shown on opportunities; writes need the id. Filled by the workspace lookups. */
export const territoryCache = new Map<string, string>()
export const territoryIdByName = (name: string) => territoryCache.get(name)

const refsFromOpportunity = (row: Row, accounts: Account[], contacts: Contact[]) => {
  const customer = row.customerid_account as Row | undefined
  if (customer?.accountid) accounts.push(toAccountRef(customer))
  const partner = row.msa_partnerid as Row | undefined
  if (partner?.accountid) accounts.push(toAccountRef(partner, 'Partner'))
  for (const a of (row.adx_opportunity_account as Row[] | undefined) ?? []) accounts.push(toAccountRef(a, 'Partner'))
  const owner = row.msa_partneroppid as Row | undefined
  if (owner?.contactid) contacts.push(toContact(owner))
  for (const c of (row.adx_partner_collaboration as Row[] | undefined) ?? []) contacts.push(toContact(c))
  for (const c of (row.adx_internal_collaboration as Row[] | undefined) ?? []) contacts.push(toContact(c))
}

/* --------------------------------- Session -------------------------------- */

const ROLE_ORDER: [string, Role][] = [
  ['Partner Admin', 'partner-admin'],
  ['Partner Manager', 'partner-manager'],
  ['Partner Seller', 'partner-seller'],
  // One workspace per contact: an Account Manager (sales) role wins over Partner Technician.
  ['Partner Technician', 'partner-technician'],
]

export function roleFromWebRoles(roles: string[] | undefined, signedIn: boolean): Role {
  if (!signedIn) return 'anonymous'
  const names = new Set((roles ?? []).map(r => r.trim().toLowerCase()))
  for (const [name, role] of ROLE_ORDER) if (names.has(name.toLowerCase())) return role
  return 'non-partner'
}

export interface LiveSession {
  role: Role
  contactId: string | null
  patch: CachePatch
}

/** Signed-in contact and its parent account via contact-directory (the role/parent columns aren't Web API fields). */
export async function loadSession(signal?: AbortSignal): Promise<LiveSession> {
  const user = portalUser()
  if (!user?.contactId) return { role: 'anonymous', contactId: null, patch: {} }
  const role = roleFromWebRoles(user.userRoles, true)
  const res = await serverLogic<{ status: string; me: Row; account: Row | null }>('contact-directory', { scope: 'me' }, signal)
  const me = toContact(res.me)
  const patch: CachePatch = { contacts: [me] }
  if (res.account) patch.accounts = [toAccount(res.account)]
  return { role, contactId: me.id, patch }
}

/* -------------------------------- Dashboard ------------------------------- */

export interface DashboardCounts {
  customerAccounts: number
  activeCustomerAccounts: number
  customerContacts: number
}

export async function loadDashboard(sections = 'rows,counts', signal?: AbortSignal): Promise<{ patch: CachePatch; counts?: DashboardCounts }> {
  const res = await serverLogic<{ status: string; opportunities?: Row[]; registrations?: Row[]; counts?: DashboardCounts }>(
    'partner-dashboard',
    { sections },
    signal,
  )
  const accounts: Account[] = []
  const contacts: Contact[] = []
  const opportunities = (res.opportunities ?? []).map(r => {
    refsFromOpportunity(r, accounts, contacts)
    return toOpportunity(r)
  })
  return {
    patch: { opportunities, dealRegistrations: (res.registrations ?? []).map(toRegistration), accountRefs: accounts, contactRefs: contacts },
    counts: res.counts,
  }
}

/* ------------------------------ Opportunities ----------------------------- */

export async function loadOpportunityList(view: 'distributed' | 'managed', signal?: AbortSignal): Promise<CachePatch> {
  const res = await serverLogic<{ status: string; opportunities: Row[]; registrations: Row[] }>('opportunity-list', { view }, signal)
  const accounts: Account[] = []
  const contacts: Contact[] = []
  const opportunities = res.opportunities.map(r => {
    refsFromOpportunity(r, accounts, contacts)
    return toOpportunity(r)
  })
  return { opportunities, dealRegistrations: res.registrations.map(toRegistration), accountRefs: accounts, contactRefs: contacts }
}

export interface WorkspaceLookups {
  partnerId: string | null
  customerAccounts: Account[]
  customerContacts: Contact[]
  partnerContacts: Contact[]
  territories: Territory[]
}

interface WorkspacePayload {
  status: string
  found?: boolean
  opportunity?: Row
  products?: Row[]
  registrations?: Row[]
  comments?: Row[]
  lookups?: { partnerId: string | null; customerAccounts: Row[]; customerContacts: Row[]; partnerContacts: Row[]; territories: Row[] }
}

export async function loadOpportunityWorkspace(
  id: string | null,
  options: { lookups?: boolean } = {},
  signal?: AbortSignal,
): Promise<{ found: boolean; patch: CachePatch; lookups?: WorkspaceLookups }> {
  const res = await serverLogic<WorkspacePayload>(
    'opportunity-workspace',
    id ? { id, include: options.lookups ? 'lookups' : undefined } : { mode: 'create' },
    signal,
  )
  const patch: CachePatch = { accountRefs: [], contactRefs: [] }
  if (res.opportunity) {
    const row = res.opportunity
    refsFromOpportunity(row, patch.accountRefs!, patch.contactRefs!)
    const opp = toOpportunity(row)
    opp.products = (res.products ?? []).map(toProduct)
    patch.opportunities = [opp]
    patch.dealRegistrations = (res.registrations ?? []).map(toRegistration)
    for (const r of res.registrations ?? []) if (r.adx_PartnerContact) patch.contactRefs!.push(toContact(r.adx_PartnerContact as Row))
    patch.comments = (res.comments ?? []).map(c => toComment(c, 'opportunity', opp.id))
    patch.replace = { dealRegistrations: r => r.opportunityId === opp.id, comments: c => c.regardingType === 'opportunity' && c.regardingId === opp.id }
  }
  let lookups: WorkspaceLookups | undefined
  if (res.lookups) {
    const territories = res.lookups.territories.map(t => ({ id: String(t.territoryid), name: String(t.name ?? '') }))
    for (const t of territories) territoryCache.set(t.name, t.id)
    lookups = {
      partnerId: res.lookups.partnerId,
      customerAccounts: res.lookups.customerAccounts.map(a => toAccountRef(a)),
      customerContacts: res.lookups.customerContacts.map(toContact),
      partnerContacts: res.lookups.partnerContacts.map(toContact),
      territories,
    }
    patch.accountRefs!.push(...lookups.customerAccounts)
    patch.contactRefs!.push(...lookups.customerContacts, ...lookups.partnerContacts)
  }
  return { found: res.found !== false && (!id || !!res.opportunity), patch, lookups }
}

/* ------------------------------ Partner team ------------------------------ */

export async function loadPartnerTeam(contactId?: string, signal?: AbortSignal): Promise<CachePatch> {
  const res = await serverLogic<{ status: string; account: Row | null; contacts: Row[]; invitations: Row[]; comments?: Row[] }>(
    'partner-team',
    { contactId },
    signal,
  )
  const patch: CachePatch = {
    accounts: res.account ? [toAccount(res.account)] : [],
    contacts: res.contacts.map(toContact),
    invitations: res.invitations.map(toInvitation),
  }
  if (contactId && res.comments) {
    patch.comments = res.comments.map(c => toComment(c, 'contact', contactId))
    patch.replace = { comments: c => c.regardingType === 'contact' && c.regardingId === contactId }
  }
  return patch
}

/* -------------------------------- Customers ------------------------------- */

export async function loadCustomerAccountWorkspace(id: string, signal?: AbortSignal): Promise<{ found: boolean; patch: CachePatch }> {
  const res = await serverLogic<{ status: string; found?: boolean; account?: Row; contacts?: Row[] }>('customer-account-workspace', { id }, signal)
  if (res.found === false || !res.account) return { found: false, patch: {} }
  const primary = res.account.primarycontactid as Row | undefined
  return {
    found: true,
    patch: {
      accounts: [toAccount(res.account)],
      contacts: (res.contacts ?? []).map(toContact),
      contactRefs: primary?.contactid ? [toContact(primary)] : [],
      replace: { contacts: c => c.parentAccountId === id },
    },
  }
}

/** L-002: customer accounts managed by the caller's partner (contact-directory; primary contact expanded). */
export async function loadCustomerAccounts(_partnerId: string, signal?: AbortSignal): Promise<CachePatch> {
  const res = await serverLogic<{ status: string; accounts: Row[] }>('contact-directory', { scope: 'accounts' }, signal)
  const rows = res.accounts ?? []
  return {
    accounts: rows.map(toAccount),
    contactRefs: rows
      .map(r => r.primarycontactid as Row | undefined)
      .filter((c): c is Row => !!c?.contactid)
      .map(toContact),
  }
}

/** L-003: customer contacts managed by the caller's partner (contact-directory; parent account expanded). */
export async function loadCustomerContacts(_partnerId: string, signal?: AbortSignal): Promise<CachePatch> {
  const res = await serverLogic<{ status: string; contacts: Row[] }>('contact-directory', { scope: 'customers' }, signal)
  const rows = res.contacts ?? []
  return {
    contacts: rows.map(toContact),
    accountRefs: rows
      .map(r => r.parentcustomerid_account as Row | undefined)
      .filter((a): a is Row => !!a?.accountid)
      .map(a => toAccountRef(a)),
  }
}
