/** Error raised for any failed Power Pages API call; `message` is safe to show to the user. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const PERMISSION_MESSAGE = "You don't have the appropriate permissions."

let tokenPromise: Promise<string> | null = null

/** Anti-forgery token for POST/PATCH/DELETE (`/_layout/tokenhtml`), cached per page load. */
export function getToken(): Promise<string> {
  tokenPromise ??= fetch('/_layout/tokenhtml', { credentials: 'same-origin' })
    .then(r => r.text())
    .then(html => {
      const match = /value="([^"]+)"/.exec(html)
      if (!match) throw new ApiError('Could not get a security token. Reload the page and try again.', 0)
      return match[1]
    })
    .catch(e => {
      tokenPromise = null
      throw e
    })
  return tokenPromise
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = ''
  let code: string | undefined
  try {
    const body = await res.json()
    message = body?.error?.message ?? body?.message ?? ''
    code = body?.error?.code
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 401 || res.status === 403) return new ApiError(PERMISSION_MESSAGE, res.status, code)
  if (res.status === 404) return new ApiError(message || 'The record could not be found.', res.status, code)
  return new ApiError(message || `The request failed (${res.status}). Try again.`, res.status, code)
}

interface RequestOptions {
  body?: unknown
  headers?: Record<string, string>
  /** Aborts the fetch (e.g. the screen unmounted or its record changed). */
  signal?: AbortSignal
}

export async function request<T = unknown>(method: string, url: string, options: RequestOptions = {}): Promise<{ data: T; headers: Headers }> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  if (method !== 'GET') {
    headers.__RequestVerificationToken = await getToken()
    // Power Pages rejects cloud flow triggers with a 500 unless both CSRF headers are present.
    headers['X-Requested-With'] = 'XMLHttpRequest'
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })
  if (!res.ok) throw await errorFrom(res)
  const text = res.status === 204 ? '' : await res.text()
  return { data: (text ? JSON.parse(text) : undefined) as T, headers: res.headers }
}

const FORMATTED = 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'

/** Power Pages Web API (`/_api/<entityset>`); table permissions and Webapi/<table>/fields apply. */
export const webApi = {
  async list<T = Record<string, unknown>>(path: string): Promise<T[]> {
    const rows: T[] = []
    let next: string | undefined = `/_api/${path}`
    while (next) {
      const { data }: { data: { value?: T[]; '@odata.nextLink'?: string } } = await request('GET', next, { headers: { Prefer: FORMATTED } })
      rows.push(...(data?.value ?? []))
      next = data?.['@odata.nextLink']
    }
    return rows
  },
  async get<T = Record<string, unknown>>(path: string): Promise<T> {
    return (await request<T>('GET', `/_api/${path}`, { headers: { Prefer: FORMATTED } })).data
  },
  /** Creates a record and returns its id (from the `entityid` / `OData-EntityId` response header). */
  async create(entitySet: string, body: Record<string, unknown>): Promise<string> {
    const { headers } = await request('POST', `/_api/${entitySet}`, { body })
    const id = headers.get('entityid') ?? /\(([0-9a-f-]{36})\)/i.exec(headers.get('OData-EntityId') ?? '')?.[1]
    return id ?? ''
  },
  async update(entitySet: string, id: string, body: Record<string, unknown>): Promise<void> {
    await request('PATCH', `/_api/${entitySet}(${id})`, { body })
  },
  async remove(entitySet: string, id: string): Promise<void> {
    await request('DELETE', `/_api/${entitySet}(${id})`)
  },
  async associate(entitySet: string, id: string, navigation: string, targetSet: string, targetId: string): Promise<void> {
    await request('POST', `/_api/${entitySet}(${id})/${navigation}/$ref`, { body: { '@odata.id': `${location.origin}/_api/${targetSet}(${targetId})` } })
  },
  async disassociate(entitySet: string, id: string, navigation: string, targetId: string): Promise<void> {
    await request('DELETE', `/_api/${entitySet}(${id})/${navigation}(${targetId})/$ref`)
  },
  /** Clears a single-valued lookup (DELETE …/<navigation>/$ref). */
  async clearLookup(entitySet: string, id: string, navigation: string): Promise<void> {
    await request('DELETE', `/_api/${entitySet}(${id})/${navigation}/$ref`)
  },
}

/**
 * Power Pages Server Logic GET (`/_api/serverlogics/<name>`). The platform wraps the function's return value as
 * `{ Success, Data: "<returned string>", Error }`; our endpoints return `{ status: 'success' | 'error', … }` in Data.
 */
export async function serverLogic<T extends { status?: string; message?: string }>(
  name: string,
  params: Record<string, string | undefined> = {},
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString()
  const { data } = await request<unknown>('GET', `/_api/serverlogics/${name}${query ? `?${query}` : ''}`, { signal })
  return unwrapServerLogic<T>(data, 'The data could not be loaded. Try again.')
}

/** Server Logic POST: validate-and-execute endpoints; the body is sent as JSON and read via Server.Context.Body. */
export async function serverLogicPost<T extends { status?: string; message?: string }>(
  name: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const { data } = await request<unknown>('POST', `/_api/serverlogics/${name}`, { body, signal })
  return unwrapServerLogic<T>(data, 'The change could not be saved. Try again.')
}

function unwrapServerLogic<T extends { status?: string; message?: string }>(data: unknown, failure: string): T {
  const envelope = (typeof data === 'string' ? JSON.parse(data) : data) as Record<string, unknown> | undefined
  const success = envelope?.Success ?? envelope?.success
  if (success === false) throw new ApiError(failure, 500)
  const inner = envelope && ('Data' in envelope || 'data' in envelope) ? (envelope.Data ?? envelope.data) : envelope
  const payload = (typeof inner === 'string' ? JSON.parse(inner) : inner) as T
  if (payload?.status === 'error') throw new ApiError(payload.message || 'The request failed. Try again.', 500)
  return payload
}

/** Synchronous Power Pages cloud flow (`When Power Pages calls a flow` → `Return value(s) to Power Pages`). */
export async function cloudFlow<T = Record<string, unknown>>(flowId: string, input: Record<string, unknown>): Promise<T> {
  if (!flowId) throw new ApiError('This action is not configured yet. Ask your administrator to register the cloud flow.', 0)
  const { data } = await request<T>('POST', `/_api/cloudflow/v1.0/trigger/${flowId}`, { body: { eventData: JSON.stringify(input) } })
  const result = data as unknown as { ok?: boolean | string; message?: string }
  if (result && (result.ok === false || result.ok === 'false')) throw new ApiError(result.message || PERMISSION_MESSAGE, 400)
  return data
}
