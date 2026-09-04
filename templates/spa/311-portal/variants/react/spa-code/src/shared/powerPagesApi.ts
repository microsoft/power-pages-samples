// src/shared/powerPagesApi.ts
// Centralized Power Pages Web API client with token management, retry logic, and OData helpers.

// -- Anti-Forgery Token -------------------------------------------------------
// Power Pages Web API requires a __RequestVerificationToken header on mutating
// requests (POST, PATCH, DELETE). The token is read from the page DOM first
// (where Power Pages embeds it), then falls back to /_layout/tokenhtml.
// No Authorization/Bearer header is needed -- cookie-based session auth is automatic.

const TOKEN_TTL_MS = 8 * 60 * 1000 // 8 min cache

let cachedAntiForgeryToken: string | null = null
let cachedAntiForgeryTimestamp = 0

/** Try to get the token from Power Pages shell API (available in portal-rendered pages). */
const getTokenFromShell = async (): Promise<string | null> => {
  try {
    const w = window as unknown as Record<string, unknown>
    const shell = w.shell as { getTokenDeferred?: () => { then: (cb: (token: string) => void) => unknown } } | undefined
    if (shell?.getTokenDeferred) {
      return await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Token timeout')), 5000)
        shell.getTokenDeferred!().then((token: string) => {
          clearTimeout(timeout)
          resolve(token)
        })
      })
    }
  } catch { /* shell not available */ }
  return null
}

/** Try to read the token from a hidden input the portal framework renders into the page. */
const getTokenFromDom = (): string | null => {
  try {
    const inputs = document.getElementsByName('__RequestVerificationToken')
    for (let i = 0; i < inputs.length; i++) {
      const value = (inputs[i] as HTMLInputElement).value
      if (value) return value
    }
  } catch { /* SSR / non-browser */ }
  return null
}

/** Try to fetch the token from the dedicated Power Pages token endpoint. */
const getTokenFromEndpoint = async (): Promise<string | null> => {
  try {
    const response = await fetch('/_layout/tokenhtml', {})
    if (response.status !== 200) return null

    const html = await response.text()
    const valueString = 'value="'
    const terminalString = '" />'
    const valueIndex = html.indexOf(valueString)
    if (valueIndex === -1) return null

    const token = html.substring(
      valueIndex + valueString.length,
      html.indexOf(terminalString, valueIndex)
    )
    return token || null
  } catch {
    return null
  }
}

const fetchAntiForgeryToken = async (): Promise<string> => {
  const now = Date.now()
  if (cachedAntiForgeryToken && now - cachedAntiForgeryTimestamp < TOKEN_TTL_MS) {
    return cachedAntiForgeryToken
  }

  // 1. Power Pages shell API (most reliable for portal-rendered pages)
  const shellToken = await getTokenFromShell()
  if (shellToken) {
    cachedAntiForgeryToken = shellToken
    cachedAntiForgeryTimestamp = now
    return shellToken
  }

  // 2. DOM hidden input
  const domToken = getTokenFromDom()
  if (domToken) {
    cachedAntiForgeryToken = domToken
    cachedAntiForgeryTimestamp = now
    return domToken
  }

  // 3. Endpoint fallback
  const endpointToken = await getTokenFromEndpoint()
  if (endpointToken) {
    cachedAntiForgeryToken = endpointToken
    cachedAntiForgeryTimestamp = now
    return endpointToken
  }

  console.warn('Could not obtain anti-forgery token from shell, DOM, or /_layout/tokenhtml')
  return ''
}

// -- Header Builder -----------------------------------------------------------

export const buildPowerPagesHeaders = async (
  incoming?: HeadersInit,
  options?: {
    accept?: string | null
    contentType?: string | null
    prefer?: string | null
    method?: string
  }
): Promise<Headers> => {
  const headers = new Headers()
  const method = (options?.method ?? 'GET').toUpperCase()
  const isMutation = method !== 'GET' && method !== 'HEAD'

  // Only send anti-forgery token on mutating requests
  if (isMutation) {
    const antiForgeryToken = await fetchAntiForgeryToken()
    if (antiForgeryToken) {
      headers.set('__RequestVerificationToken', antiForgeryToken)
    }
  }

  if (options?.accept !== null) {
    headers.set('Accept', options?.accept ?? 'application/json')
  }
  // Only send Content-Type when there's a body (mutations)
  if (isMutation && options?.contentType !== null) {
    headers.set('Content-Type', options?.contentType ?? 'application/json')
  }
  if (options?.prefer !== null) {
    headers.set(
      'Prefer',
      options?.prefer ?? 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
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
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const method = (options?.method as string) ?? 'GET'
    const headers = await buildPowerPagesHeaders(options?.headers, { method })

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
  options?: RequestInit & { signal?: AbortSignal }
): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const method = (options?.method as string) ?? 'GET'
    const headers = await buildPowerPagesHeaders(options?.headers, { method })

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
      } catch { /* ignore */ }
      throw new Error(message)
    }

    return response
  }

  throw new Error('Max retries exceeded')
}

// -- Web API Error Codes ------------------------------------------------------
// These hex codes are returned by the Power Pages Web API on errors.
// Use them to provide specific error messages in the UI.

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
    // The error code appears in the JSON: { error: { code: "90040120", message: "..." } }
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
  if (!code) return false
  const permissionCodes: string[] = [
    WebApiErrorCode.ReadPermissionDenied,
    WebApiErrorCode.WritePermissionDenied,
    WebApiErrorCode.CreatePermissionDenied,
    WebApiErrorCode.DeletePermissionDenied,
    WebApiErrorCode.AppendPermissionDenied,
    WebApiErrorCode.AppendToPermissionDenied,
  ]
  return permissionCodes.includes(code)
}

// -- OData URL Builder --------------------------------------------------------

export const buildODataUrl = (
  entitySet: string,
  query?: Record<string, string | undefined>
): string => {
  if (!query) return `/_api/${entitySet}`

  const parts: string[] = []
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      const encoded = encodeURIComponent(value)
        .replace(/%2C/g, ',')
        .replace(/%28/g, '(')
        .replace(/%29/g, ')')
        .replace(/%24/g, '$')
        .replace(/%3D/g, '=')
        .replace(/%27/g, "'")
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
  logicalName: string
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

    const response: ODataCollectionResponse<T> | null = await powerPagesFetch<ODataCollectionResponse<T>>(nextUrl)
    if (!response) break

    results.push(...(response.value ?? []))
    nextUrl = response['@odata.nextLink']
  }

  return results
}

// -- Lookup Binding Helper ----------------------------------------------------

/**
 * Set or clear a lookup relationship on a request body using @odata.bind.
 *
 * @param body - The request body object to modify
 * @param navigationProperty - The navigation property name (e.g., 'cr4fc_Category')
 * @param entitySetName - The target entity set (e.g., 'cr4fc_categories')
 * @param id - The target record ID. Pass null to unbind, undefined to skip.
 */
export const bindLookup = (
  body: Record<string, unknown>,
  navigationProperty: string,
  entitySetName: string,
  id?: string | null
): void => {
  if (id === null) {
    body[`${navigationProperty}@odata.bind`] = null
  } else if (id) {
    body[`${navigationProperty}@odata.bind`] = `/${entitySetName}(${id})`
  }
}

// -- File Column Helpers ------------------------------------------------------

/**
 * Download a file or image column value as an object URL.
 * Returns null if no file is stored (404).
 */
export const fetchFileColumnUrl = async (
  table: string,
  recordId: string,
  column: string
): Promise<string | null> => {
  const headers = await buildPowerPagesHeaders(undefined, {
    accept: '*/*',
    contentType: null,
    prefer: null,
    method: 'GET',
  })

  const response = await fetch(`/_api/${table}(${recordId})/${column}/$value`, { headers })

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`File download failed: ${response.status}`)

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * Upload a file or image to a file column.
 * Note: Upload uses the column URL directly (no /$value), unlike download.
 */
export const uploadFileColumn = async (
  table: string,
  recordId: string,
  column: string,
  file: Blob,
  fileName?: string
): Promise<void> => {
  const headers = await buildPowerPagesHeaders(
    {
      'If-Match': '*',
      ...(fileName ? { 'x-ms-file-name': fileName } : {}),
    },
    {
      accept: 'application/json',
      contentType: file.type || 'application/octet-stream',
      prefer: null,
      method: 'PATCH',
    }
  )

  const response = await fetch(`/_api/${table}(${recordId})/${column}`, {
    method: 'PATCH',
    headers,
    body: await file.arrayBuffer(),
  })

  if (!response.ok) throw new Error(`File upload failed: ${response.status}`)
}
