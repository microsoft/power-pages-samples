import type { Database } from '../data/types'
import { can, PARTNER_ROLES, type Session } from '../lib/access'
import { faqAnswer, mockAnswer, type AssistantAnswer } from '../lib/assistant'
import { pageIndex, rankItems, recordIndex, TYPE_ORDER, type SearchHit, type SearchItem } from '../lib/search'
import { isLive } from './config'
import { serverLogic, serverLogicPost } from './http'

/** Simulated request time in mock mode so the loading state matches live behaviour. */
const MOCK_LATENCY_MS = 250

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const onAbort = () => {
      window.clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const id = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })

export interface SearchContext {
  db: Database
  session: Session
}

export interface SearchOutcome {
  status: 'ready' | 'partial' | 'error'
  hits: SearchHit[]
  message?: string
}

interface SearchResponse {
  status: 'success' | 'partial'
  message?: string
  hits?: SearchHit[]
  /** Compatibility with the previous endpoint during a rolling deployment. */
  items?: SearchItem[]
}

function isSearchItem(value: unknown): value is SearchItem {
  if (!value || typeof value !== 'object') return false
  return (
    'type' in value &&
    TYPE_ORDER.some(type => type === value.type) &&
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'fields' in value &&
    !!value.fields &&
    typeof value.fields === 'object' &&
    Object.values(value.fields).every(field => typeof field === 'string')
  )
}

function isSearchHit(value: unknown): value is SearchHit {
  if (!value || typeof value !== 'object') return false
  return (
    'item' in value &&
    isSearchItem(value.item) &&
    'score' in value &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    (!('field' in value) ||
      value.field === undefined ||
      (!!value.field &&
        typeof value.field === 'object' &&
        'label' in value.field &&
        typeof value.field.label === 'string' &&
        'value' in value.field &&
        typeof value.field.value === 'string'))
  )
}

/**
 * Records matching `query` that the signed-in contact can open. Live: `global-search` server logic (Dataverse,
 * table-permission scoped). Mock: the session-scoped seed index. Pages and FAQs are always added client-side.
 */
export async function searchAll(query: string, ctx: SearchContext, signal?: AbortSignal): Promise<SearchOutcome> {
  const q = query.trim()
  signal?.throwIfAborted()
  const pages = rankItems(pageIndex(ctx.session.role), q)
  // Technicians search only the work orders already loaded for them; the sales global-search logic isn't theirs.
  if (q && can(ctx.session.role, 'work-orders'))
    return { status: 'ready', hits: [...rankItems(recordIndex(ctx.db, ctx.session), q), ...pages].sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title)) }
  if (!q || !PARTNER_ROLES.includes(ctx.session.role)) return { status: 'ready', hits: pages }
  if (q.length < 2) return { status: 'ready', hits: pages, message: 'Enter at least 2 characters to search records.' }
  try {
    let records: SearchHit[]
    let response: SearchResponse | undefined
    if (isLive()) {
      response = await serverLogic<SearchResponse>('global-search', { q, top: '20' }, signal)
      if (!response || !['success', 'partial'].includes(response.status) || (!Array.isArray(response.hits) && !Array.isArray(response.items)))
        throw new Error('Invalid global-search response')
      if (response.hits ? !response.hits.every(isSearchHit) : !response.items?.every(isSearchItem)) throw new Error('Invalid global-search results')
      if (response.message !== undefined && typeof response.message !== 'string') throw new Error('Invalid global-search message')
      // The server ranks full fields before shortening display snippets. Do not filter them a second time.
      records = response.hits ?? rankItems(response.items ?? [], q)
    } else {
      await wait(MOCK_LATENCY_MS, signal)
      records = rankItems(recordIndex(ctx.db, ctx.session), q)
    }
    signal?.throwIfAborted()
    return {
      status: response?.status === 'partial' ? 'partial' : 'ready',
      hits: [...records, ...pages].sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title)),
      message: response?.status === 'partial' ? response.message || 'Some record results are unavailable. Try again.' : undefined,
    }
  } catch (error) {
    signal?.throwIfAborted()
    if (error instanceof Error && error.name === 'AbortError') throw error
    console.warn('Global search failed:', error)
    return {
      status: pages.length ? 'partial' : 'error',
      hits: pages,
      message: 'Record search is unavailable. Pages and help are still searchable. Try again.',
    }
  }
}

/**
 * Partner assistant. Program questions are answered from static FAQ content; record questions go to the
 * `assistant` server logic (live) or the mock engine over the scoped seed index.
 */
export async function askAssistant(message: string, ctx: SearchContext, signal?: AbortSignal): Promise<AssistantAnswer> {
  signal?.throwIfAborted()
  const faq = faqAnswer(message, ctx.session.role)
  if (faq) return faq
  if (isLive() && PARTNER_ROLES.includes(ctx.session.role)) {
    const res = await serverLogicPost<AssistantAnswer & { status?: string; message?: string }>('assistant', { message }, signal)
    return { intent: res.intent, blocks: res.blocks ?? [], citations: res.citations ?? [], followUps: res.followUps ?? [] }
  }
  await wait(MOCK_LATENCY_MS * 2, signal)
  return mockAnswer(message, recordIndex(ctx.db, ctx.session), ctx.session.role)
}

/* ------------------------------ Recent items ------------------------------ */

export type RecentEntry = { kind: 'query'; text: string } | { kind: 'item'; item: SearchItem }

const RECENT_LIMIT = 5
const recentKey = (session: Session) => `contoso-partner-portal:search-recent:v1:${session.contact?.id ?? session.role}`

/** Recent searches and opened records, per signed-in contact (browser only; nothing is sent to the server). */
export function loadRecent(session: Session): RecentEntry[] {
  if (session.role === 'anonymous') return []
  try {
    const raw = localStorage.getItem(recentKey(session))
    return raw ? (JSON.parse(raw) as RecentEntry[]) : []
  } catch {
    return []
  }
}

export function saveRecent(session: Session, entries: RecentEntry[]) {
  if (session.role === 'anonymous') return
  try {
    if (entries.length) localStorage.setItem(recentKey(session), JSON.stringify(entries.slice(0, RECENT_LIMIT)))
    else localStorage.removeItem(recentKey(session))
  } catch {
    /* storage full or disabled */
  }
}

export const recentId = (e: RecentEntry) => (e.kind === 'query' ? `q:${e.text.toLowerCase()}` : `i:${e.item.type}:${e.item.id}`)

export function pushRecent(session: Session, entry: RecentEntry): RecentEntry[] {
  const next = [entry, ...loadRecent(session).filter(e => recentId(e) !== recentId(entry))].slice(0, RECENT_LIMIT)
  saveRecent(session, next)
  return next
}
