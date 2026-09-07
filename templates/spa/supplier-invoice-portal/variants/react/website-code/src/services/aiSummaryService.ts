// src/services/aiSummaryService.ts
// Power Pages generative-AI Data Summarization API client.
//
// This service targets POST /_api/summarization/data/v1.0/<entitySet>(<id>)?<query>
// with a body of { InstructionIdentifier } (or { RecommendationConfig } for refinement).
// It deliberately uses raw `fetch` rather than the project's `powerPagesFetch` wrapper
// because the summarization endpoint is not OData — it does not want the default
// `Prefer: odata.include-annotations="..."` header that the wrapper injects.
//
// The CSRF token is sourced from `getCsrfToken` in ./powerPagesApi so the token-parsing
// logic lives in exactly one place.
//
// Required headers on every request (per ai-api-reference.md):
//   __RequestVerificationToken  — anti-forgery token (mandatory)
//   X-Requested-With            — XMLHttpRequest (recommended; matches shell.ajaxSafePost)
//   OData-MaxVersion / Version  — 4.0 (required by the underlying Dataverse layer)
//   Content-Type                — application/json; charset=utf-8
//   Accept                      — application/json
// NOTE: do NOT send `Prefer: odata.include-annotations=...` — the AI endpoint does not
// need formatted-value annotations.

import { getCsrfToken } from './powerPagesApi'

// -- Types --------------------------------------------------------------------

export interface DataSummaryRecommendation {
  /** Human-readable prompt text shown on a recommendation chip. */
  Text: string
  /**
   * Opaque token that must be echoed back (verbatim) as `RecommendationConfig` to
   * refine the summary. Any mutation invalidates the server-side hash and the request
   * will be rejected.
   */
  Config: string
}

export interface DataSummaryResponse {
  Summary: string
  Recommendations?: DataSummaryRecommendation[]
}

export interface FetchDataSummaryArgs {
  /** OData entity-set name, e.g. 'spnvc_invoices'. */
  entitySet: string
  /** GUID of the record to summarize. Caller must ensure this is URL-safe. */
  id: string
  /** `$select` — comma-separated column list on the root entity (required). */
  select: string
  /** `$expand` — one or more navigation properties with nested `$select`/`$filter`. */
  expand?: string
  /**
   * Maker-defined prompt identifier. Exactly one of `instructionIdentifier` or
   * `recommendationConfig` should be provided — the initial call uses the identifier,
   * refinement calls echo back a `Recommendations[i].Config` token.
   */
  instructionIdentifier?: string
  /** Opaque token from a previous response's `Recommendations[i].Config`. */
  recommendationConfig?: string
}

export interface FetchListSummaryArgs {
  /** OData entity-set name, e.g. 'spnvc_invoices'. */
  entitySet: string
  /** `$select` — comma-separated column list (required). */
  select: string
  /** `$expand` — optional nested selects on navigation properties. */
  expand?: string
  /**
   * `$filter` — maker-scoped row filter. Do NOT pass `$top` or a `Prefer: odata.maxpagesize`
   * header here — pagination belongs to the UI's list fetch; the summary's ceiling is
   * governed by `Summarization/Data/ContentSizeLimit`.
   */
  filter?: string
  /** `$orderby` — typically mirrors the UI's list ordering. */
  orderby?: string
  /** Maker-defined prompt identifier (initial call only). */
  instructionIdentifier?: string
  /** Opaque token echoed back from `Recommendations[i].Config` for refinement. */
  recommendationConfig?: string
}

// -- Error class --------------------------------------------------------------

/**
 * Thrown on any non-2xx response from the Data Summarization API. Captures the HTTP
 * status, the Dataverse/Power Pages error code (when the server returned a JSON error
 * envelope), and a user-facing message dispatched through `DATA_SUMMARY_ERRORS` below.
 *
 * Callers can branch on `code` to show remediation UI — notably `90041001`
 * ("Gen AI features disabled for tenant") and `90041003` ("Summarization/Data/Enable
 * not set for this site").
 */
export class DataSummaryApiError extends Error {
  readonly status: number
  readonly code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'DataSummaryApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Thrown by `fetchSearchSummary` when the Search Summary endpoint is disabled,
 * returns no useful answer, or the network call fails. Search Summary is unique
 * in that it returns HTTP 200 with an embedded error envelope when disabled —
 * the detector is in `fetchSearchSummary` below; this class carries the
 * resulting status + code through to the UI so remediation copy can branch.
 */
export class SearchSummaryApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly disabled: boolean
  constructor(message: string, status: number, code?: string, disabled = false) {
    super(message)
    this.name = 'SearchSummaryApiError'
    this.status = status
    this.code = code
    this.disabled = disabled
  }
}

// Domain-neutral error copy. Do NOT add domain nouns here ("invoice", "case", etc.) —
// this service is shared across record kinds. UI layers may append context.
const DATA_SUMMARY_ERRORS: Record<string, string> = {
  '90041001': 'Generative AI features are not enabled for this tenant. Contact your administrator.',
  '90041003': 'Data summarization is not enabled for this site. Set Summarization/Data/Enable = true.',
  '90041004': 'Too much content to summarize in one pass. Try narrowing the filter or reducing the row set.',
  '90041005': 'There is nothing to summarize yet.',
  '90041006': 'The summarization service hit a transient error. Please try again shortly.',
}

const dataSummaryErrorMessage = (
  code: string | undefined,
  status: number,
  statusText: string,
): string =>
  (code && DATA_SUMMARY_ERRORS[code]) ?? `Data summarization failed: ${status} ${statusText}`

// -- Summary normalization ----------------------------------------------------

/**
 * Guard for tabular-insight prompt shapes that return `Summary` as a JSON-encoded string
 * array (e.g. `"[\"**Insight 1**...\",\"**Insight 2**...\"]"`). Single-record narrative
 * summaries usually arrive as plain strings and pass through untouched; this helper is
 * here so the call site never has to think about it.
 */
export function normalizeSummaryString(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return raw
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return (parsed as string[]).join('\n\n')
    }
  } catch {
    /* fall through */
  }
  return raw
}

// -- Query builder ------------------------------------------------------------

// NOTE: we concatenate OData query params directly rather than going through
// URLSearchParams. URLSearchParams percent-encodes `(`, `)`, `$`, and `,`, which would
// turn `spnvc_ContactId($select=fullname)` into
// `spnvc_ContactId%28%24select%3Dfullname%29` and break the server-side parser. The
// Microsoft-shipped case-page Copilot sample concatenates plain OData syntax, so we
// match that wire format.
function buildQuery(args: FetchDataSummaryArgs): string {
  const parts: string[] = []
  if (args.select) parts.push(`$select=${args.select}`)
  if (args.expand) parts.push(`$expand=${args.expand}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

function buildListQuery(args: FetchListSummaryArgs): string {
  const parts: string[] = []
  if (args.select) parts.push(`$select=${args.select}`)
  if (args.expand) parts.push(`$expand=${args.expand}`)
  if (args.filter) parts.push(`$filter=${args.filter}`)
  if (args.orderby) parts.push(`$orderby=${args.orderby}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

// -- Main entrypoint ----------------------------------------------------------

/**
 * Data summarization against a single record:
 *   POST /_api/summarization/data/v1.0/<entitySet>(<id>)?<query>
 *
 * Returns the parsed `DataSummaryResponse` with `Summary` already passed through
 * `normalizeSummaryString`. Throws `DataSummaryApiError` on any non-2xx.
 *
 * Callers MUST pass values they control (route-provided ids, maker-authored `$select`
 * lists). The id, select, and expand are interpolated into the URL without encoding so
 * the OData parens/dollar signs stay intact — never pass untrusted user input directly.
 */
export async function fetchDataSummary(
  args: FetchDataSummaryArgs,
): Promise<DataSummaryResponse> {
  const { entitySet, id, instructionIdentifier, recommendationConfig } = args
  const url = `/_api/summarization/data/v1.0/${entitySet}(${id})${buildQuery(args)}`

  const body: Record<string, string> = {}
  if (instructionIdentifier) body.InstructionIdentifier = instructionIdentifier
  if (recommendationConfig) body.RecommendationConfig = recommendationConfig

  const token = await getCsrfToken()

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      __RequestVerificationToken: token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let code: string | undefined
    let serverMessage: string | undefined
    try {
      const errBody = await response.json()
      code = errBody?.error?.code
      serverMessage = errBody?.error?.message
    } catch {
      /* non-JSON body, fall back to status text */
    }
    const message =
      serverMessage && !DATA_SUMMARY_ERRORS[code ?? '']
        ? serverMessage
        : dataSummaryErrorMessage(code, response.status, response.statusText)
    throw new DataSummaryApiError(message, response.status, code)
  }

  const payload = (await response.json()) as DataSummaryResponse
  return {
    ...payload,
    Summary: normalizeSummaryString(payload.Summary ?? ''),
  }
}

// -- Search Summary -----------------------------------------------------------

export interface SearchSummaryCitation {
  /** 1-based citation index as rendered in `[[N]](url)` markdown tokens. */
  index: number
  /** Raw URL from the API. May point to `/page-not-found/?id=<guid>` for KB articles on code sites. */
  url: string
  /** Best-effort human-readable label (passed through verbatim from the API when present). */
  title?: string
}

export interface SearchSummaryResponse {
  /** Plain-text summary with inline `[[N]](url)` citation tokens. */
  Summary: string
  /** Ordered list of citations referenced in the summary. */
  Citations: SearchSummaryCitation[]
}

/**
 * Extract the knowledge-article id from a built-in Power Pages
 * `/page-not-found/?id=<guid>` URL. Code sites do not ship the knowledge-article
 * route by default, so the API's citation URLs land on the 404 page unless the
 * caller rewrites them to the SPA's own KB route.
 */
export function extractKnowledgeArticleId(url: string): string | null {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://example')
    if (/page-not-found/i.test(u.pathname)) {
      return u.searchParams.get('id')
    }
  } catch {
    /* ignore malformed URLs */
  }
  return null
}

/**
 * Grounded-retrieval AI summary over the site's search index.
 *   POST /_api/search/v1.0/summary
 *   Body: { userQuery }
 *
 * Two disablement paths to watch for:
 * 1. HTTP 200 with embedded `{ Code: 400, Message: "Gen AI Search is disabled." }`
 *    — means admin governance or the Copilot workspace toggle is off.
 * 2. HTTP 4xx/5xx — same error envelope as other endpoints.
 * Both shapes raise `SearchSummaryApiError`; the UI branches on `.disabled`.
 */
export async function fetchSearchSummary(
  userQuery: string,
): Promise<SearchSummaryResponse> {
  const trimmed = userQuery.trim()
  if (!trimmed) {
    throw new SearchSummaryApiError('Enter a question to search for.', 400)
  }

  const token = await getCsrfToken()
  const response = await fetch('/_api/search/v1.0/summary', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      __RequestVerificationToken: token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ userQuery: trimmed }),
  })

  if (!response.ok) {
    let code: string | undefined
    let serverMessage: string | undefined
    try {
      const errBody = await response.json()
      code = errBody?.error?.code
      serverMessage = errBody?.error?.message
    } catch {
      /* non-JSON body */
    }
    throw new SearchSummaryApiError(
      serverMessage ?? `Search summary failed: ${response.status} ${response.statusText}`,
      response.status,
      code,
    )
  }

  const body = (await response.json()) as
    | SearchSummaryResponse
    | { Code?: number; Message?: string; Summary?: string; Citations?: SearchSummaryCitation[] }

  // The 200-with-embedded-error disablement envelope.
  const embeddedCode = (body as { Code?: number }).Code
  const embeddedMessage = (body as { Message?: string }).Message
  if (embeddedCode && embeddedCode >= 400) {
    const disabled = !!embeddedMessage && /disabled/i.test(embeddedMessage)
    throw new SearchSummaryApiError(
      embeddedMessage ?? 'Search summary is unavailable.',
      embeddedCode,
      String(embeddedCode),
      disabled,
    )
  }

  return {
    Summary: (body as SearchSummaryResponse).Summary ?? '',
    Citations: (body as SearchSummaryResponse).Citations ?? [],
  }
}

/**
 * Data summarization against a collection (list) endpoint:
 *   POST /_api/summarization/data/v1.0/<entitySet>?$select=...&$filter=...
 *
 * Row-level security scopes the collection automatically — callers do not need to
 * hand-scope by owner. `$top` is deliberately not supported: the server-side ceiling
 * is `Summarization/Data/ContentSizeLimit`, not the UI's paginated fetch.
 */
export async function fetchListSummary(
  args: FetchListSummaryArgs,
): Promise<DataSummaryResponse> {
  const { entitySet, instructionIdentifier, recommendationConfig } = args
  const url = `/_api/summarization/data/v1.0/${entitySet}${buildListQuery(args)}`

  const body: Record<string, string> = {}
  if (instructionIdentifier) body.InstructionIdentifier = instructionIdentifier
  if (recommendationConfig) body.RecommendationConfig = recommendationConfig

  const token = await getCsrfToken()

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      __RequestVerificationToken: token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let code: string | undefined
    let serverMessage: string | undefined
    try {
      const errBody = await response.json()
      code = errBody?.error?.code
      serverMessage = errBody?.error?.message
    } catch {
      /* non-JSON body */
    }
    const message =
      serverMessage && !DATA_SUMMARY_ERRORS[code ?? '']
        ? serverMessage
        : dataSummaryErrorMessage(code, response.status, response.statusText)
    throw new DataSummaryApiError(message, response.status, code)
  }

  const payload = (await response.json()) as DataSummaryResponse
  return {
    ...payload,
    Summary: normalizeSummaryString(payload.Summary ?? ''),
  }
}
