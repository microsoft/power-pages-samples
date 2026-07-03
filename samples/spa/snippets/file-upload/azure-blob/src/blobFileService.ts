// ---------------------------------------------------------------------------
// blobFileService.ts — THE LESSON OF THIS SAMPLE
//
// Upload, list, download, and delete files that are physically stored in
// **Azure Blob storage**, using the Power Pages **file-management Web API**.
//
// This is a DIFFERENT API from the notes and file-column samples. The bytes go
// to YOUR Azure Blob container; Dataverse only keeps a tiny **annotation (note)
// placeholder** record per file (its file name ends in `.azure.txt`). We attach
// each placeholder to the signed-in user's own contact, so files are fenced
// per-user exactly like the notes sample.
//
//   Upload    POST /_api/file/InitializeUpload/<table>(<id>)/blob   -> upload token
//             PUT  /_api/file/UploadBlock/blob?offset=&fileSize=&chunkSize=&token=
//                  ...loop until the whole file is sent. There is NO commit call:
//                  the upload finalizes when the last block reaches fileSize.
//   List      GET  /_api/annotations?$filter=_objectid_value eq <id> and endswith(filename,'.azure.txt')
//   Download  GET  /_api/file/download/annotation(<annotationId>)/blob/$value
//   Delete    DELETE /_api/file/delete/annotation(<annotationId>)/blob/$value
//
// Every write (POST/PUT/DELETE) must carry the CSRF token. Reads do not.
// One exception: InitializeUpload validates the token as a FORM FIELD, not a
// header (see the detailed note on that call below) — so it goes in the body.
//
// Compared with file-column's two-step create, the blob API is "initialize then
// stream blocks" and chunking is first-class (no 16 MB single-call ceiling — a
// single chunk can be up to 100 MB, total up to 10 GB). We still self-cap small
// here for a simple demo.
//
// Requires Azure setup the SPA cannot provision (storage account + container +
// IAM role assignments to the Portals-<site> app) and the Site/FileManagement/*
// site settings — see README.md.
// See https://learn.microsoft.com/power-pages/configure/webapi-azure-blob
// ---------------------------------------------------------------------------

import { config } from './config'

export interface UploadedFile {
  id: string // annotationid of the blob placeholder note
  filename: string // display name (`.azure.txt` suffix stripped)
  mimetype: string
  filesize: number
  createdon: string
}

// Re-exported so the UI can show the same cap it enforces.
export const MAX_FILE_BYTES = config.maxFileBytes
export const ALLOWED_TYPES = config.allowedTypes
// Derived from config so the UI hint, the `accept` attribute, and the
// validation error messages all stay in sync with the single source of truth.
export const ALLOWED_LABEL = config.allowedExtensions
  .map(ext => ext.replace('.', '').toUpperCase())
  .join(', ')
export const ACCEPT_ATTR = config.allowedExtensions.join(',')

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

// In-memory store backing the local dev mock so the UI (including the upload
// progress bar) is fully testable offline. Holds the raw bytes to mirror the
// live download path.
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

/** The contact id of the signed-in user — the record we attach blob files to. */
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

/** Strip the blob placeholder suffix to recover the original display name. */
function stripSuffix(name: string): string {
  return name.endsWith(config.blobAnnotationSuffix)
    ? name.slice(0, -config.blobAnnotationSuffix.length)
    : name
}

/**
 * Decode a base64 string as UTF-8. `atob` alone returns a binary ("Latin-1")
 * string, so any multibyte UTF-8 in the placeholder JSON (e.g. an accented
 * file name) would be corrupted — round-trip the bytes through TextDecoder.
 */
function decodeBase64Utf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is too large. Maximum size is ${formatSize(MAX_FILE_BYTES)}.`
  }
  // `file.type` is the browser-provided MIME type, which can be empty for some
  // files (e.g. certain .txt or uncommon types). Fall back to the extension so a
  // valid file isn't rejected just because the browser didn't report a type.
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const typeOk = file.type && (ALLOWED_TYPES as readonly string[]).includes(file.type)
  const extOk = (config.allowedExtensions as readonly string[]).includes(ext)
  if (!typeOk && !extOk) {
    return `"${file.name}" is not an allowed type. Allowed: ${ALLOWED_LABEL}.`
  }
  return null
}

/**
 * Upload one file to Azure Blob storage via the file-management Web API.
 *
 *   1. InitializeUpload returns an upload token.
 *   2. UploadBlock streams the file in `config.chunkSize` slices. The final
 *      block (the one that reaches `fileSize`) finalizes the upload — there is
 *      deliberately no separate commit call (unlike the file-column API).
 *
 * `onProgress` (0..1) drives the UI progress bar.
 */
export async function uploadFile(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const validationError = validateFile(file)
  if (validationError) throw new Error(validationError)

  const contactId = getContactId()

  if (isDevelopment) {
    // Simulate the chunked upload so the progress bar is exercised offline.
    const steps = Math.max(1, Math.ceil(file.size / config.chunkSize))
    for (let i = 1; i <= steps; i++) {
      await new Promise(r => setTimeout(r, 250))
      onProgress?.(i / steps)
    }
    mockFiles.unshift({
      id: `dev-${mockId++}`,
      filename: file.name,
      mimetype: file.type || 'application/octet-stream',
      filesize: file.size,
      createdon: new Date().toISOString(),
      bytes: await file.arrayBuffer(),
    })
    return
  }

  const token = await getCsrfToken()

  // Step 1: initialize the upload against the parent record (the user's contact).
  //
  // CSRF gotcha: unlike the rest of the Power Pages Web API (which reads the
  // anti-forgery token from the `__RequestVerificationToken` *header*), the
  // file-management endpoints validate it with the classic ASP.NET
  // `System.Web.Helpers.AntiXsrf` validator, which only reads the token from a
  // *form field*. Sending it as a header alone makes InitializeUpload fail with
  // HTTP 500 ("The required anti-forgery form field ... is not present"). So we
  // send the token in a urlencoded body field AND keep the header for parity
  // with the standard filter. The file bytes are streamed later by UploadBlock,
  // so an empty-payload (token-only) body here is correct.
  const initResponse = await fetch(
    `/_api/file/InitializeUpload/${config.parentTable}(${contactId})/blob`,
    {
      method: 'POST',
      headers: {
        __RequestVerificationToken: token,
        'x-ms-file-name': file.name,
        'x-ms-file-size': String(file.size),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `__RequestVerificationToken=${encodeURIComponent(token)}`,
      credentials: 'same-origin',
    },
  )
  if (!initResponse.ok) {
    throw new Error(
      `InitializeUpload failed (status ${initResponse.status}). ` +
        'Check that Site/FileManagement/EnableWebAPI is true, the Azure Storage settings are set, ' +
        'and your web role can create notes on contact.',
    )
  }
  // The response body is the upload token (sometimes JSON-quoted) — unwrap it.
  const uploadToken = (await initResponse.text()).trim().replace(/^"|"$/g, '')

  // Step 2: stream the file in blocks. No commit call — the last block finalizes.
  let offset = 0
  while (offset < file.size) {
    const end = Math.min(offset + config.chunkSize, file.size)
    const chunk = await file.slice(offset, end).arrayBuffer()
    const url =
      `/_api/file/UploadBlock/blob?offset=${offset}` +
      `&fileSize=${file.size}` +
      `&chunkSize=${chunk.byteLength}` +
      `&token=${encodeURIComponent(uploadToken)}`

    const blockResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        __RequestVerificationToken: token,
        'x-ms-file-name': file.name,
        'Content-Type': 'application/octet-stream',
      },
      body: chunk,
      credentials: 'same-origin',
    })
    if (!blockResponse.ok) {
      throw new Error(
        `UploadBlock failed at offset ${offset} (status ${blockResponse.status}).`,
      )
    }
    offset = end
    onProgress?.(offset / file.size)
  }
}

/**
 * List the signed-in user's blob files by querying the annotation table for the
 * `.azure.txt` placeholder notes attached to their contact.
 *
 * Real file metadata (name/type/size) is read from the placeholder's JSON
 * `documentbody` ({ Name, Type, Size, Url }) when present, falling back to the
 * annotation's own columns. The exact placeholder shape is a live-test item.
 */
export async function listFiles(): Promise<UploadedFile[]> {
  const contactId = getContactId()

  if (isDevelopment) {
    return mockFiles.map(({ bytes: _ignored, ...rest }) => rest)
  }

  const query =
    `/_api/annotations?$select=annotationid,filename,mimetype,filesize,documentbody,createdon` +
    `&$filter=_objectid_value eq ${contactId} and endswith(filename,'${config.blobAnnotationSuffix}')` +
    `&$orderby=createdon desc`

  const response = await fetch(query, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error(`Could not load files (status ${response.status}).`)
  }
  const body = await response.json()
  return (body.value as Record<string, unknown>[]).map(row => {
    let name = stripSuffix((row.filename as string) ?? '(unnamed)')
    let mimetype = (row.mimetype as string) ?? 'application/octet-stream'
    let filesize = (row.filesize as number) ?? 0
    // Prefer the real metadata stored in the placeholder's JSON body.
    try {
      if (row.documentbody) {
        const meta = JSON.parse(decodeBase64Utf8(row.documentbody as string))
        name = meta.Name ?? name
        mimetype = meta.Type ?? mimetype
        filesize = Number(meta.Size ?? filesize)
      }
    } catch {
      // Placeholder wasn't JSON we recognise — fall back to the columns above.
    }
    return {
      id: row.annotationid as string,
      filename: name,
      mimetype,
      filesize,
      createdon: row.createdon as string,
    }
  })
}

/**
 * Download a file. The file-management API streams the real blob bytes (with a
 * proper Content-Disposition) from `/_api/file/download/...`, so we just point
 * the browser at that URL. In dev we reconstruct the download from the mock.
 */
export async function downloadFile(id: string): Promise<void> {
  if (isDevelopment) {
    const found = mockFiles.find(f => f.id === id)
    if (!found) throw new Error('File not found.')
    const blob = new Blob([found.bytes], {
      type: found.mimetype || 'application/octet-stream',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = found.filename
    link.click()
    URL.revokeObjectURL(url)
    return
  }

  // By default the portal streams the blob via a short-lived SAS URI; opening
  // the endpoint in the browser triggers the download with the stored file name.
  window.open(`/_api/file/download/annotation(${id})/blob/$value`, '_blank')
}

/** Delete a file: removes the blob content and its placeholder note. */
export async function deleteFile(id: string): Promise<void> {
  if (isDevelopment) {
    mockFiles = mockFiles.filter(f => f.id !== id)
    return
  }

  const token = await getCsrfToken()
  const response = await fetch(`/_api/file/delete/annotation(${id})/blob/$value`, {
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
