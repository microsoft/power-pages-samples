import type { CSSProperties } from 'react'
import type { DealRegistration, Opportunity } from '../../data/types'
import { CLOSED_OPP_STATUSES, managedRoute, OPP_ROUTES } from '../opportunities/oppUtils'
import { PALETTE } from '../../theme/fluentTheme'

export const DAY_MS = 86_400_000

/**
 * Chart series from the approved home dashboard proposal (docs\home-dashboard-proposal.html, `--s-*` variables).
 * Keep these values in sync with that document; every pipeline chart, legend and swatch reads them from here.
 */
const SERIES = {
  delivered: '#0078D4',
  accepted: '#107C10',
  inProgress: '#4F46E5',
  onHold: '#CA5010',
  won: '#0B5A08',
  lost: '#D13438',
  canceled: '#8A8886',
}
export const NEUTRAL_SERIES = SERIES.canceled

/**
 * Statuses the proposal doesn't name take the proposal colour of their StatusBadge tone (Returned is amber like
 * On Hold, Purchased green like Accepted, Declined red like Lost, Expired slate like Canceled).
 */
export const STATUS_CHART_COLOR: Record<string, string> = {
  Delivered: SERIES.delivered,
  Accepted: SERIES.accepted,
  'In Progress': SERIES.inProgress,
  'On Hold': SERIES.onHold,
  Returned: SERIES.onHold,
  Purchased: SERIES.accepted,
  Declined: SERIES.lost,
  Expired: SERIES.canceled,
  Won: SERIES.won,
  Lost: SERIES.lost,
  Canceled: SERIES.canceled,
}
/** Inherited colours that would repeat a proposal status in the same bar: hatched so the two stay distinguishable. */
const STATUS_HATCHED = new Set(['Returned', 'Purchased'])
/** Lifecycle order: open statuses first, then closed outcomes. */
const STATUS_ORDER = Object.keys(STATUS_CHART_COLOR)

/** The proposal's "Pending review" is Under Review; New (sky badge) and Expired (slate badge) inherit and are hatched. */
export const REG_STATUS_COLOR: Record<string, string> = {
  New: SERIES.delivered,
  'Under Review': SERIES.delivered,
  Approved: SERIES.accepted,
  Expiring: SERIES.onHold,
  Expired: SERIES.canceled,
  Closed: SERIES.canceled,
  Declined: SERIES.lost,
}
const REG_HATCHED = new Set(['New', 'Expired'])
const REG_ORDER = Object.keys(REG_STATUS_COLOR)

/** Trend charts: won, open (the proposal's In Progress colour) and lost. */
export const OUTCOME_COLOR = { won: SERIES.won, open: SERIES.inProgress, lost: SERIES.lost }

/* --------------------------------- Periods -------------------------------- */

export type ClosePeriod = 'all' | 'quarter' | 'next90'

export const CLOSE_PERIODS: { id: ClosePeriod; label: string; phrase: string }[] = [
  { id: 'all', label: 'All close dates', phrase: 'with any close date' },
  { id: 'quarter', label: 'This quarter', phrase: 'closing this quarter' },
  { id: 'next90', label: 'Next 90 days', phrase: 'closing in the next 90 days' },
]

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const isClosed = (o: Opportunity) => CLOSED_OPP_STATUSES.has(o.status)

/** Closed opportunities use their actual close date when captured. */
export const closeDateOf = (o: Opportunity) => ((isClosed(o) && o.actualCloseDate) || o.estCloseDate).slice(0, 10)

function periodRange(period: ClosePeriod, now = new Date()): [string, string] | null {
  if (period === 'all') return null
  if (period === 'quarter') {
    const start = Math.floor(now.getMonth() / 3) * 3
    return [isoDay(new Date(now.getFullYear(), start, 1)), isoDay(new Date(now.getFullYear(), start + 3, 0))]
  }
  return [isoDay(now), isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90))]
}

export function inPeriod(rows: Opportunity[], period: ClosePeriod): Opportunity[] {
  const range = periodRange(period)
  if (!range) return rows
  return rows.filter(o => closeDateOf(o) >= range[0] && closeDateOf(o) <= range[1])
}

/** Whole days from today (local) until an ISO date; negative when past. */
export function daysUntil(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const now = new Date()
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY_MS)
}

export function relativeDay(days: number): string {
  if (days < -1) return `${-days} days overdue`
  if (days === -1) return 'Yesterday'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

/* -------------------------------- Breakdown ------------------------------- */

export interface Slice {
  name: string
  revenue: number
  count: number
  color: string
  hatched: boolean
}

export interface StatusSlice extends Slice {
  open: boolean
}

export const sumRevenue = (rows: Opportunity[]) => rows.reduce((s, o) => s + o.estRevenue, 0)

export function statusBreakdown(rows: Opportunity[]): StatusSlice[] {
  const map = new Map<string, StatusSlice>()
  for (const o of rows) {
    const s = map.get(o.status) ?? { name: o.status, open: !isClosed(o), revenue: 0, count: 0, color: STATUS_CHART_COLOR[o.status] ?? NEUTRAL_SERIES, hatched: STATUS_HATCHED.has(o.status) }
    s.revenue += o.estRevenue
    s.count += 1
    map.set(o.status, s)
  }
  const rank = (n: string) => (STATUS_ORDER.includes(n) ? STATUS_ORDER.indexOf(n) : STATUS_ORDER.length)
  return [...map.values()].sort((a, b) => Number(b.open) - Number(a.open) || rank(a.name) - rank(b.name))
}

export function registrationBreakdown(regs: DealRegistration[]): Slice[] {
  const map = new Map<string, Slice>()
  for (const r of regs) {
    const s = map.get(r.status) ?? { name: r.status, revenue: 0, count: 0, color: REG_STATUS_COLOR[r.status] ?? NEUTRAL_SERIES, hatched: REG_HATCHED.has(r.status) }
    s.count += 1
    map.set(r.status, s)
  }
  return [...map.values()].sort((a, b) => REG_ORDER.indexOf(a.name) - REG_ORDER.indexOf(b.name))
}

/** Where a status row on the dashboard leads. Delivered opportunities live in the distributed list. */
export function statusHref(status: string, canDistributed: boolean): string {
  if (status === 'Delivered') return canDistributed ? OPP_ROUTES.distributed : managedRoute()
  if (status === 'Won') return managedRoute({ status: 'won' })
  if (status === 'Lost') return managedRoute({ status: 'lost' })
  if (status === 'Canceled') return managedRoute({ status: 'all' })
  return managedRoute()
}

/* ---------------------------------- Colour --------------------------------- */

const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => channel(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
/** Label colours in order of preference: the proposal's white, then theme slate, then black for mid-tone fills. */
const LABEL_COLORS = ['#FFFFFF', PALETTE.slate, '#000000']

/** The first label colour with 4.5:1 or better on the given segment colour (or the strongest, if none reach it). */
export function readableOn(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#FFFFFF'
  const l = luminance(hex)
  const scored = LABEL_COLORS.map(c => ({ c, ratio: contrast(l, luminance(c)) }))
  return (scored.find(s => s.ratio >= 4.5) ?? scored.reduce((a, b) => (b.ratio > a.ratio ? b : a))).c
}

/** Background for a chart segment or legend swatch; hatched fills add diagonal stripes in the label's contrast colour. */
export function seriesFill(color: string, hatched = false): CSSProperties {
  if (!hatched) return { backgroundColor: color }
  const stripe = readableOn(color) === '#FFFFFF' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.35)'
  return { backgroundColor: color, backgroundImage: `repeating-linear-gradient(135deg, ${stripe} 0 2px, transparent 2px 5px)` }
}
