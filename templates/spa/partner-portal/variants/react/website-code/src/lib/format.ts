import type { Address, Contact } from '../data/types'

/**
 * The single currency the portal displays and asks for. Amounts are formatted with Intl for this locale and
 * code ("$48,000"); form hints and messages use the labels below. Dataverse money values are shown as stored,
 * so the records' transaction currency must match (see README "Currency").
 */
export const CURRENCY = {
  code: 'USD',
  locale: 'en-US',
  symbol: '$',
  /** Hint under money inputs. */
  hint: 'In US dollars (USD)',
  /** Phrase for validation messages: "Enter an estimated revenue of 0 or more, in US dollars". */
  inWords: 'in US dollars',
} as const

const currencyCents = new Intl.NumberFormat(CURRENCY.locale, { style: 'currency', currency: CURRENCY.code, minimumFractionDigits: 2, maximumFractionDigits: 2 })
const currencyWhole = new Intl.NumberFormat(CURRENCY.locale, { style: 'currency', currency: CURRENCY.code, minimumFractionDigits: 0, maximumFractionDigits: 0 })

/**
 * Currency displays in whole dollars ("$48,000") by default; pass `{ cents: true }` for prices and
 * extended amounts ("$1,249.50"). Empty values display an em dash.
 */
export function formatCurrency(value?: number | null, options?: { cents?: boolean }): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return (options?.cents ? currencyCents : currencyWhole).format(value)
}

/** Compact currency for chart axes and KPIs: "$437.5K", "$1.2M", "$950". */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const trim = (n: number) => String(Math.round(n * 10) / 10)
  if (abs >= 1_000_000) return `${sign}${CURRENCY.symbol}${trim(abs / 1_000_000)}M`
  if (abs >= 1000) return `${sign}${CURRENCY.symbol}${trim(abs / 1000)}K`
  return `${sign}${CURRENCY.symbol}${Math.round(abs)}`
}

function parseIsoDate(value: string): Date | null {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

// en-US medium style gives "Oct 21, 2026" consistently (en-CA adds a period in some ICU versions).
const mediumDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

/** Dates display unambiguously as "Oct 21, 2026". Accepts YYYY-MM-DD or full ISO strings. */
export function formatDate(value?: string): string {
  if (!value) return '—'
  const date = parseIsoDate(value)
  return date ? mediumDate.format(date) : value
}

/** Numeric MM/DD/YYYY date for CSV exports and other machine-friendly output. */
export function formatDateNumeric(value?: string): string {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-')
  if (!y || !m || !d) return value
  return `${m}/${d}/${y}`
}

export function formatDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatDate(value)
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${value.length > 10 ? mediumDate.format(date) : formatDate(value)} ${time}`
}

export function fullName(c?: Pick<Contact, 'firstName' | 'lastName'>): string {
  if (!c) return '—'
  return `${c.firstName} ${c.lastName}`.trim()
}

export function formatAddress(a?: Address): string {
  if (!a) return ''
  const cityLine = [a.city, a.state].filter(Boolean).join(', ') + (a.postalCode ? ` ${a.postalCode}` : '')
  return [a.line1, a.line2, a.line3, cityLine.trim(), a.country].filter(Boolean).join(', ')
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

let seq = 0
export function newId(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}${seq}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
