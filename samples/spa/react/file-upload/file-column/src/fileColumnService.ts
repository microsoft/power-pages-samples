// ---------------------------------------------------------------------------
// fileColumnService.ts — THE LESSON OF THIS SAMPLE
//
// Upload, list, download, and delete files with the Power Pages Web API,
// storing each file in a native Dataverse **File column** (NOT a note /
// annotation). Each file is one record in a custom table; the binary lives in
// the table's File column, with companion columns for name/mimetype/size and a
// lookup to the signed-in user's contact for per-user ownership.
//
// File columns require a **two-step create**: the record must exist before you
// can upload bytes into its File column.
//
//   Upload   POST  /_api/<set>                     (creates the record)
//            PATCH /_api/<set>(<id>)/<filecolumn>   (raw bytes into the column)
//   List     GET   /_api/<set>?$select=...&$filter=_<contact>_value eq <id>
//   Download GET   /_api/<set>(<id>)/<filecolumn>/$value   (raw bytes back)
//   Delete   DELETE /_api/<set>(<id>)               (removes record + file)
//
// Every write (POST/PATCH/DELETE) must carry the CSRF token header. Reads do not.
//
// Unlike the notes sample, the payload is **raw binary** (application/octet-stream
// via `file.arrayBuffer()`) — no base64 inflation. We self-cap at ~10 MB, safely
// under the 16 MB portal single-call ceiling, so we never need manual chunking.
//
// See https://learn.microsoft.com/power-pages/configure/file-column
// and https://learn.microsoft.com/power-apps/developer/data-platform/file-column-data
// ---------------------------------------------------------------------------

import { config } from './config'

export interface UploadedFile {
  id: string
  filename: string
  mimetype: string
  filesize: number
  createdon: string
}

// Guards enforced before we ever call the API. Keep these honest in the UI too.
export const MAX_FILE_BYTES = 10 * 1024 * 1024 // ~10 MB (under the 16 MB portal single-call ceiling)
export const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

// In-memory store backing the local dev mock so the UI is fully testable offline.
// Holds the raw bytes (ArrayBuffer) instead of base64 — mirroring the live binary path.
let mockFiles: (UploadedFile & { bytes: ArrayBuffer })[] = []
let mockId = 1

/** Fetch the anti-forgery (CSRF) token required on every write request. */
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

/** The contact id of the signed-in user — the owner we stamp on each record. */
function getContactId(): string {
  if (isDevelopment) return '00000000-0000-0000-0000-000000000001'
  const contactId = window.Microsoft?.Dynamic365?.Portal?.User?.contactId
  if (!contactId) {
    throw new Error('You must be signed in to manage files.')
  }
  return contactId
}

// Power Pages sign-in entry point. `returnUrl` brings the visitor back here
// after they authenticate with the configured identity provider.
export const SIGN_IN_URL = '/SignIn?returnUrl=%2F'

/** Whether the visitor is signed in (has a contact record). Always true in dev. */
export function isSignedIn(): boolean {
  if (isDevelopment) return true
  return Boolean(window.Microsoft?.Dynamic365?.Portal?.User?.contactId)
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is too large. Maximum size is 10 MB.`
  }
  // `file.type` is the browser-provided MIME type, which can be empty for some
  // files (e.g. certain .txt or uncommon types) — a valid file would then be
  // rejected here. Fine for a sample; a production app might also fall back to the
  // file extension.
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `"${file.name}" is not an allowed type. Allowed: PDF, PNG, JPEG, TXT.`
  }
  return null
}

/**
 * Pull the new record id out of the create response. The portal Web API returns
 * it in the `OData-EntityId` (or `entityid`) header as `.../<set>(<guid>)`.
 */
function parseEntityId(response: Response): string {
  const header =
    response.headers.get('OData-EntityId') ?? response.headers.get('entityid')
  if (header) {
    const match = header.match(/\(([^)]+)\)/)
    if (match) return match[1]
  }
  throw new Error('Created the record but could not read its id from the response header.')
}

/**
 * Upload one file. File columns require the record to exist first, so this is
 * the two-step create the file-column model is built around:
 *   1. POST the record (metadata + owner lookup).
 *   2. PATCH the raw bytes into the File column.
 */
export async function uploadFile(file: File): Promise<void> {
  const validationError = validateFile(file)
  if (validationError) throw new Error(validationError)

  const contactId = getContactId()

  if (isDevelopment) {
    await new Promise(r => setTimeout(r, 600))
    mockFiles.unshift({
      id: `dev-${mockId++}`,
      filename: file.name,
      mimetype: file.type,
      filesize: file.size,
      createdon: new Date().toISOString(),
      bytes: await file.arrayBuffer(),
    })
    return
  }

  const token = await getCsrfToken()

  // Step 1: create the record (no binary yet) and bind it to the user's contact.
  const createResponse = await fetch(`/_api/${config.entitySet}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      __RequestVerificationToken: token,
    },
    body: JSON.stringify({
      [config.nameColumn]: file.name,
      [config.fileNameColumn]: file.name,
      [config.mimeTypeColumn]: file.type,
      [config.fileSizeColumn]: file.size,
      // Bind via the lookup's nav property (PascalCase schema name), not the
      // lowercase logical column — Web API @odata.bind is case-sensitive.
      [`${config.contactNavProperty}@odata.bind`]: `/contacts(${contactId})`,
    }),
    credentials: 'same-origin',
  })

  if (!createResponse.ok) {
    throw new Error(
      `Creating the file record failed (status ${createResponse.status}). ` +
        `Check that the Web API is enabled for ${config.table} and your web role can create records.`,
    )
  }

  const recordId = parseEntityId(createResponse)

  // Step 2: PATCH the raw bytes into the File column.
  const bytes = await file.arrayBuffer()
  const uploadResponse = await fetch(
    `/_api/${config.entitySet}(${recordId})/${config.fileColumn}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/octet-stream',
        __RequestVerificationToken: token,
        // Dataverse honors x-ms-file-name to set the stored file name.
        'x-ms-file-name': file.name,
      },
      body: bytes,
      credentials: 'same-origin',
    },
  )

  if (!uploadResponse.ok) {
    // The record exists but the bytes didn't land — clean it up so the list
    // doesn't show an empty-file row.
    await deleteFile(recordId).catch(() => {})
    throw new Error(
      `Uploading the file content failed (status ${uploadResponse.status}). ` +
        `Check that the Web API 'fields' for ${config.table} includes the file column "${config.fileColumn}".`,
    )
  }
}

/** List the file records owned by the signed-in user's contact. */
export async function listFiles(): Promise<UploadedFile[]> {
  const contactId = getContactId()

  if (isDevelopment) {
    return mockFiles.map(({ bytes: _ignored, ...rest }) => rest)
  }

  const query =
    `/_api/${config.entitySet}` +
    `?$select=${config.idColumn},${config.fileNameColumn},${config.mimeTypeColumn},${config.fileSizeColumn},createdon` +
    `&$filter=${config.contactValueField} eq ${contactId}` +
    `&$orderby=createdon desc`

  const response = await fetch(query, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error(`Could not load files (status ${response.status}).`)
  }
  const body = await response.json()
  return (body.value as Record<string, unknown>[]).map(row => ({
    id: row[config.idColumn] as string,
    filename: (row[config.fileNameColumn] as string) ?? '(unnamed)',
    mimetype: (row[config.mimeTypeColumn] as string) ?? 'application/octet-stream',
    filesize: (row[config.fileSizeColumn] as number) ?? 0,
    createdon: row.createdon as string,
  }))
}

/**
 * Download a file by GETting the File column's `$value` (raw bytes), then
 * wrap it in a Blob typed with the stored MIME type and trigger a browser
 * download named from the stored file name.
 */
export async function downloadFile(id: string): Promise<void> {
  let filename: string
  let mimetype: string
  let bytes: ArrayBuffer

  if (isDevelopment) {
    const found = mockFiles.find(f => f.id === id)
    if (!found) throw new Error('File not found.')
    ;({ filename, mimetype, bytes } = found)
  } else {
    // We need the stored name/mimetype to name and type the download. Read them
    // from companion columns rather than relying on (portal-stripped) response headers.
    const metaResponse = await fetch(
      `/_api/${config.entitySet}(${id})?$select=${config.fileNameColumn},${config.mimeTypeColumn}`,
      { headers: { Accept: 'application/json' }, credentials: 'same-origin' },
    )
    if (!metaResponse.ok) {
      throw new Error(`Download failed reading metadata (status ${metaResponse.status}).`)
    }
    const meta = await metaResponse.json()
    filename = meta[config.fileNameColumn] ?? 'download'
    mimetype = meta[config.mimeTypeColumn] ?? 'application/octet-stream'

    const valueResponse = await fetch(
      `/_api/${config.entitySet}(${id})/${config.fileColumn}/$value`,
      {
        headers: { Accept: 'application/octet-stream' },
        credentials: 'same-origin',
      },
    )
    if (!valueResponse.ok) {
      throw new Error(`Download failed (status ${valueResponse.status}).`)
    }
    bytes = await valueResponse.arrayBuffer()
  }

  const blob = new Blob([bytes], { type: mimetype || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Delete a file record (removes the record and its File-column content). */
export async function deleteFile(id: string): Promise<void> {
  if (isDevelopment) {
    mockFiles = mockFiles.filter(f => f.id !== id)
    return
  }

  const token = await getCsrfToken()
  const response = await fetch(`/_api/${config.entitySet}(${id})`, {
    method: 'DELETE',
    // Accept is recommended on every Web API request, even when no body is expected.
    headers: { __RequestVerificationToken: token, Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error(`Delete failed (status ${response.status}).`)
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
