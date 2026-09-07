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

  try {
    const response = await fetch('/_layout/tokenhtml', {})
    if (response.status !== 200) {
      throw new Error(`Failed to fetch token: ${response.status}`)
    }

    const tokenResponse = await response.text()
    const valueString = 'value="'
    const terminalString = '" />'
    const valueIndex = tokenResponse.indexOf(valueString)

    if (valueIndex === -1) {
      throw new Error('Token not found in response')
    }

    const token = tokenResponse.substring(
      valueIndex + valueString.length,
      tokenResponse.indexOf(terminalString, valueIndex),
    )

    cachedAntiForgeryToken = token || ''
    cachedAntiForgeryTimestamp = now
    return cachedAntiForgeryToken
  } catch (error) {
    console.warn('Failed to fetch anti-forgery token:', error)
    return ''
  }
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
 * Power Pages Web API may return the entity in the body (when Prefer: return=representation
 * is honored) or just a success status with the record URL in the Location header.
 */
export const extractRecordId = (response: Response): string | null => {
  const location = response.headers.get('Location') ?? response.headers.get('OData-EntityId')
  if (!location) return null
  const match = location.match(/\(([0-9a-fA-F-]{36})\)/)
  return match ? match[1] : null
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

// -- Core Fetch Wrapper -------------------------------------------------------

export async function powerPagesFetch<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal },
): Promise<T | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const headers = await buildPowerPagesHeaders(options?.headers)

    const response = await fetch(url, { ...options, headers })

    // On 401, the user's session has expired -- do not retry, prompt re-authentication
    if (response.status === 401) {
      throw new Error('Session expired. Please sign in again.')
    }

    // On 403, the anti-forgery token may have expired -- refresh and retry
    if (response.status === 403 && attempt < MAX_RETRIES) {
      cachedAntiForgeryToken = null
      continue
    }

    if (isTransientError(response.status) && attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      await sleep(delay, options?.signal)
      continue
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`
      try {
        const payload = await response.json()
        if (payload?.error?.message) message = payload.error.message
      } catch { /* ignore parse errors */ }
      throw new Error(message)
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

    if (response.status === 403 && attempt < MAX_RETRIES) {
      cachedAntiForgeryToken = null
      continue
    }

    if (isTransientError(response.status) && attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      await sleep(delay, options?.signal)
      continue
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`
      try {
        const payload = await response.json()
        if (payload?.error?.message) message = payload.error.message
      } catch { /* ignore */ }
      throw new Error(message)
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
): string | undefined =>
  record[`${logicalName}@OData.Community.Display.V1.FormattedValue`] as string | undefined

// -- Pagination Helper --------------------------------------------------------

const MAX_PAGINATION_ITERATIONS = 100

export const fetchAllPages = async <T>(initialUrl: string): Promise<T[]> => {
  let nextUrl: string | undefined = initialUrl
  const results: T[] = []
  let iterations = 0

  while (nextUrl) {
    if (++iterations > MAX_PAGINATION_ITERATIONS) {
      console.error('Exceeded maximum pagination iterations')
      break
    }

    const page: ODataCollectionResponse<T> | null = await powerPagesFetch<ODataCollectionResponse<T>>(nextUrl)
    if (!page) break

    results.push(...(page.value ?? []))
    nextUrl = page['@odata.nextLink']
  }

  return results
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
 * Provides the same retry, 403-refresh, and 401 handling as powerPagesFetchResponse,
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

    if (response.status === 403 && attempt < MAX_RETRIES) {
      cachedAntiForgeryToken = null
      continue
    }

    if (isTransientError(response.status) && attempt < MAX_RETRIES) {
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
