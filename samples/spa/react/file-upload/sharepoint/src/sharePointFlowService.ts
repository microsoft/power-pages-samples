// ---------------------------------------------------------------------------
// sharePointFlowService.ts — THE LESSON OF THIS SAMPLE
//
// Upload, list, download, and delete files stored in a **SharePoint document
// library**, from a Power Pages code site (SPA).
//
// THE KEY POINT: Power Pages has **no portal Web API (`/_api`) surface for
// SharePoint document libraries** — `/_api` is Dataverse-data-only. The built-in
// SharePoint document management only renders inside a server-side Liquid/basic-
// form subgrid, which a code site (SPA) cannot host (Liquid, forms, and lists are
// not supported in code sites). So this sample reaches SharePoint through the one
// supported, SPA-friendly channel: a **Power Automate cloud flow** that holds the
// SharePoint connection. The SPA calls the flow; the flow does the SharePoint work.
//
//   The SPA → flow call is the same recipe as the cloud-flow sample:
//   POST /_api/cloudflow/v1.0/trigger/<flowId>
//     headers: __RequestVerificationToken (CSRF) + X-Requested-With: XMLHttpRequest
//     body:    JSON whose keys match the flow trigger's input parameter names
//
// One flow handles all four operations, switching on an `operation` input:
//   list     -> returns `files` (a JSON string array of {id,name,size,modified})
//   upload    -> sends `fileName` + `fileContent` (base64); returns `fileId`
//   download  -> sends `fileId`; returns `fileName` + `fileContent` (base64) + `mimeType`
//   delete    -> sends `fileId`
// We also send `contactId` so the flow can fence each user to their own folder.
//
// See README.md for exactly how to build the flow, and
// https://learn.microsoft.com/power-pages/configure/cloud-flow-integration
// ---------------------------------------------------------------------------

import { FLOW_ID, config } from './config'

export interface UploadedFile {
  id: string
  filename: string
  filesize: number
  createdon: string
}

export const MAX_FILE_BYTES = config.maxFileBytes
export const ALLOWED_TYPES = config.allowedTypes

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

// In-memory mock so the whole UI is testable offline (holds base64 like the wire).
let mockFiles: (UploadedFile & { content: string; mimetype: string })[] = []
let mockId = 1

/** Read a File as base64 (without the `data:...;base64,` prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

/** Fetch the anti-forgery (CSRF) token required on every flow call. */
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

/** The signed-in user's contact id — passed to the flow for per-user fencing. */
function getContactId(): string {
  if (isDevelopment) return '00000000-0000-0000-0000-000000000001'
  const contactId = window.Microsoft?.Dynamic365?.Portal?.User?.contactId
  if (!contactId) throw new Error('You must be signed in to manage files.')
  return contactId
}

export const SIGN_IN_URL = '/SignIn?returnUrl=%2F'

export function isSignedIn(): boolean {
  if (isDevelopment) return true
  return Boolean(window.Microsoft?.Dynamic365?.Portal?.User?.contactId)
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is too large. Maximum size is 3.5 MB.`
  }
  // `file.type` can be empty for some files; fall back to the extension so a
  // valid file isn't rejected just because the browser didn't report a type.
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const typeOk = file.type && (ALLOWED_TYPES as readonly string[]).includes(file.type)
  const extOk = (config.allowedExtensions as readonly string[]).includes(ext)
  if (!typeOk && !extOk) {
    return `"${file.name}" is not an allowed type. Allowed: PDF, PNG, JPEG, TXT.`
  }
  return null
}

/**
 * Call the registered cloud flow with the given inputs and return its response
 * as a case-insensitive accessor. Power Pages lowercases the "Respond to Power
 * Pages" output property names on the wire (fileName -> filename), so always read
 * fields through `get()` rather than by exact key.
 */
async function callFlow(
  input: Record<string, string>,
): Promise<(key: string) => string | undefined> {
  const token = await getCsrfToken()
  const response = await fetch(`/_api/cloudflow/v1.0/trigger/${FLOW_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      __RequestVerificationToken: token,
      // REQUIRED: the cloud flow endpoint only accepts AJAX requests. Without this
      // header the call is rejected with a masked HTTP 500 before the flow runs.
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(input),
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error(
      `Flow call failed (status ${response.status}). ` +
        'Check that the SharePoint Documents flow is On, registered to this site, and your web role can call it.',
    )
  }
  const text = await response.text()
  const raw = (text ? JSON.parse(text) : {}) as Record<string, string>
  return (key: string) => raw[key] ?? raw[key.toLowerCase()]
}

/** Trigger a browser download for the given bytes. */
function triggerDownload(filename: string, mimetype: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes as BlobPart], { type: mimetype || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Upload one file: base64-encode it and hand it to the flow to write to SharePoint. */
export async function uploadFile(file: File): Promise<void> {
  const validationError = validateFile(file)
  if (validationError) throw new Error(validationError)

  const content = await fileToBase64(file)
  const contactId = getContactId()

  if (isDevelopment) {
    await new Promise(r => setTimeout(r, 600))
    mockFiles.unshift({
      id: `dev-${mockId++}`,
      filename: file.name,
      filesize: file.size,
      createdon: new Date().toISOString(),
      content,
      mimetype: file.type || 'application/octet-stream',
    })
    return
  }

  await callFlow({
    operation: 'upload',
    fileName: file.name,
    fileContent: content,
    contactId,
  })
}

/** List the files in the signed-in user's SharePoint folder. */
export async function listFiles(): Promise<UploadedFile[]> {
  const contactId = getContactId()

  if (isDevelopment) {
    return mockFiles.map(({ content: _c, mimetype: _m, ...rest }) => rest)
  }

  const get = await callFlow({ operation: 'list', contactId })
  // The flow returns the file list as a JSON string in the `files` output.
  const json = get('files')
  if (!json) return []
  const rows = JSON.parse(json) as Array<Record<string, unknown>>
  return rows.map(r => ({
    id: String(r.id ?? r.Id ?? r.ID ?? ''),
    filename: String(r.name ?? r.Name ?? '(unnamed)'),
    filesize: Number(r.size ?? r.Size ?? 0),
    createdon: String(r.modified ?? r.Modified ?? r.createdon ?? ''),
  }))
}

/** Download a file: ask the flow for its base64 content and save it locally. */
export async function downloadFile(id: string): Promise<void> {
  if (isDevelopment) {
    const found = mockFiles.find(f => f.id === id)
    if (!found) throw new Error('File not found.')
    const bytes = Uint8Array.from(atob(found.content), c => c.charCodeAt(0))
    triggerDownload(found.filename, found.mimetype, bytes)
    return
  }

  const contactId = getContactId()
  const get = await callFlow({ operation: 'download', fileId: id, contactId })
  const content = get('fileContent')
  if (!content) throw new Error('The flow returned no file content.')
  const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0))
  triggerDownload(
    get('fileName') ?? 'download',
    get('mimeType') ?? 'application/octet-stream',
    bytes,
  )
}

/** Delete a file from SharePoint via the flow. */
export async function deleteFile(id: string): Promise<void> {
  if (isDevelopment) {
    mockFiles = mockFiles.filter(f => f.id !== id)
    return
  }
  const contactId = getContactId()
  await callFlow({ operation: 'delete', fileId: id, contactId })
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
