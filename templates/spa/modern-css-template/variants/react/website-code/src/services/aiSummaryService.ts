import { getCsrfToken, SupportApiError } from './supportApi'

export type SearchSummaryChunk = { Id?: string; Title?: string; Url?: string; Score?: number }
export type SearchSummaryResponse = {
  Summary: string
  Citations: Record<string, string>
  SummaryTitle?: string
  SearchTitle?: string
  CitationTitleMapping?: Record<string, string>
  Chunks?: SearchSummaryChunk[]
  ErrorMessage?: string
  ResponseStatus?: string
}
type ErrorCode = 'DISABLED' | 'AUTH' | 'NETWORK' | 'HTTP' | 'SERVICE' | 'INVALID_RESPONSE' | 'UNSAFE_SOURCE' | 'NOT_READY'
const messages: Record<ErrorCode, string> = {
  DISABLED: 'AI search summary is turned off for this site.',
  AUTH: 'Your session cannot access AI search. Sign in again or ask the site administrator to check access.',
  NETWORK: 'AI search could not connect. Check your connection and try again.',
  HTTP: 'AI search is temporarily unavailable. Try again later.',
  SERVICE: 'AI search could not generate an answer. Try another search or contact the site administrator.',
  INVALID_RESPONSE: 'AI search returned an invalid response. No answer is displayed. Contact the site administrator if this continues.',
  UNSAFE_SOURCE: 'This AI answer could not be verified against the available knowledge articles, so it is not displayed. Use the suggested matches or contact the site administrator.',
  NOT_READY: 'Knowledge articles are not ready. Wait for support data to load before requesting an AI answer.',
}
export class SearchSummaryApiError extends Error {
  constructor(readonly code: ErrorCode, readonly status?: number) {
    super(messages[code]); this.name = 'SearchSummaryApiError'
  }
}
export const GEN_AI_SEARCH_ENABLE_DOC_URL =
  'https://learn.microsoft.com/power-pages/configure/search/generative-ai#enable-site-search-with-generative-ai'

function invalid(): never { throw new SearchSummaryApiError('INVALID_RESPONSE') }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  return value as Record<string, unknown>
}
function text(value: unknown): string { return typeof value === 'string' ? value : invalid() }
function optionalText(value: unknown): string | undefined { return value == null ? undefined : text(value) }
function citationMap(value: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(record(value))) {
    if (!/^\[\d+\]$/.test(key) || typeof item !== 'string') return invalid()
    result[key] = item
  }
  return result
}
function noResults(value: string): boolean { return /^no\s*results(?:\s+found)?[.!]?$/i.test(value) }
function noRelevantResponses(value: string): boolean { return /^no relevant responses were found\.?$/i.test(value) }
function responseStatus(value: unknown): string | undefined {
  if (value == null || typeof value === 'string') return optionalText(value)?.trim()
  const status = record(value)
  if (typeof status.Code !== 'number' || !Number.isFinite(status.Code) || !Number.isInteger(status.Code) ||
    typeof status.Message !== 'string') return invalid()
  if (status.Code !== 200) throw new SearchSummaryApiError('SERVICE', status.Code)
  const message = status.Message.trim()
  if (!/^success$/i.test(message) && !noResults(message) && !noRelevantResponses(message)) throw new SearchSummaryApiError('SERVICE')
  return message
}
export function decodeSearchSummary(value: unknown): SearchSummaryResponse {
  const body = record(value)
  if ('Code' in body || 'Message' in body) {
    if (body.Code === 400 && typeof body.Message === 'string' && /^Gen AI Search is disabled\.?$/i.test(body.Message.trim())) {
      throw new SearchSummaryApiError('DISABLED')
    }
    if (typeof body.Code !== 'number' || typeof body.Message !== 'string') return invalid()
    throw new SearchSummaryApiError('SERVICE')
  }
  const status = responseStatus(body.ResponseStatus)
  const emptyStatus = status !== undefined && (noResults(status) || noRelevantResponses(status))
  let chunks: SearchSummaryChunk[] | undefined
  if (body.Chunks != null) {
    if (!Array.isArray(body.Chunks)) return invalid()
    chunks = body.Chunks.map(value => {
      const chunk = record(value)
      const score = chunk.Score == null ? undefined : chunk.Score
      if (score !== undefined && (typeof score !== 'number' || !Number.isFinite(score))) return invalid()
      return { Id: optionalText(chunk.Id), Title: optionalText(chunk.Title), Url: optionalText(chunk.Url), Score: score }
    })
  }
  const result: SearchSummaryResponse = {
    Summary: emptyStatus && body.Summary === null ? '' : text(body.Summary),
    Citations: emptyStatus && body.Citations === null ? {} : citationMap(body.Citations),
    SummaryTitle: optionalText(body.SummaryTitle), SearchTitle: optionalText(body.SearchTitle),
    CitationTitleMapping: body.CitationTitleMapping == null ? undefined : citationMap(body.CitationTitleMapping),
    Chunks: chunks, ErrorMessage: optionalText(body.ErrorMessage), ResponseStatus: status,
  }
  const error = result.ErrorMessage?.trim()
  const emptyPayload = !result.Summary.trim() && !Object.keys(result.Citations).length &&
    !Object.keys(result.CitationTitleMapping ?? {}).length && !result.Chunks?.length
  if ((emptyStatus || (error && noResults(error))) && !emptyPayload) throw new SearchSummaryApiError('SERVICE')
  const noRelevantApology = emptyStatus && noRelevantResponses(status ?? '') &&
    error === "I'm sorry, I'm unable to process your question. Can you rephrase or ask another question?"
  if (error && !(noResults(error) && emptyPayload) && !noRelevantApology) throw new SearchSummaryApiError('SERVICE')
  if (status && !/^success$/i.test(status) && !emptyStatus &&
    !(error && noResults(error) && !result.Summary.trim() && /^(failure|failed)$/i.test(status))) {
    throw new SearchSummaryApiError('SERVICE')
  }
  return result
}

export async function fetchSearchSummary(userQuery: string, signal?: AbortSignal): Promise<SearchSummaryResponse> {
  try {
    signal?.throwIfAborted()
    const verification = await getCsrfToken()
    signal?.throwIfAborted()
    const response = await fetch('/_api/search/v1.0/summary', {
      method: 'POST', credentials: 'same-origin', signal,
      headers: {
        Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded',
        __RequestVerificationToken: verification, 'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({ userQuery }).toString(),
    })
    if (!response.ok) throw new SearchSummaryApiError(response.status === 401 || response.status === 403 ? 'AUTH' : 'HTTP', response.status)
    const body: unknown = await response.json()
    signal?.throwIfAborted()
    return decodeSearchSummary(body)
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error
    if (error instanceof SearchSummaryApiError) throw error
    if (error instanceof SupportApiError) throw new SearchSummaryApiError('AUTH', error.status)
    throw new SearchSummaryApiError(error instanceof SyntaxError ? 'INVALID_RESPONSE' : 'NETWORK')
  }
}

export type KnowledgeSource = { id: string; number?: string; title: string }
export type VerifiedCitation = { token: string; articleId: string; href: string; title: string }
type SummaryPart = { kind: 'text'; text: string } | { kind: 'citation'; token: string; url: string }
export type VerifiedSummary = {
  title?: string
  parts: ({ kind: 'text'; text: string } | { kind: 'citation'; source: VerifiedCitation })[]
  sources: VerifiedCitation[]
}
function unsafe(): never { throw new SearchSummaryApiError('UNSAFE_SOURCE') }
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function resolveKnowledgeSource(url: string, articles: readonly KnowledgeSource[], origin: string): KnowledgeSource {
  let parsed: URL
  try { parsed = new URL(url, origin) } catch { return unsafe() }
  if (/[\s\\]/.test(url) || !/^https?:$/.test(parsed.protocol) || parsed.origin !== origin ||
    parsed.username || parsed.password || parsed.hash) return unsafe()
  let candidates: readonly KnowledgeSource[]
  const routeId = parsed.pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1]
  const number = parsed.pathname.match(/^\/knowledgebase\/article\/(KA-\d+)\/?$/i)?.[1]
  if (parsed.pathname === '/' || /^\/page-not-found\/?$/.test(parsed.pathname)) {
    const ids = parsed.searchParams.getAll('id')
    if (ids.length !== 1 || !guid.test(ids[0]) || [...parsed.searchParams.keys()].some(key => key !== 'id')) return unsafe()
    candidates = articles.filter(article => article.id.toLowerCase() === ids[0].toLowerCase())
  } else if (routeId && guid.test(routeId) && !parsed.search) {
    candidates = articles.filter(article => article.id.toLowerCase() === routeId.toLowerCase())
  } else if (number && !parsed.search) {
    candidates = articles.filter(article => article.number?.toLowerCase() === number.toLowerCase())
  } else return unsafe()
  if (candidates.length !== 1 || !guid.test(candidates[0].id)) return unsafe()
  return candidates[0]
}

function parseSummaryWithCitations(summary: string): SummaryPart[] {
  if (!summary) return []
  const re = /\[\[(\d+)\]\]\(([^)]+)\)/g
  const parts: SummaryPart[] = []
  let last = 0, match: RegExpExecArray | null
  while ((match = re.exec(summary)) !== null) {
    if (match.index > last) parts.push({ kind: 'text', text: summary.slice(last, match.index) })
    parts.push({ kind: 'citation', token: `[${match[1]}]`, url: match[2].trim() })
    last = re.lastIndex
  }
  if (last < summary.length) parts.push({ kind: 'text', text: summary.slice(last) })
  return parts
}

export function verifyKnowledgeSummary(response: SearchSummaryResponse, articles: readonly KnowledgeSource[], origin: string): VerifiedSummary | null {
  // The complete authorized catalogue is a display guard, not a substitute for KB-only server indexing.
  const sources = Object.entries(response.Citations).map(([token, url]) => {
    const article = resolveKnowledgeSource(url, articles, origin)
    return { token, articleId: article.id, href: `/articles/${article.id}`, title: article.title.trim() || response.CitationTitleMapping?.[token]?.trim() || article.number || 'Knowledge article' }
  })
  for (const chunk of response.Chunks ?? []) {
    if (chunk.Url !== undefined) resolveKnowledgeSource(chunk.Url, articles, origin)
  }
  if (!response.Summary.trim()) return null
  if (!sources.length) return unsafe()
  const parts = parseSummaryWithCitations(response.Summary).map(part => {
    if (part.kind === 'text') {
      if (part.text.includes('[[')) return unsafe()
      return part
    }
    const source = sources.find(source => source.token === part.token)
    const article = resolveKnowledgeSource(part.url, articles, origin)
    if (!source || source.articleId !== article.id) return unsafe()
    return { kind: 'citation' as const, source }
  })
  return { title: response.SummaryTitle?.trim() || undefined, parts, sources }
}
