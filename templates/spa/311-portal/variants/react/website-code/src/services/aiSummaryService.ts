// src/services/aiSummaryService.ts
// Client for the Power Pages generative-AI summarization endpoints.
//
// Docs: https://learn.microsoft.com/power-pages/configure/data-summarization-api
//
// These endpoints are deliberately NOT routed through powerPagesFetch /
// buildPowerPagesHeaders. That wrapper is the OData client: it defaults
// Content-Type to "application/json", always attaches a
// `Prefer: odata.include-annotations=...` header, and never sets OData-Version /
// OData-MaxVersion / X-Requested-With. The summarization endpoints want a
// different header set, so the request is built explicitly with raw fetch below.
// Only the anti-forgery token cascade is shared, so there is exactly one token cache.

import { fetchAntiForgeryToken } from '../shared/powerPagesApi'

// -- Types --------------------------------------------------------------------

/** A follow-up prompt the service suggests after producing a summary. */
export interface DataSummaryRecommendation {
  /** User-facing chip label, e.g. "Would you like to know about ...?" */
  Text: string
  /**
   * Opaque hashed prompt configuration. Send back verbatim as `RecommendationConfig`
   * to refine the summary — any modification invalidates the hash and the server rejects it.
   */
  Config: string
}

export interface DataSummaryResponse {
  Summary: string
  /** Always an array, but may be empty. */
  Recommendations: DataSummaryRecommendation[]
}

export interface DataSummaryOptions {
  /** `$select` — comma-separated column list. Required in practice; wildcards are not allowed. */
  select?: string
  /** `$expand` — navigation properties with their own nested `$select`. Names are case-sensitive. */
  expand?: string
  /** `$filter` on the root entity. Mainly useful for collection summaries. */
  filter?: string
  /** `$orderby` on the root entity. Mainly useful for collection summaries. */
  orderby?: string
  /**
   * `$top` — row cap. Intentionally not defaulted: the server caps input via the
   * `Summarization/Data/ContentSizeLimit` site setting, which surfaces error 90041004
   * instead of silently truncating the row set.
   */
  top?: number
  /** `$count=true`. */
  count?: boolean
  /**
   * Exactly one of `instructionIdentifier` / `recommendationConfig` per call.
   * Use the identifier on the first call, the config on a refinement call.
   */
  instructionIdentifier?: string
  recommendationConfig?: string
}

// -- Error codes --------------------------------------------------------------

/**
 * Error codes the data summarization endpoint returns in the HTTP 400 body as
 * `{ error: { code, message } }`.
 * https://learn.microsoft.com/power-pages/configure/data-summarization-api
 */
export const DataSummaryErrorCode = {
  /** Generative AI features disabled at tenant or environment level. Admin intervention required. */
  GenerativeAiDisabled: '90041001',
  /** Per-site `Summarization/Data/Enable` site setting is missing or false. */
  SummarizationDisabled: '90041003',
  /** Input exceeded `Summarization/Data/ContentSizeLimit`. */
  ContentTooLarge: '90041004',
  /** Nothing to summarize — the selected columns are all empty. */
  NoRecordsFound: '90041005',
  /** Transient summariser failure; retrying is reasonable. */
  TransientFailure: '90041006',
} as const

export type DataSummaryErrorCodeValue =
  (typeof DataSummaryErrorCode)[keyof typeof DataSummaryErrorCode]

/**
 * Carries the server's error code so callers can branch on it.
 *
 * The `message` is a diagnostic string for logs, never for display: this site is bilingual,
 * so user-facing copy is resolved from `code` through the i18n catalogs at the UI layer.
 */
export class DataSummaryError extends Error {
  readonly code?: string
  readonly status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'DataSummaryError'
    this.code = code
    this.status = status
  }
}

/**
 * True for the two codes that mean an admin or maker must change a setting.
 * Retrying these cannot succeed, so the UI must not offer a retry button.
 */
export const isSummarizationDisabledError = (error: unknown): error is DataSummaryError =>
  error instanceof DataSummaryError &&
  (error.code === DataSummaryErrorCode.SummarizationDisabled ||
    error.code === DataSummaryErrorCode.GenerativeAiDisabled)

/** True when the record exists but has no content worth summarizing — an empty state, not a failure. */
export const isSummarizationEmptyError = (error: unknown): error is DataSummaryError =>
  error instanceof DataSummaryError && error.code === DataSummaryErrorCode.NoRecordsFound

// -- Response normalisation ---------------------------------------------------

/**
 * Prompts that ask the model for "N insights" return `Summary` as a JSON-encoded array of
 * strings rather than a paragraph:
 *
 *   "Summary": "[\"**Insight 1 heading** ...\",\"**Insight 2 heading** ...\"]"
 *
 * Rendering that verbatim shows raw brackets and escaped quotes to the user. Collapse it into
 * paragraph-separated text so the UI only has to handle one shape. Paragraph summaries and any
 * other JSON shape pass through untouched.
 */
export const normalizeSummaryString = (raw: string): string => {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return raw

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed.join('\n\n')
    }
  } catch { /* not JSON — treat as plain text */ }

  return raw
}

// -- Request building ---------------------------------------------------------

/**
 * Build the OData query segments for a summarization URL.
 *
 * Values are concatenated as-is rather than run through URLSearchParams, which would
 * percent-encode `$`, `(`, `)` and `,` and turn `contact_orders($select=name)` into
 * `contact_orders%28%24select%3Dname%29`. The endpoint expects literal OData syntax.
 *
 * Because nothing is encoded here, callers must pass values they control (maker-authored
 * column lists, ids resolved from the API) and never raw user input.
 */
export const buildSummaryQuery = (options: DataSummaryOptions): string => {
  const parts: string[] = []
  if (options.select) parts.push(`$select=${options.select}`)
  if (options.expand) parts.push(`$expand=${options.expand}`)
  if (options.filter) parts.push(`$filter=${options.filter}`)
  if (options.orderby) parts.push(`$orderby=${options.orderby}`)
  if (typeof options.top === 'number') parts.push(`$top=${options.top}`)
  if (options.count) parts.push('$count=true')
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

/**
 * Shared POST path for every summarization request — record form and collection form alike.
 * Route all callers through here so the token, header set, error-code extraction, and
 * `Summary` normalisation stay in one place.
 */
export const postSummary = async (
  url: string,
  options: DataSummaryOptions,
  signal?: AbortSignal
): Promise<DataSummaryResponse> => {
  const body: Record<string, string> = {}
  if (options.instructionIdentifier) body.InstructionIdentifier = options.instructionIdentifier
  if (options.recommendationConfig) body.RecommendationConfig = options.recommendationConfig

  const token = await fetchAntiForgeryToken()

  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      '__RequestVerificationToken': token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    // Failures arrive as { error: { code: "90041005", message: "..." } }, but a portal-level
    // rejection (expired token, WAF) can return HTML instead, so parsing must not throw.
    const payload = await response.json().catch(() => null)
    const code = payload?.error?.code as string | undefined
    const message = (payload?.error?.message as string | undefined)
      ?? `Data summarization failed: ${response.status} ${response.statusText}`
    throw new DataSummaryError(message, response.status, code)
  }

  const payload = (await response.json()) as Partial<DataSummaryResponse> | null

  return {
    Summary: normalizeSummaryString(payload?.Summary ?? ''),
    Recommendations: payload?.Recommendations ?? [],
  }
}

// -- Record summary -----------------------------------------------------------

/**
 * Summarize a single record.
 *
 *   POST /_api/summarization/data/v1.0/<entitySet>(<recordId>)?<odata-query>
 *
 * `recordId` must be the Dataverse GUID, not a slug or public number.
 */
export const fetchDataSummary = (
  entitySetName: string,
  recordId: string,
  options: DataSummaryOptions = {},
  signal?: AbortSignal
): Promise<DataSummaryResponse> =>
  postSummary(
    `/_api/summarization/data/v1.0/${entitySetName}(${recordId})${buildSummaryQuery(options)}`,
    options,
    signal
  )

// -- Collection summary -------------------------------------------------------

/**
 * Summarize a collection rather than a single record.
 *
 *   POST /_api/summarization/data/v1.0/<entitySet>?<odata-query>
 *
 * There is no record id in the path: table and row-level permissions already scope the
 * collection to the rows the signed-in user may read, so no owner lookup is needed to
 * narrow it.
 *
 * Do not carry a list page's `$top` or its `Prefer: odata.maxpagesize` header over to this
 * call. Those bound one page of UI results, while the summary is meant to cover the whole
 * scoped set; the server bounds the input itself through `Summarization/Data/ContentSizeLimit`
 * and reports error 90041004 when the set is too large.
 */
export const fetchListSummary = (
  entitySetName: string,
  options: DataSummaryOptions = {},
  signal?: AbortSignal
): Promise<DataSummaryResponse> =>
  postSummary(
    `/_api/summarization/data/v1.0/${entitySetName}${buildSummaryQuery(options)}`,
    options,
    signal
  )

// -- Knowledge article summary ------------------------------------------------

/** Entity set backing the knowledge base, used for both the record and collection forms. */
export const KNOWLEDGE_ARTICLE_ENTITY_SET = 'knowledgearticles'

/**
 * Columns fed to the knowledge-article summarizer. Deliberately narrower than the read
 * `$select` used by articleService: only content-bearing columns help the model, and every
 * name here must also appear in the `Webapi/knowledgearticle/fields` site setting or the
 * request fails with 403 before the summarizer runs. The record id travels in the URL path,
 * so it is not selected.
 */
export const KNOWLEDGE_ARTICLE_SUMMARY_SELECT = 'title,description,keywords,content'

/**
 * Names the `Summarization/prompt/knowledgearticle_instruction_identifier_detail` site setting.
 * The summarization call fails if that site setting does not exist in the environment.
 */
export const KNOWLEDGE_ARTICLE_SUMMARY_PROMPT =
  'Summarization/prompt/knowledgearticle_instruction_identifier_detail'

/** Summarize one published knowledge article for the article detail page. */
export const fetchArticleSummary = (
  articleId: string,
  recommendationConfig?: string,
  signal?: AbortSignal
): Promise<DataSummaryResponse> =>
  fetchDataSummary(
    KNOWLEDGE_ARTICLE_ENTITY_SET,
    articleId,
    {
      select: KNOWLEDGE_ARTICLE_SUMMARY_SELECT,
      // Exactly one of the two is sent: the maker prompt on the first call, the opaque
      // recommendation hash when the user picks a follow-up chip.
      ...(recommendationConfig
        ? { recommendationConfig }
        : { instructionIdentifier: KNOWLEDGE_ARTICLE_SUMMARY_PROMPT }),
    },
    signal
  )

// -- Knowledge base list summary ----------------------------------------------

/**
 * Columns fed to the knowledge-base overview. `content` is deliberately excluded: the list
 * cards never render it, and full bodies for the whole knowledge base would exceed
 * `Summarization/Data/ContentSizeLimit` and fail with 90041004. As with the detail select,
 * every name here must also be listed in the `Webapi/knowledgearticle/fields` site setting.
 */
export const KNOWLEDGE_ARTICLE_LIST_SUMMARY_SELECT = 'title,description,keywords,publishon'

/**
 * Mirrors the published-article filter and ordering that articleService.getAllArticles uses,
 * so the overview describes the same rows the page lists. `statecode eq 3` is Published for
 * knowledgearticle.
 */
export const KNOWLEDGE_ARTICLE_LIST_SUMMARY_FILTER = 'statecode eq 3'
export const KNOWLEDGE_ARTICLE_LIST_SUMMARY_ORDERBY = 'publishon desc'

/**
 * Names the `Summarization/prompt/knowledgearticle_instruction_identifier_list` site setting.
 * The call fails if that site setting does not exist in the environment.
 */
export const KNOWLEDGE_ARTICLE_LIST_SUMMARY_PROMPT =
  'Summarization/prompt/knowledgearticle_instruction_identifier_list'

/**
 * Summarize the published knowledge base for the article listing page.
 *
 * The argument order matches the `summarize` callback that useAiSummary expects, so this can
 * be passed to the hook directly without an intermediate lambda.
 *
 * The scope is every published article, never the visitor's current search text or tag
 * selection: the listing page filters entirely client-side, so there is no server-side query
 * matching the narrowed view. The card's heading has to say so.
 */
export const fetchKnowledgeBaseSummary = (
  entitySetName: string = KNOWLEDGE_ARTICLE_ENTITY_SET,
  recommendationConfig?: string,
  signal?: AbortSignal
): Promise<DataSummaryResponse> =>
  fetchListSummary(
    entitySetName,
    {
      select: KNOWLEDGE_ARTICLE_LIST_SUMMARY_SELECT,
      filter: KNOWLEDGE_ARTICLE_LIST_SUMMARY_FILTER,
      orderby: KNOWLEDGE_ARTICLE_LIST_SUMMARY_ORDERBY,
      ...(recommendationConfig
        ? { recommendationConfig }
        : { instructionIdentifier: KNOWLEDGE_ARTICLE_LIST_SUMMARY_PROMPT }),
    },
    signal
  )

// -- Search summary -----------------------------------------------------------
//
// Docs: https://learn.microsoft.com/power-pages/configure/search/generative-ai#search-summary-api
//
// This endpoint is NOT part of the summarization/data family above and its wire format is
// deliberately different: it takes a form-encoded body, not JSON, and takes no OData headers.
// Do not fold it into postSummary.

/** One retrieved passage behind a summary. Newer servers only; older ones omit it entirely. */
export interface SearchSummaryChunk {
  Id?: string
  Title?: string
  Url?: string
  Score?: number
}

export interface SearchSummaryResponse {
  /** Prose with inline `[[N]](url)` citation tokens. Parse it with parseSummaryWithCitations. */
  Summary: string
  /** Citation token (`"[1]"`) to source URL. */
  Citations: Record<string, string>
  SummaryTitle?: string
  SearchTitle?: string
  /** Citation token (`"[1]"`) to human-readable source title. */
  CitationTitleMapping?: Record<string, string>
  Chunks?: SearchSummaryChunk[]
  /**
   * Non-empty on a soft failure returned with HTTP 200 and no usable `Summary`. Callers must
   * check it before treating a 200 as a success.
   */
  ErrorMessage?: string
  ResponseStatus?: string
}

/**
 * A search summary request that produced no usable result.
 *
 * Kept separate from DataSummaryError because the two endpoints report failure differently:
 * data summarization returns a real HTTP 400 carrying `{ error: { code: "90041001" } }`, while
 * this endpoint reports "the site toggle is off" as an HTTP 200 whose body is
 * `{ "Code": 400, "Message": "Gen AI Search is disabled." }`. `code` here is that envelope's
 * numeric `Code`, or the HTTP status for a genuine transport failure — the two namespaces must
 * not be conflated in a single error type.
 */
export class SearchSummaryApiError extends Error {
  readonly code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'SearchSummaryApiError'
    this.code = code
  }
}

/**
 * True for the "Site search (preview) is not enabled on this site" envelope, which needs an
 * admin to flip a toggle in Set up workspace > Copilot and cannot be cleared by retrying.
 *
 * The envelope's `Code` is a generic 400 shared with other failures, so the English message is
 * the only discriminator the server offers and this predicate is locale-sensitive by necessity.
 * Treat a false negative as an ordinary failure: every caller must already degrade gracefully
 * for the generic case, so the predicate only ever refines diagnostics, never UI correctness.
 */
export const isGenAiSearchDisabled = (error: unknown): error is SearchSummaryApiError =>
  error instanceof SearchSummaryApiError && /gen ai search is disabled/i.test(error.message)

export const SEARCH_SUMMARY_URL = '/_api/search/v1.0/summary'

/**
 * Ask the site search index for an AI summary answering `userQuery`.
 *
 * Throws SearchSummaryApiError for transport failures and for the disabled envelope. A resolved
 * promise still needs checking: a 200 can carry a blank `Summary` or a non-empty `ErrorMessage`,
 * both of which mean "no usable summary".
 */
export const fetchSearchSummary = async (
  userQuery: string,
  signal?: AbortSignal
): Promise<SearchSummaryResponse> => {
  const token = await fetchAntiForgeryToken()

  const response = await fetch(SEARCH_SUMMARY_URL, {
    method: 'POST',
    signal,
    headers: {
      'Accept': 'application/json',
      // Form encoding is mandatory here and is the single most common cause of a 400 from this
      // endpoint: it rejects the "application/json; charset=utf-8" body that the data
      // summarization calls above require. No OData-Version/OData-MaxVersion either — those
      // belong to the /_api/summarization/data family only.
      'Content-Type': 'application/x-www-form-urlencoded',
      '__RequestVerificationToken': token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ userQuery }).toString(),
  })

  if (!response.ok) {
    throw new SearchSummaryApiError(
      `Search summary failed: ${response.status} ${response.statusText}`,
      response.status
    )
  }

  // A portal-level rejection (expired token, WAF challenge) can answer 200 with HTML, so
  // parsing must not throw.
  const payload = (await response.json().catch(() => null)) as
    | (Partial<SearchSummaryResponse> & { Code?: number; Message?: string })
    | null

  if (!payload) {
    throw new SearchSummaryApiError(
      'Search summary returned a body that is not JSON',
      response.status
    )
  }

  // Disabled-envelope detection. When Site search (preview) is off the endpoint answers HTTP 200
  // with { "Code": 400, "Message": "Gen AI Search is disabled." } and none of the success fields.
  // A naive response.ok check reads that as a success with an empty summary, which hides an
  // actionable configuration problem behind a generic empty state. A success body never carries
  // a top-level Code/Message pair, so requiring both plus a missing Summary cannot misfire.
  if (typeof payload.Code === 'number' && typeof payload.Message === 'string' && !payload.Summary) {
    throw new SearchSummaryApiError(payload.Message, payload.Code)
  }

  // Rebuilt field by field rather than spread so the envelope's Code/Message can never ride
  // along on a value typed as a successful response.
  return {
    Summary: payload.Summary ?? '',
    Citations: payload.Citations ?? {},
    SummaryTitle: payload.SummaryTitle,
    SearchTitle: payload.SearchTitle,
    CitationTitleMapping: payload.CitationTitleMapping,
    Chunks: payload.Chunks,
    ErrorMessage: payload.ErrorMessage,
    ResponseStatus: payload.ResponseStatus,
  }
}

// -- Search summary parsing ---------------------------------------------------

export type SummaryPart =
  | { kind: 'text'; text: string }
  | { kind: 'citation'; token: string; url: string }

/**
 * Split a search summary into literal text and citation references.
 *
 * The server embeds citations in a Markdown-like form that is not actually Markdown:
 *
 *   "Report the outage online.[[1]](https://contoso.powerappsportals.com/page-not-found/?id=2f1c…)"
 *
 * Only this one token shape appears, so it is matched directly rather than run through a
 * Markdown renderer — a general renderer would be far more escaping surface for text the search
 * service does not sanitize for HTML. The URL is captured up to the first ')' because the
 * service emits query strings, never parenthesised URLs. Malformed or unterminated tokens stay
 * in the text run, which renders them literally instead of dropping content.
 */
export const parseSummaryWithCitations = (summary: string): SummaryPart[] => {
  if (!summary) return []

  const pattern = /\[\[(\d+)\]\]\(([^)]+)\)/g
  const parts: SummaryPart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(summary)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', text: summary.slice(lastIndex, match.index) })
    }
    parts.push({ kind: 'citation', token: `[${match[1]}]`, url: match[2].trim() })
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < summary.length) {
    parts.push({ kind: 'text', text: summary.slice(lastIndex) })
  }

  return parts
}

/**
 * Recover the knowledge article id from a citation URL, or null when the URL is an ordinary page.
 *
 * On a code site the search service still points citations at the stock Power Pages knowledge
 * base route, which this site does not serve, so they arrive as
 * `https://<host>/page-not-found/?id=<knowledgearticleid>`. Rendering those verbatim sends every
 * citation to a 404. Callers rewrite a non-null result onto this app's own `/knowledge/:slug`
 * route, which accepts a record id as well as an article public number.
 *
 * The id is validated against a loose GUID shape rather than parsed, because the only thing that
 * matters is that it is safe to interpolate into a route; a non-matching `id` query parameter
 * belongs to some other page and must be left alone.
 */
export const extractKnowledgeArticleId = (url: string): string | null => {
  try {
    const parsed = new URL(url, window.location.origin)
    const id = parsed.searchParams.get('id')
    if (id && /^[0-9a-f-]{36}$/i.test(id)) return id
  } catch {
    // Relative or malformed URLs are not citations we can rewrite.
  }
  return null
}

// -- Service type article search ----------------------------------------------

/**
 * Upper bound on the generated query. Retrieval quality falls off once the query is longer than
 * the passages being matched, and the whole query travels in a form-encoded request body.
 */
export const SEARCH_SUMMARY_QUERY_MAX_LENGTH = 300

/**
 * Build the natural-language query that asks the search index for help with a service type.
 *
 * The service slug is deliberately not used: `streetlight-outage` is a hyphenated identifier,
 * not language, and matches far worse than the display name and description the same record
 * already carries. Returns undefined while the service type is still loading so the caller can
 * hold the request.
 */
export const buildServiceTypeSearchQuery = (
  service?: { name?: string; description?: string } | null
): string | undefined => {
  const name = service?.name?.trim()
  if (!name) return undefined

  const description = service?.description?.trim()
  const query = description ? `${name}: ${description}` : name

  return query.length > SEARCH_SUMMARY_QUERY_MAX_LENGTH
    ? query.slice(0, SEARCH_SUMMARY_QUERY_MAX_LENGTH).trimEnd()
    : query
}
