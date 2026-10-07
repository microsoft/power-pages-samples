// src/services/powerPagesApi.ts
// Centralized Power Pages Web API client with token management, retry logic, and OData helpers.

// -- Anti-Forgery Token -------------------------------------------------------
// Power Pages Web API requires a __RequestVerificationToken header on every
// mutating request. The token is fetched from /_layout/tokenhtml and cached.
// No Authorization/Bearer header is needed -- authenticated users get cookie-based
// session auth automatically.

const TOKEN_TTL_MS = 8 * 60 * 1000 // 8 min cache

let cachedAntiForgeryToken: string | null = null
let cachedAntiForgeryTimestamp = 0

/**
 * Public re-export of the internal anti-forgery token fetcher.
 * Use this from callers that cannot go through `buildPowerPagesHeaders` — for example,
 * the AI summarization service, which must NOT send the default
 * `Prefer: odata.include-annotations` header and must set its own OData version headers.
 * Prefer `buildPowerPagesHeaders` everywhere else.
 */
export const getCsrfToken = (): Promise<string> => fetchAntiForgeryToken()

const fetchAntiForgeryToken = async (): Promise<string> => {
  const now = Date.now()
  if (cachedAntiForgeryToken && now - cachedAntiForgeryTimestamp < TOKEN_TTL_MS) {
    return cachedAntiForgeryToken
  }

  const response = await fetch('/_layout/tokenhtml', {})
  if (response.status !== 200) {
    throw new Error(`Failed to fetch token: ${response.status}. Please sign in again.`)
  }
  const tokenResponse = await response.text()
  // tokenhtml returns an input such as <input value="token" />.
  // Accept either quote style and normal HTML closing whitespace, but reject
  // missing/empty values instead of sending an unauthenticated-shaped request.
  const token = /<input\b[^>]*\bvalue=(["'])([^"']+)\1/i.exec(tokenResponse)?.[2]
  if (!token) throw new Error('Anti-forgery token not found. Please sign in again.')
  cachedAntiForgeryToken = token
  cachedAntiForgeryTimestamp = now
  return token
}

// -- Header Builder -----------------------------------------------------------

export const buildPowerPagesHeaders = async (
  incoming?: HeadersInit,
  options?: { accept?: string | null; contentType?: string | null; prefer?: string | null },
): Promise<Headers> => {
  const antiForgeryToken = await fetchAntiForgeryToken()
  const headers = new Headers({
    __RequestVerificationToken: antiForgeryToken,
  })

  if (options?.accept !== null) {
    headers.set('Accept', options?.accept ?? 'application/json')
  }
  if (options?.contentType !== null) {
    headers.set('Content-Type', options?.contentType ?? 'application/json')
  }
  if (options?.prefer !== null) {
    headers.set(
      'Prefer',
      options?.prefer ?? 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    )
  }

  if (incoming) {
    const extra = new Headers(incoming)
    extra.forEach((value, key) => headers.set(key, value))
  }

  return headers
}

// -- Response Parsing ---------------------------------------------------------

export const parseResponseBody = async <T>(response: Response): Promise<T | null> => {
  if (response.status === 204 || response.status === 202) return null

  const text = await response.text()
  if (!text || text.trim() === '') return null

  try {
    return JSON.parse(text) as T
  } catch {
    console.warn('Failed to parse response body as JSON')
    return null
  }
}

// -- Create Response Helper ---------------------------------------------------

/**
 * Extract the created record ID from a POST response.
 * Power Pages can return 204 with entityid: <GUID>, while OData clients can
 * return Location/OData-EntityId: .../entityset(<GUID>). Neither needs a body.
 * https://learn.microsoft.com/power-pages/configure/write-update-delete-operations#create
 */
export const extractRecordId = (response: Response): string | null => {
  const guid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  const entityId = response.headers.get('entityid')
  if (entityId && new RegExp(`^${guid}$`, 'i').test(entityId)) return entityId
  for (const header of ['Location', 'OData-EntityId']) {
    const location = response.headers.get(header)
    const id = location && new RegExp(`\\((${guid})\\)(?:\\?.*)?$`, 'i').exec(location)?.[1]
    if (id) return id
  }
  return null
}

// -- Retry Helpers ------------------------------------------------------------

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

const isTransientError = (status: number): boolean =>
  status === 429 || (status >= 500 && status < 600)

// A failed write response may arrive after persistence. Only safe reads can be
// replayed automatically; an explicit anti-forgery rejection is handled below.
const canRetryTransientResponse = (method: string | undefined): boolean =>
  ['GET', 'HEAD'].includes((method ?? 'GET').toUpperCase())

export class PowerPagesApiError extends Error {
  constructor(
    message: string, readonly status: number, readonly code?: string,
    readonly details?: { cdsCode?: string; innerCode?: string; innerMessage?: string },
  ) {
    super(message)
    this.name = 'PowerPagesApiError'
  }
}

const responseError = async (response: Response): Promise<PowerPagesApiError> => {
  const text = await response.text()
  let payload: unknown
  try {
    payload = text ? JSON.parse(text) : undefined
  } catch {
    // IIS can return HTML rather than the Web API's JSON error envelope.
  }
  const object = isJsonObject(payload) ? payload : undefined
  const rawError = object?.error ?? object?.Error
  const error = isJsonObject(rawError) ? rawError : undefined
  const inner = isJsonObject(error?.innererror) ? error.innererror : undefined
  // Server Logic failures can use a string Error/error instead of the Web API's
  // { error: { message, code } } envelope. Keep that reason rather than losing it.
  // https://learn.microsoft.com/power-pages/configure/author-server-logic#example-response
  const message = typeof rawError === 'string' ? rawError
    : stringProperty(error, 'message') ?? stringProperty(error, 'Message') ??
      stringProperty(object, 'message') ?? stringProperty(object, 'Message') ??
      `Request failed with status ${response.status}`
  return new PowerPagesApiError(message, response.status, stringProperty(error, 'code'), {
    cdsCode: stringProperty(error, 'cdscode'),
    innerCode: stringProperty(inner, 'code'),
    innerMessage: stringProperty(inner, 'message'),
  })
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stringProperty(object: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = object?.[key]
  return typeof value === 'string' ? value : undefined
}

// -- Core Fetch Wrapper -------------------------------------------------------

export async function powerPagesFetch<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal; retryAntiForgery?: boolean },
): Promise<T | null> {
  const { retryAntiForgery = true, ...requestOptions } = options ?? {}
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const headers = await buildPowerPagesHeaders(requestOptions.headers)

    const response = await fetch(url, { ...requestOptions, headers })

    // On 401, the user's session has expired -- do not retry, prompt re-authentication
    if (response.status === 401) {
      throw new Error('Session expired. Please sign in again.')
    }

    if (response.status === 403) {
      const error = await responseError(response)
      // Other 403 codes are table/column denials, not token-expiration signals.
      // https://learn.microsoft.com/power-pages/configure/web-api-http-requests-handle-errors#error-codes
      if (retryAntiForgery && error.code?.toLowerCase() === WebApiErrorCode.AntiForgeryTokenInvalid && attempt < MAX_RETRIES) {
        cachedAntiForgeryToken = null
        continue
      }
      throw error
    }

    if (canRetryTransientResponse(options?.method) && isTransientError(response.status) && attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      await sleep(delay, options?.signal)
      continue
    }

    if (!response.ok) {
      throw await responseError(response)
    }

    return parseResponseBody<T>(response)
  }

  throw new Error('Max retries exceeded')
}

/**
 * Like powerPagesFetch but returns the raw Response object.
 * Useful when you need headers (e.g. OData-EntityId from POST).
 */
export async function powerPagesFetchResponse(
  url: string,
  options?: RequestInit & { signal?: AbortSignal },
): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const headers = await buildPowerPagesHeaders(options?.headers)

    const response = await fetch(url, { ...options, headers })

    if (response.status === 401) {
      throw new Error('Session expired. Please sign in again.')
    }

    if (response.status === 403) {
      const error = await responseError(response)
      if (error.code?.toLowerCase() === WebApiErrorCode.AntiForgeryTokenInvalid && attempt < MAX_RETRIES) {
        cachedAntiForgeryToken = null
        continue
      }
      throw error
    }

    if (canRetryTransientResponse(options?.method) && isTransientError(response.status) && attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      await sleep(delay, options?.signal)
      continue
    }

    if (!response.ok) {
      throw await responseError(response)
    }

    return response
  }

  throw new Error('Max retries exceeded')
}

// -- Web API Error Codes ------------------------------------------------------

export const WebApiErrorCode = {
  ReadPermissionDenied: '90040120',
  WritePermissionDenied: '90040102',
  CreatePermissionDenied: '90040103',
  DeletePermissionDenied: '90040104',
  AppendPermissionDenied: '90040105',
  AppendToPermissionDenied: '90040106',
  AntiForgeryTokenInvalid: '90040107',
  ResourceNotFound: '9004010c',
  CdsError: '9004010d',
} as const

/**
 * Parse the error code from a Web API error response.
 * Returns the hex code string (e.g., '90040120') or undefined.
 */
export const parseErrorCode = (error: unknown): string | undefined => {
  if (error instanceof PowerPagesApiError && error.code) return error.code.toLowerCase()
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as Error).message
    const match = msg.match(/[0-9a-f]{8}/i)
    return match?.[0]?.toLowerCase()
  }
  return undefined
}

/**
 * Check if an error is a permission denied error (any CRUD operation).
 */
export const isPermissionError = (error: unknown): boolean => {
  const code = parseErrorCode(error)
  return code !== undefined && [
    WebApiErrorCode.ReadPermissionDenied,
    WebApiErrorCode.WritePermissionDenied,
    WebApiErrorCode.CreatePermissionDenied,
    WebApiErrorCode.DeletePermissionDenied,
    WebApiErrorCode.AppendPermissionDenied,
    WebApiErrorCode.AppendToPermissionDenied,
  ].includes(code as never)
}

// -- OData URL Builder --------------------------------------------------------

export const buildODataUrl = (
  entitySet: string,
  query?: Record<string, string | undefined>,
): string => {
  if (!query) return `/_api/${entitySet}`

  const parts: string[] = []
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      const encoded = encodeURIComponent(value).replace(/%2C/g, ',')
      parts.push(`${key}=${encoded}`)
    }
  }

  return parts.length > 0 ? `/_api/${entitySet}?${parts.join('&')}` : `/_api/${entitySet}`
}

export const escapeODataString = (value: string): string =>
  value.replace(/'/g, "''")

export type ODataFilter =
  | { attribute: string; operator: 'eq' | 'ne'; value: string | number | boolean | null | Date }
  | { attribute: string; operator: 'contains'; value: string }
  | { type: 'and' | 'or'; filters: ODataFilter[] }

export const eq = (attribute: string, value: string | number | boolean | null | Date): ODataFilter =>
  ({ attribute, operator: 'eq', value })
export const and = (...filters: (ODataFilter | undefined)[]): ODataFilter =>
  ({ type: 'and', filters: filters.filter((filter): filter is ODataFilter => filter !== undefined) })
export const or = (...filters: ODataFilter[]): ODataFilter => ({ type: 'or', filters })
export const contains = (attribute: string, value: string): ODataFilter =>
  ({ attribute, operator: 'contains', value })

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isGuid = (value: unknown): value is string => typeof value === 'string' && GUID.test(value)
const propertyName = (value: string): string => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*(?:\/[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(value)) {
    throw new Error(`Invalid OData property: ${value}`)
  }
  return value
}

export function serializeODataFilter(filter?: ODataFilter): string | undefined {
  if (!filter) return undefined
  if ('type' in filter) {
    const parts = filter.filters.map(serializeODataFilter).filter((part): part is string => !!part)
    return parts.length ? `(${parts.join(` ${filter.type} `)})` : undefined
  }
  const attribute = propertyName(filter.attribute)
  if (filter.operator === 'contains') {
    return `contains(${attribute},'${escapeODataString(filter.value)}')`
  }
  const value = filter.value
  let literal: string
  if (value === null) literal = 'null'
  else if (value instanceof Date) literal = value.toISOString()
  else if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('OData numeric filter must be finite')
    literal = String(value)
  } else if (typeof value === 'boolean') literal = String(value)
  else if (/^_[a-z0-9_]+_value$/.test(attribute)) {
    if (!GUID.test(value)) throw new Error('Lookup filter ID must be a GUID')
    literal = value
  } else literal = `'${escapeODataString(value)}'`
  return `${attribute} ${filter.operator} ${literal}`
}

export interface ODataQuery {
  select: string
  filter?: ODataFilter
  orderBy?: string
  count?: boolean
  top?: number
}

export function buildCollectionUrl(entitySet: string, query: ODataQuery): string {
  const select = [...new Set(query.select.split(',').map(propertyName))].join(',')
  const order = query.orderBy?.split(',').map(part => {
    const match = /^([a-zA-Z_][a-zA-Z0-9_/]*)(?: (asc|desc))?$/.exec(part.trim())
    if (!match) throw new Error(`Invalid OData sort: ${part}`)
    return `${propertyName(match[1])}${match[2] ? ` ${match[2]}` : ''}`
  }).join(',')
  if (query.top !== undefined) validatePageSize(query.top)
  return buildODataUrl(propertyName(entitySet), {
    '$select': select,
    '$filter': serializeODataFilter(query.filter),
    '$orderby': order,
    '$count': query.count ? 'true' : undefined,
    '$top': query.top?.toString(),
  })
}

function validatePageSize(pageSize: number): void {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 5000) {
    throw new Error('OData page size must be between 1 and 5000')
  }
}

// -- OData Types --------------------------------------------------------------

export interface ODataCollectionResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
  '@odata.count'?: number
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  nextLink?: string
}

// -- Formatted Value Helper ---------------------------------------------------

/**
 * Extract a formatted value from an OData entity.
 * Formatted values are returned when the Prefer header includes
 * odata.include-annotations="OData.Community.Display.V1.FormattedValue".
 * Useful for option set labels and lookup display names.
 */
export const getFormattedValue = (
  record: Record<string, unknown>,
  logicalName: string,
): string | undefined => {
  const value = record[`${logicalName}@OData.Community.Display.V1.FormattedValue`]
  return typeof value === 'string' ? value : undefined
}

export const getLookupId = (record: Record<string, unknown>, name: string): string | undefined => {
  const value = record[`_${name}_value`]
  return typeof value === 'string' ? value : undefined
}

export const getLookupName = (record: Record<string, unknown>, name: string): string | undefined =>
  getFormattedValue(record, `_${name}_value`)

// -- Pagination Helper --------------------------------------------------------

const MAX_PAGINATION_ITERATIONS = 100

// Dataverse cursors may be relative or absolute. Never send the portal's CSRF
// token to a different origin or follow a cursor into another table/operation.
// https://learn.microsoft.com/power-apps/developer/data-platform/webapi/query/page-results
export function validateCollectionUrl(url: string, entitySet?: string): string {
  const origin = typeof window !== 'undefined' ? window.location?.origin : undefined
  const base = origin ?? 'https://portal.example'
  const parsed = new URL(url, base)
  if (parsed.origin !== base || parsed.username || parsed.password || parsed.hash ||
      (!origin && !url.startsWith('/_api/')) ||
      !/^\/_api\/[a-zA-Z][a-zA-Z0-9_]*$/.test(parsed.pathname) ||
      (entitySet && parsed.pathname !== `/_api/${entitySet}`) ||
      parsed.searchParams.has('fetchXml')) {
    throw new Error('Invalid or cross-origin OData collection URL')
  }
  return `${parsed.pathname}${parsed.search}`
}

export async function fetchODataCollection<T>(
  url: string, pageSize = 50, entitySet?: string,
): Promise<ODataCollectionResponse<T>> {
  validatePageSize(pageSize)
  const safeUrl = validateCollectionUrl(url, entitySet)
  const response = await powerPagesFetch<ODataCollectionResponse<T>>(safeUrl, {
    headers: {
      // $top caps the whole result set; maxpagesize preserves continuation pages.
      Prefer: `odata.include-annotations="OData.Community.Display.V1.FormattedValue",odata.maxpagesize=${pageSize}`,
    },
  })
  if (!response || !Array.isArray(response.value)) throw new Error('Missing OData collection response')
  if (response['@odata.nextLink']) {
    response['@odata.nextLink'] = validateCollectionUrl(
      response['@odata.nextLink'], safeUrl.split('?')[0].slice('/_api/'.length),
    )
  }
  return response
}

export async function fetchODataRecord<T>(
  entitySet: string, id: string, select: string,
): Promise<T | null> {
  if (!GUID.test(id)) throw new Error('Record ID must be a GUID')
  const url = buildODataUrl(`${propertyName(entitySet)}(${id})`, {
    '$select': select.split(',').map(propertyName).join(','),
  })
  try {
    const record = await powerPagesFetch<T>(url)
    if (!record || typeof record !== 'object' || Array.isArray(record) || 'value' in record) {
      throw new Error('Missing OData record response')
    }
    return record
  } catch (error) {
    if (error instanceof PowerPagesApiError && error.status === 404) return null
    throw error
  }
}

export function collectionCount(response: ODataCollectionResponse<unknown>): number {
  const count = response['@odata.count']
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new Error('Missing or invalid OData count')
  }
  return count
}

export const fetchAllPages = async <T>(initialUrl: string, pageSize = 50): Promise<T[]> => {
  let nextUrl: string | undefined = initialUrl
  const results: T[] = []
  let iterations = 0

  while (nextUrl) {
    if (++iterations > MAX_PAGINATION_ITERATIONS) {
      throw new Error('OData pagination exceeded 100 pages')
    }

    const page: ODataCollectionResponse<T> = await fetchODataCollection<T>(nextUrl, pageSize)

    results.push(...page.value)
    nextUrl = page['@odata.nextLink']
  }

  return results
}

export async function collectPaginatedItems<T>(
  load: (nextLink?: string) => Promise<PaginatedResult<T>>,
): Promise<T[]> {
  const items: T[] = []
  let nextLink: string | undefined
  for (let page = 0; page < MAX_PAGINATION_ITERATIONS; page++) {
    const result = await load(nextLink)
    items.push(...result.items)
    nextLink = result.nextLink
    if (!nextLink) return items
  }
  throw new Error('OData pagination exceeded 100 pages')
}

// -- Lookup Binding Helper ----------------------------------------------------

/**
 * Set or clear a lookup relationship on a request body using @odata.bind.
 *
 * @param body - The request body object to modify
 * @param navigationProperty - The navigation property name (e.g., 'spnvc_ContactId')
 * @param entitySetName - The target entity set (e.g., 'contacts')
 * @param id - The target record ID. Pass null to unbind, undefined to skip.
 */
export const bindLookup = (
  body: Record<string, unknown>,
  navigationProperty: string,
  entitySetName: string,
  id?: string | null,
): void => {
  if (id === null) {
    body[`${navigationProperty}@odata.bind`] = null
  } else if (id) {
    body[`${navigationProperty}@odata.bind`] = `/${entitySetName}(${id})`
  }
}

// -- File Column Helpers ------------------------------------------------------
// File/image columns use different URL patterns and headers than standard OData
// queries.  Each operation targets the column endpoint directly — no $select,
// $filter, or other OData query options.
//
//   Download: GET    /_api/table(id)/column/$value  (binary blob)
//   Upload:   PATCH  /_api/table(id)/column         (ArrayBuffer, no /$value)
//   Delete:   DELETE /_api/table(id)/column         (removes file, keeps record)
//
// IMPORTANT: All three operations MUST send Content-Type: application/octet-stream.
// The Power Pages OData pipeline uses this header to route requests to the binary
// file handler.  Without it, the server falls into the OData JSON deserializer
// and returns 400 (upload) or 404 (download/delete).

/**
 * Internal retry wrapper for file/image column operations.
 * Provides the same safe-read retry, token-refresh, and 401 handling as powerPagesFetchResponse,
 * but accepts pre-built Headers (needed for the custom Content-Type / Accept / Prefer
 * that file operations require).
 */
const fileColumnFetchResponse = async (
  url: string,
  init: RequestInit & { headers: Headers },
): Promise<Response> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Refresh the anti-forgery token on every attempt (it may have been
    // cleared on a previous 403).
    init.headers.set('__RequestVerificationToken', await fetchAntiForgeryToken())

    const response = await fetch(url, init)

    if (response.status === 401) {
      throw new Error('Session expired. Please sign in again.')
    }

    if (response.status === 403) {
      const error = await responseError(response.clone())
      if (error.code?.toLowerCase() === WebApiErrorCode.AntiForgeryTokenInvalid && attempt < MAX_RETRIES) {
        cachedAntiForgeryToken = null
        continue
      }
    }

    if (canRetryTransientResponse(init.method) && isTransientError(response.status) && attempt < MAX_RETRIES) {
      await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1))
      continue
    }

    return response
  }

  throw new Error('Max retries exceeded')
}

/**
 * Download a file or image column value as an object URL.
 * Returns null if no file is stored (404).
 * Content-Type: application/octet-stream is required on the GET request — the
 * Power Pages OData pipeline uses it to route to the binary file handler.
 */
export const fetchFileColumnUrl = async (
  table: string,
  recordId: string,
  column: string,
  mimeType?: string,
): Promise<string | null> => {
  const headers = await buildPowerPagesHeaders(undefined, {
    accept: '*/*',
    contentType: 'application/octet-stream',
    prefer: null,
  })

  const response = await fileColumnFetchResponse(
    `/_api/${table}(${recordId})/${column}/$value`,
    { headers },
  )

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`File download failed: ${response.status}`)

  const blob = await response.blob()
  // Power Pages returns application/octet-stream regardless of the actual file type.
  // Re-type the blob so the browser can render it (e.g. PDF in iframe, image inline).
  const typedBlob = mimeType && blob.type !== mimeType
    ? new Blob([blob], { type: mimeType })
    : blob
  return URL.createObjectURL(typedBlob)
}

/**
 * Upload a file or image to a file column.
 * Content-Type MUST be application/octet-stream — the Power Pages OData pipeline
 * uses it to route to the binary deserializer.  Sending the file's actual MIME type
 * (e.g. image/png) causes the server to fall into the OData JSON parser, which
 * fails with "Stream was not readable" (CDS error 0x80048d19).
 * Upload URL has no /$value suffix, unlike download.
 */
export const uploadFileColumn = async (
  table: string,
  recordId: string,
  column: string,
  file: Blob,
  fileName?: string,
): Promise<void> => {
  const headers = await buildPowerPagesHeaders(
    {
      'If-Match': '*',
      ...(fileName ? { 'x-ms-file-name': fileName } : {}),
    },
    {
      accept: 'application/json',
      contentType: 'application/octet-stream',
      prefer: null,
    },
  )

  const response = await fileColumnFetchResponse(
    `/_api/${table}(${recordId})/${column}`,
    { method: 'PATCH', headers, body: await file.arrayBuffer() },
  )

  if (!response.ok) {
    let detail = ''
    try { detail = await response.text() } catch { /* ignore */ }
    console.error(
      `[uploadFileColumn] PATCH /_api/${table}(${recordId})/${column} →`,
      response.status, response.statusText, detail,
    )
    throw new Error(`File upload failed: ${response.status} ${response.statusText}`)
  }
}

/**
 * Delete a file or image from a file column without deleting the record.
 * Content-Type: application/octet-stream is required — same OData routing
 * requirement as upload and download.
 */
export const deleteFileColumn = async (
  table: string,
  recordId: string,
  column: string,
): Promise<void> => {
  const headers = await buildPowerPagesHeaders(
    { 'If-Match': '*' },
    { contentType: 'application/octet-stream', prefer: null },
  )

  const response = await fileColumnFetchResponse(
    `/_api/${table}(${recordId})/${column}`,
    { method: 'DELETE', headers },
  )

  if (!response.ok) throw new Error(`File delete failed: ${response.status}`)
}
