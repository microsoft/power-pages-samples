// ---------------------------------------------------------------------------
// sharePointService.ts — THE LESSON OF THIS SAMPLE
//
// Upload, list, download, and delete files in a **SharePoint document library**
// from a Power Pages code site (SPA) — through **server logic**.
//
// THE KEY POINT: Power Pages has no portal Web API (`/_api`) surface for
// SharePoint document libraries, and code sites can't host the native
// Liquid/form subgrid. So the SPA calls **server logic** — server-side
// JavaScript that holds an Entra app (client-credentials) and calls Microsoft
// Graph to do the SharePoint work. The browser never sees the secret and never
// talks to Graph directly. The server-side half is
// `server-logic/sharepointDocuments.js`.
//
//   The SPA → server logic call:
//   <METHOD> /_api/serverlogics/<name>   (header __RequestVerificationToken = CSRF)
//     GET  (no id)   -> list      | GET (?id=) -> download
//     POST {fileName,fileContent} -> upload    | DELETE (?id=) -> delete
//   Response envelope: { Success, Data, Error } — the payload is in `Data`.
//
// ⚠️ Server logic's HttpClient only accepts text content types (no octet-stream),
// so this sample handles **text-based documents** (see config.ts / README). Files
// are sent as text, not base64.
//
// See README.md and
// https://learn.microsoft.com/power-pages/configure/server-logic-graph-sharepoint
// ---------------------------------------------------------------------------

import { SERVER_LOGIC_NAME, config } from './config'

export interface UploadedFile {
  id: string
  filename: string
  filesize: number
  createdon: string
}

export const MAX_FILE_BYTES = config.maxFileBytes
export const ALLOWED_TYPES = config.allowedTypes

const BASE = `/_api/serverlogics/${SERVER_LOGIC_NAME}`

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

// In-memory mock so the whole UI is testable offline (holds text content).
let mockFiles: (UploadedFile & { content: string; mimetype: string })[] = []
let mockId = 1

/** Fetch the anti-forgery (CSRF) token required on every server-logic call. */
async function getCsrfToken(): Promise<string> {
  const response = await fetch('/_layout/tokenhtml', { credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(`Could not fetch CSRF token (status ${response.status}).`)
  }
  const html = await response.text()
  const match = html.match(/value="([^"]+)"/)
  if (!match) throw new Error('Could not parse CSRF token from /_layout/tokenhtml.')
  return match[1]
}

export const SIGN_IN_URL = '/SignIn?returnUrl=%2F'

export function isSignedIn(): boolean {
  if (isDevelopment) return true
  return Boolean(window.Microsoft?.Dynamic365?.Portal?.User?.contactId)
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is too large. Maximum size is 2 MB.`
  }
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const typeOk = file.type && (ALLOWED_TYPES as readonly string[]).includes(file.type)
  const extOk = (config.allowedExtensions as readonly string[]).includes(ext)
  if (!typeOk && !extOk) {
    return `"${file.name}" is not an allowed type. Allowed text documents: TXT, CSV, JSON, MD, HTML, XML.`
  }
  return null
}

/**
 * Call the server logic and unwrap its `{ success, data, error }` envelope.
 * `query` appends to the URL; `body` (when present) is sent as JSON.
 */
async function callServerLogic(
  method: 'GET' | 'POST' | 'DELETE',
  opts: { query?: string; body?: unknown } = {},
): Promise<unknown> {
  const token = await getCsrfToken()
  const headers: Record<string, string> = {
    __RequestVerificationToken: token,
    // Mark the request as AJAX (portal endpoints expect this).
    'X-Requested-With': 'XMLHttpRequest',
  }
  // IMPORTANT: send the body as text/plain, NOT application/json. The body is
  // still a JSON string and the server logic does JSON.parse(Server.Context.Body)
  // regardless of content type — but the runtime enforces a ~2 MB size limit when
  // it validates an application/json request body (larger JSON uploads fail with
  // HTTP 500). text/plain passes the body straight through, so uploads work up to
  // the runtime's overall request cap (see MAX_FILE_BYTES in config.ts).
  if (opts.body !== undefined) headers['Content-Type'] = 'text/plain'

  const response = await fetch(BASE + (opts.query ?? ''), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error(
      `Server logic call failed (status ${response.status}). ` +
        'Check that the server logic is published, your web role can call it, and the SharePoint settings are set.',
    )
  }
  const env = (await response.json()) as Record<string, unknown>
  // The runtime wraps the handler's return value in an envelope. Its key casing
  // has varied across versions: the live runtime returns lowercase keys
  // (success/data/error), while the docs show capitalized ones — so accept
  // either.
  const success = (env.success ?? env.Success) as boolean | undefined
  const error = (env.error ?? env.Error) as string | undefined
  const data = env.data ?? env.Data
  if (!success) throw new Error((error as string) || 'Server logic reported a failure.')
  // The server logic returns its payload as a JSON STRING, which the runtime
  // places in `data` (see author-server-logic "Example: Response"). Parse it
  // back to an object/array. Guard for the case where the runtime hands back an
  // already-parsed value or an empty body.
  if (typeof data === 'string') {
    return data ? JSON.parse(data) : null
  }
  return data
}

/** Decode a base64 string into an ArrayBuffer (for non-text content). */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return buffer
}

/**
 * Trigger a browser download. `content` is either plain text or base64 depending
 * on `encoding` — the server logic tells us which (see the encoding quirk in
 * sharepointDocuments.js). We build the Blob from raw bytes for base64 so the
 * saved file is byte-for-byte correct.
 */
function triggerDownload(
  filename: string,
  mimetype: string,
  content: string,
  encoding: 'text' | 'base64',
): void {
  const type = mimetype || 'text/plain'
  const blob =
    encoding === 'base64'
      ? new Blob([base64ToBuffer(content)], { type })
      : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Upload one text document: read it as text and hand it to the server logic. */
export async function uploadFile(file: File): Promise<void> {
  const validationError = validateFile(file)
  if (validationError) throw new Error(validationError)

  const content = await file.text()

  if (isDevelopment) {
    await new Promise(r => setTimeout(r, 500))
    mockFiles.unshift({
      id: `dev-${mockId++}`,
      filename: file.name,
      filesize: file.size,
      createdon: new Date().toISOString(),
      content,
      mimetype: file.type || 'text/plain',
    })
    return
  }

  await callServerLogic('POST', { body: { fileName: file.name, fileContent: content } })
}

/** List the signed-in user's files. */
export async function listFiles(): Promise<UploadedFile[]> {
  if (isDevelopment) {
    return mockFiles.map(({ content: _c, mimetype: _m, ...rest }) => rest)
  }

  const data = (await callServerLogic('GET')) as Array<Record<string, unknown>>
  return (data ?? []).map(r => ({
    id: String(r.id ?? ''),
    filename: String(r.name ?? '(unnamed)'),
    filesize: Number(r.size ?? 0),
    createdon: String(r.modified ?? ''),
  }))
}

/** Download a file: ask the server logic for its text content and save it. */
export async function downloadFile(id: string): Promise<void> {
  if (isDevelopment) {
    const found = mockFiles.find(f => f.id === id)
    if (!found) throw new Error('File not found.')
    triggerDownload(found.filename, found.mimetype, found.content, 'text')
    return
  }

  const data = (await callServerLogic('GET', { query: `?id=${encodeURIComponent(id)}` })) as {
    fileName: string
    mimeType: string
    fileContent: string
    encoding?: 'text' | 'base64'
  }
  triggerDownload(
    data.fileName ?? 'download',
    data.mimeType ?? 'text/plain',
    data.fileContent ?? '',
    data.encoding === 'base64' ? 'base64' : 'text',
  )
}

/** Delete a file by id. */
export async function deleteFile(id: string): Promise<void> {
  if (isDevelopment) {
    mockFiles = mockFiles.filter(f => f.id !== id)
    return
  }
  await callServerLogic('DELETE', { query: `?id=${encodeURIComponent(id)}` })
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
