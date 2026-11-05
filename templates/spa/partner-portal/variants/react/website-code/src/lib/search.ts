import type { Database, Role } from '../data/types'
import { FAQS } from './program'
import { visiblePages, type SitePage } from './sitePages'
import { can, customerAccounts, customerContacts, distributedOpportunities, managedOpportunities, myBooking, partnerContacts, PARTNER_ROLES, technicianWorkOrders, type Session } from './access'
import { formatCurrency, formatDate, fullName, todayIso } from './format'

/**
 * Global search model shared by the mock index (this file) and the live `global-search` / `assistant`
 * server logic, which return records in this same shape. Pages and FAQs are always searched client-side.
 */
export type SearchType = 'opp' | 'account' | 'contact' | 'partner' | 'workorder' | 'page'

export interface SearchItem {
  type: SearchType
  id: string
  title: string
  /** Searchable attributes (label → value) used for matching and the "Matched on …" hint. */
  fields: Record<string, string>
  // Opportunity
  status?: string
  customer?: string
  revenue?: number | null
  closeDate?: string
  expiryDate?: string
  collaboration?: boolean
  distributed?: boolean
  registrationStatus?: string
  registrationExpires?: string
  // Account
  active?: boolean
  primaryContact?: string
  city?: string
  openCount?: number
  openRevenue?: number
  // Contact / partner contact
  jobTitle?: string
  account?: string
  email?: string
  partnerRole?: string
  // Work order (Technician workspace)
  site?: string
  // Page / FAQ
  path?: string
  description?: string
  faq?: boolean
}

export const TYPE_LABELS: Record<SearchType, { plural: string; one: string }> = {
  opp: { plural: 'Opportunities', one: 'Opportunity' },
  account: { plural: 'Customer accounts', one: 'Customer account' },
  contact: { plural: 'Customer contacts', one: 'Customer contact' },
  partner: { plural: 'Partner contacts', one: 'Partner contact' },
  workorder: { plural: 'Work orders', one: 'Work order' },
  page: { plural: 'Pages & help', one: 'Page' },
}
export const TYPE_ORDER: SearchType[] = ['workorder', 'opp', 'account', 'contact', 'partner', 'page']

const enc = encodeURIComponent

/** Where a result opens (distributed → summary, collaborative → read-only details). */
export function itemPath(item: SearchItem): string {
  switch (item.type) {
    case 'opp':
      if (item.distributed) return `/opportunities/distributed-opportunities/opportunity-summary/?id=${enc(item.id)}`
      return `/opportunities/managed-opportunities/opportunity-details${item.collaboration ? '-shared' : ''}/?id=${enc(item.id)}`
    case 'account':
      return `/customers/customer-accounts/edit-customer-account/?id=${enc(item.id)}`
    case 'contact':
      return `/customers/customer-contacts/edit-customer-contact/?id=${enc(item.id)}`
    case 'partner':
      return `/profile/manage-access/edit-partner-contact/?id=${enc(item.id)}`
    case 'workorder':
      return `/work-orders/work-order-details/?id=${enc(item.id)}`
    case 'page':
      return item.path ?? '/'
  }
}

export function daysFromToday(iso?: string): number | undefined {
  if (!iso) return undefined
  return Math.round((Date.parse(iso.slice(0, 10) + 'T00:00:00Z') - Date.parse(todayIso() + 'T00:00:00Z')) / 86_400_000)
}

/** Deadline worth surfacing on a result (distributed response due or registration expiring). */
export function urgencyOf(item: SearchItem): string | undefined {
  if (item.type !== 'opp') return undefined
  if (item.distributed && item.expiryDate) return `Expires ${formatDate(item.expiryDate).replace(/, \d{4}$/, '')}`
  if (item.registrationStatus === 'Expiring') return 'Registration expiring'
  return undefined
}

/** Secondary line for a result row. */
export function itemMeta(item: SearchItem): string[] {
  switch (item.type) {
    case 'opp':
      return [
        item.customer ?? '',
        formatCurrency(item.revenue),
        item.distributed
          ? item.expiryDate
            ? `Respond by ${formatDate(item.expiryDate)}`
            : 'Awaiting response'
          : item.closeDate
            ? `Closes ${formatDate(item.closeDate)}`
            : '',
      ]
    case 'account':
      return [
        item.primaryContact ?? '',
        item.city ?? '',
        item.openCount === undefined ? '' : item.openCount ? `${item.openCount} open · ${formatCurrency(item.openRevenue)}` : 'No open opportunities',
      ]
    case 'contact':
      return [item.jobTitle ?? '', item.account ?? '', item.email ?? '']
    case 'partner':
      return [item.partnerRole ?? '', item.email ?? '']
    case 'workorder':
      return [item.site ?? '', item.customer ?? '']
    case 'page':
      return [item.faq ? 'FAQ' : '', item.description ?? '']
  }
}

/* ---------------------------------- Index ---------------------------------- */

const OPEN = new Set(['In Progress', 'On Hold', 'Accepted'])

/** Mock-mode record index, scoped by the same session-aware selectors the pages use. */
export function recordIndex(db: Database, session: Session): SearchItem[] {
  if (can(session.role, 'work-orders')) return workOrderIndex(db, session)
  if (!PARTNER_ROLES.includes(session.role)) return []
  const items: SearchItem[] = []
  const accountName = (id?: string) => db.accounts.find(a => a.id === id)?.name ?? ''
  const contactName = (id?: string) => {
    const c = db.contacts.find(x => x.id === id)
    return c ? fullName(c) : ''
  }
  const seen = new Set<string>()
  const opps = [...distributedOpportunities(db, session), ...managedOpportunities(db, session)].filter(o => !seen.has(o.id) && !!seen.add(o.id))
  for (const o of opps) {
    const reg = db.dealRegistrations.filter(r => r.opportunityId === o.id).sort((a, b) => b.submissionDate.localeCompare(a.submissionDate))[0]
    const distributed = o.status === 'Delivered' && !o.collaboration
    items.push({
      type: 'opp',
      id: o.id,
      title: o.topic,
      status: o.status,
      customer: accountName(o.customerId),
      revenue: o.estRevenue,
      closeDate: o.estCloseDate,
      expiryDate: o.expiryDate,
      collaboration: o.collaboration,
      distributed,
      registrationStatus: reg?.status ?? '',
      registrationExpires: reg?.expirationDate ?? '',
      fields: {
        Customer: accountName(o.customerId),
        Status: o.status,
        'Registration status': reg?.status ?? '',
        'Partner contact': contactName(o.partnerContactId),
        Territory: o.territory,
        Description: o.description ?? '',
      },
    })
  }
  for (const a of customerAccounts(db, session)) {
    const open = opps.filter(o => o.customerId === a.id && OPEN.has(o.status))
    const city = [a.address.city, a.address.state].filter(Boolean).join(', ')
    items.push({
      type: 'account',
      id: a.id,
      title: a.name,
      active: a.active,
      primaryContact: contactName(a.primaryContactId),
      city,
      openCount: open.length,
      openRevenue: open.reduce((s, o) => s + o.estRevenue, 0),
      fields: { 'Primary contact': contactName(a.primaryContactId), City: city, Phone: a.phone ?? '', Website: a.website ?? '' },
    })
  }
  for (const c of customerContacts(db, session)) {
    items.push({
      type: 'contact',
      id: c.id,
      title: fullName(c),
      active: c.active,
      jobTitle: c.jobTitle,
      account: accountName(c.parentAccountId),
      email: c.email,
      fields: { Email: c.email ?? '', 'Job title': c.jobTitle ?? '', Account: accountName(c.parentAccountId), Phone: c.phone ?? '' },
    })
  }
  if (can(session.role, 'manage-access')) {
    for (const c of partnerContacts(db, session)) {
      items.push({
        type: 'partner',
        id: c.id,
        title: fullName(c),
        active: c.active,
        partnerRole: c.partnerRole,
        email: c.email,
        jobTitle: c.jobTitle,
        fields: { Email: c.email ?? '', 'Partner role': c.partnerRole ?? '', 'Job title': c.jobTitle ?? '' },
      })
    }
  }
  return items
}

/** Technician index: only work orders the session can see (no customers, contacts or opportunities). */
function workOrderIndex(db: Database, session: Session): SearchItem[] {
  return technicianWorkOrders(db, session).map(w => ({
    type: 'workorder',
    id: w.id,
    title: `${w.number} · ${w.title}`,
    status: myBooking(db, session, w.id)?.status ?? w.systemStatus,
    customer: w.customerName,
    site: w.siteName,
    fields: { Customer: w.customerName, Site: w.siteName ?? '', Asset: w.asset?.name ?? '', Case: w.caseNumber ?? '' },
  }))
}

function flatten(pages: SitePage[]): SitePage[] {
  return pages.flatMap(p => [p, ...flatten(p.children ?? [])])
}

const FAQ_PATH = '/partner-program/partner-program-FAQs/'

/** Role-visible pages from the sitemap inventory plus program FAQs. */
export function pageIndex(role: Role): SearchItem[] {
  const pages = flatten(visiblePages(role)).map<SearchItem>(p => ({
    type: 'page',
    id: `page:${p.path}`,
    title: p.title,
    path: p.path,
    description: p.description,
    fields: { Description: p.description },
  }))
  const faqs = FAQS.map<SearchItem>((f, i) => ({
    type: 'page',
    id: `faq:${i}`,
    title: f.q,
    path: FAQ_PATH,
    description: f.a.length > 140 ? `${f.a.slice(0, 137)}…` : f.a,
    faq: true,
    fields: { Answer: f.a },
  }))
  return [...pages, ...faqs]
}

/* --------------------------------- Ranking --------------------------------- */

export interface SearchHit {
  item: SearchItem
  score: number
  /** Attribute that matched when the title did not. */
  field?: { label: string; value: string }
}

/** Ranks items for a query: title prefix > title contains > all words in title > attribute match. */
export function rankItems(items: SearchItem[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)
  const hits: SearchHit[] = []
  for (const item of items) {
    const title = item.title.toLowerCase()
    let score = title.startsWith(q) ? 120 : title.includes(q) ? 100 : terms.every(t => title.includes(t)) ? 80 : 0
    let field: SearchHit['field']
    if (!score) {
      const entry = Object.entries(item.fields).find(([, v]) => v && v.toLowerCase().includes(q))
      if (entry) {
        score = 50
        field = { label: entry[0], value: entry[1] }
      } else if (terms.length > 1) {
        const hay = `${title} ${Object.values(item.fields).join(' ')}`.toLowerCase()
        if (terms.every(t => hay.includes(t))) score = 20
      }
    }
    if (score) hits.push({ item, score: score - (item.type === 'page' ? 15 : 0), field })
  }
  return hits.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
}

/** A query that reads like a question goes to the assistant on Enter. */
export function looksLikeQuestion(q: string): boolean {
  const t = q.trim()
  return /\?\s*$/.test(t) || /^(what|which|who|how|why|when|where|show|list|summari[sz]e|tell|draft|give|find me|do i|can i|should)\b/i.test(t)
}

/* --------------------------------- Actions --------------------------------- */

export type ActionIcon = 'add' | 'inbox' | 'mail' | 'person' | 'ribbon' | 'clock'

export interface SearchAction {
  id: string
  label: string
  path: string
  icon: ActionIcon
  /** Count/deadline shown on the trailing side (e.g. "3 waiting"). */
  badge?: string
  /** Extra words that should match this action. */
  keywords?: string
}

/** Role-aware quick actions (zero-query and keyword matches). */
export function quickActions(role: Role, waitingDistributed: number): SearchAction[] {
  const a: SearchAction[] = []
  if (role === 'anonymous') {
    a.push(
      { id: 'sign-in', label: 'Sign in', path: '/login', icon: 'person', keywords: 'login log in' },
      { id: 'register', label: 'Create an account', path: '/registration', icon: 'add', keywords: 'register sign up new' },
      { id: 'become', label: 'Become a partner', path: '/partner-program/become-a-partner/', icon: 'ribbon', keywords: 'apply join program' },
    )
  }
  if (can(role, 'register-partner'))
    a.push({ id: 'apply', label: 'Register to be a partner', path: '/profile/register-to-be-a-partner/', icon: 'ribbon', keywords: 'apply join application' })
  if (role === 'non-partner') a.push({ id: 'profile', label: 'Edit profile', path: '/profile/', icon: 'person', keywords: 'account settings details' })
  if (can(role, 'opportunities'))
    a.push({
      id: 'create-opp',
      label: 'Create opportunity',
      path: '/opportunities/managed-opportunities/create-opportunity/',
      icon: 'add',
      keywords: 'new deal lead register',
    })
  if (can(role, 'distributed'))
    a.push({
      id: 'distributed',
      label: 'Review distributed opportunities',
      path: '/opportunities/distributed-opportunities/',
      icon: 'inbox',
      badge: waitingDistributed ? `${waitingDistributed} waiting` : undefined,
      keywords: 'accept decline leads respond',
    })
  if (can(role, 'customer-account:create'))
    a.push({
      id: 'create-account',
      label: 'Create customer account',
      path: '/customers/customer-accounts/create-customer-account/',
      icon: 'add',
      keywords: 'new customer company organization',
    })
  if (can(role, 'customer-contact:create'))
    a.push({
      id: 'create-contact',
      label: 'Create customer contact',
      path: '/customers/customer-contacts/create-customer-contact-form/',
      icon: 'add',
      keywords: 'new person customer',
    })
  if (can(role, 'manage-access'))
    a.push({ id: 'invite', label: 'Invite partner contact', path: '/profile/manage-access/', icon: 'mail', keywords: 'add user colleague access' })
  if (can(role, 'work-orders'))
    a.push({ id: 'work-orders', label: 'Open my work orders', path: '/work-orders/', icon: 'inbox', keywords: 'visits jobs bookings schedule today' })
  return a
}

export function matchedActions(actions: SearchAction[], q: string): SearchAction[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  return terms.length ? actions.filter(a => terms.every(t => `${a.label} ${a.keywords ?? ''}`.toLowerCase().includes(t))) : []
}

/** Actions on matched records; they open the existing page, which keeps its own validation and confirmation. */
export function contextualActions(hits: SearchHit[], role: Role): SearchAction[] {
  const out: SearchAction[] = []
  for (const { item } of hits) {
    if (out.length >= 3) break
    if (item.type === 'opp' && item.distributed && can(role, 'distributed'))
      out.push({ id: `respond:${item.id}`, label: `Accept or decline ${item.title}`, path: itemPath(item), icon: 'inbox', badge: urgencyOf(item) })
    else if (item.type === 'opp' && item.registrationStatus === 'Expiring' && !item.collaboration)
      out.push({
        id: `extend:${item.id}`,
        label: `Extend registration · ${item.title}`,
        path: itemPath(item),
        icon: 'clock',
        badge: item.registrationExpires ? `Expires ${formatDate(item.registrationExpires)}` : 'Expiring',
      })
    else if (item.type === 'account' && can(role, 'opportunities'))
      out.push({
        id: `create-opp:${item.id}`,
        label: `Create opportunity for ${item.title}`,
        path: `/opportunities/managed-opportunities/create-opportunity/?customer=${enc(item.id)}`,
        icon: 'add',
      })
    else if (item.type === 'contact' && item.email)
      out.push({ id: `email:${item.id}`, label: `Email ${item.title}`, path: `mailto:${item.email}`, icon: 'mail' })
  }
  return out
}
