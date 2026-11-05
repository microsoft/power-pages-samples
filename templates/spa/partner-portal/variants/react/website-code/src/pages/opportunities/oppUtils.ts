import { useCallback } from 'react'
import type { Database, DealRegistration, DealRegistrationStatus, Opportunity, OpportunityStatus } from '../../data/types'
import { useApp } from '../../store/AppStore'
import { fullName, todayIso } from '../../lib/format'
import { runOpportunityAction, type OpportunityAction } from '../../services/actions'

/** Live-mode success messages for the workflow-backed opportunity actions (spec defaults). */
export const LIVE_ACTION_MESSAGES: Record<OpportunityAction, string> = {
  accept: 'The opportunity has been accepted.',
  decline: 'The opportunity has been declined.',
  return: 'The opportunity has been returned.',
  win: 'The opportunity has been closed as won.',
  lose: 'The opportunity has been closed as lost.',
  reopen: 'The opportunity has been reopened.',
}

export const OPP_ROUTES = {
  home: '/opportunities/',
  distributed: '/opportunities/distributed-opportunities/',
  summary: (id: string) => `/opportunities/distributed-opportunities/opportunity-summary/?id=${encodeURIComponent(id)}`,
  managed: '/opportunities/managed-opportunities/',
  create: '/opportunities/managed-opportunities/create-opportunity/',
  details: (id: string) => `/opportunities/managed-opportunities/opportunity-details/?id=${encodeURIComponent(id)}`,
  shared: (id: string) => `/opportunities/managed-opportunities/opportunity-details-shared/?id=${encodeURIComponent(id)}`,
}

export const detailsRoute = (o: Opportunity) => (o.collaboration ? OPP_ROUTES.shared(o.id) : OPP_ROUTES.details(o.id))

export const CLOSED_OPP_STATUSES = new Set<OpportunityStatus>(['Won', 'Lost', 'Canceled'])
/** Statuses in which an opportunity is still being worked and can be closed or registered. */
export const OPEN_OPP_STATUSES = new Set<OpportunityStatus>(['In Progress', 'On Hold', 'Accepted'])
export const ACTIVE_REG_STATUSES = new Set<DealRegistrationStatus>(['New', 'Under Review', 'Approved', 'Expiring'])

export function accountName(db: Database, id?: string): string {
  if (!id) return '—'
  return db.accounts.find(a => a.id === id)?.name ?? '—'
}

export function contactName(db: Database, id?: string): string {
  if (!id) return '—'
  const c = db.contacts.find(x => x.id === id)
  return c ? fullName(c) : '—'
}

/** Registrations for an opportunity, newest first. */
export function registrationsFor(db: Database, opportunityId: string): DealRegistration[] {
  return db.dealRegistrations
    .map((r, i) => ({ r, i }))
    .filter(x => x.r.opportunityId === opportunityId)
    .sort((a, b) => b.r.submissionDate.localeCompare(a.r.submissionDate) || b.i - a.i)
    .map(x => x.r)
}

export function latestOpenRegistrationStatus(db: Database, opportunityId: string): string {
  return registrationsFor(db, opportunityId).find(r => r.status !== 'Closed')?.status ?? '—'
}

export function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined
  const target = new Date(iso.slice(0, 10) + 'T00:00:00Z').getTime()
  const today = new Date(todayIso() + 'T00:00:00Z').getTime()
  return Math.round((target - today) / 86_400_000)
}

/** Topic search: plain text matches anywhere; `*` is a wildcard anchored at the start of the topic. */
export function wildcardMatch(text: string, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  if (!q.includes('*')) return text.toLowerCase().includes(q.toLowerCase())
  const pattern = q
    .split('*')
    .map(p => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${pattern}`, 'i').test(text)
}

export function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Status filter for the managed list ("Open" = still being worked). */
export type OppStatusFilter = 'open' | 'won' | 'lost' | 'all'

export const OPP_STATUS_FILTERS: { id: OppStatusFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'all', label: 'All' },
]

export function matchesStatusFilter(o: Opportunity, filter: OppStatusFilter): boolean {
  if (filter === 'open') return !CLOSED_OPP_STATUSES.has(o.status)
  if (filter === 'won') return o.status === 'Won'
  if (filter === 'lost') return o.status === 'Lost'
  return true
}

export const isStatusFilter = (v: string | null): v is OppStatusFilter => OPP_STATUS_FILTERS.some(f => f.id === v)

/** Managed list URL, optionally pre-filtered (used by the Opportunities home KPI tiles). */
export function managedRoute(options: { status?: OppStatusFilter; view?: 'managed' | 'collaborative' } = {}): string {
  const params = new URLSearchParams()
  if (options.view && options.view !== 'managed') params.set('view', options.view)
  if (options.status && options.status !== 'open') params.set('status', options.status)
  const qs = params.toString()
  return qs ? `${OPP_ROUTES.managed}?${qs}` : OPP_ROUTES.managed
}

export interface DeclineInput {
  reason: string
  note?: string
}

/** Accept / Decline behaviour shared by the distributed list and the opportunity summary. */
export function useDistributedResponse() {
  const { mode, mutate, perform, notify } = useApp()
  const live = mode === 'live'

  /** Accepts the opportunity; callers navigate to its details page (only when it resolves to true) so the next step is visible. */
  const accept = useCallback(
    async (o: Opportunity, refresh?: () => Promise<void>) => {
      const ok = await perform({
        mock: d => {
          const x = d.opportunities.find(y => y.id === o.id)
          if (!x) return
          x.status = 'Accepted'
          x.acceptedDate = todayIso()
          x.modifiedOn = todayIso()
        },
        live: () => runOpportunityAction('accept', o.id),
        refresh,
      })
      if (!ok) return false
      notify(live ? LIVE_ACTION_MESSAGES.accept : `"${o.topic}" accepted. Next, add products and customer contacts.`, 'success')
      return true
    },
    [live, perform, notify],
  )

  /** Declines with a reason (mock). The original description is kept; the reason and date are stored separately. */
  const decline = useCallback(
    async (o: Opportunity, input: DeclineInput, refresh?: () => Promise<void>) => {
      const note = input.note?.trim()
      const previous = { status: o.status, declineReason: o.declineReason, declinedOn: o.declinedOn, modifiedOn: o.modifiedOn }
      const ok = await perform({
        mock: d => {
          const x = d.opportunities.find(y => y.id === o.id)
          if (!x) return
          x.status = 'Declined'
          x.declineReason = note ? `${input.reason}: ${note}` : input.reason
          x.declinedOn = todayIso()
          x.modifiedOn = todayIso()
        },
        live: () => runOpportunityAction('decline', o.id),
        refresh,
      })
      if (!ok) return false
      if (live) {
        notify(LIVE_ACTION_MESSAGES.decline, 'success')
        return true
      }
      notify(`"${o.topic}" declined and returned to Zava.`, 'info', {
        action: {
          label: 'Undo',
          onClick: () => {
            mutate(d => {
              const x = d.opportunities.find(y => y.id === o.id)
              if (!x) return
              x.status = previous.status
              x.declineReason = previous.declineReason
              x.declinedOn = previous.declinedOn
              x.modifiedOn = previous.modifiedOn
            })
          },
        },
      })
      return true
    },
    [live, mutate, perform, notify],
  )

  return { accept, decline }
}
