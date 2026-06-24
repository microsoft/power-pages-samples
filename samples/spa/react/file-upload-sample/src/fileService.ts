// ---------------------------------------------------------------------------
// fileService.ts — THE LESSON OF THIS SAMPLE
//
// Upload, list, download, and delete files with the Power Pages Web API.
//
// Files are stored as Dataverse **notes (annotation records)** attached to the
// signed-in user's own **contact** record. A note holds the file content as a
// base64 string in `documentbody`, plus `filename` and `mimetype`.
//
//   Upload    POST   /_api/annotations            (documentbody = base64 file)
//   List      GET    /_api/annotations?$filter=_objectid_value eq <contactId>
//   Download  GET    /_api/annotations(<id>)?$select=filename,mimetype,documentbody
//   Delete    DELETE /_api/annotations(<id>)
//
// Every write (POST/DELETE) must carry the CSRF token header. Reads do not.
//
// This single-request approach is for SMALL files (we cap at ~3.5 MB so the
// base64 payload stays well under limits). Large files require the chunked
// InitializeAnnotationBlocksUpload / UploadBlock / CommitAnnotationBlocksUpload
// flow — out of scope for this minimal sample.
// See https://learn.microsoft.com/power-pages/configure/file-column and
// https://learn.microsoft.com/power-apps/developer/data-platform/attachment-annotation-files
// ---------------------------------------------------------------------------

export interface UploadedFile {
  annotationid: string
  filename: string
  mimetype: string
  filesize: number
  createdon: string
}

// Guards enforced before we ever call the API. Keep these honest in the UI too.
export const MAX_FILE_BYTES = 3.5 * 1024 * 1024 // ~3.5 MB
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
let mockFiles: (UploadedFile & { documentbody: string })[] = []
let mockId = 1

/** Read a File as a base64 string (without the `data:...;base64,` prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

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

/** The contact id of the signed-in user — the record we attach notes to. */
function getContactId(): string {
  if (isDevelopment) return '00000000-0000-0000-0000-000000000001'
  const contactId = window.Microsoft?.Dynamic365?.Portal?.User?.contactId
  if (!contactId) {
    throw new Error('You must be signed in to manage files.')
  }
  return contactId
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is too large. Maximum size is 3.5 MB.`
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `"${file.name}" is not an allowed type. Allowed: PDF, PNG, JPEG, TXT.`
  }
  return null
}

/** Upload one file as a note on the signed-in user's contact. */
export async function uploadFile(file: File): Promise<void> {
  const validationError = validateFile(file)
  if (validationError) throw new Error(validationError)

  const documentbody = await fileToBase64(file)
  const contactId = getContactId()

  if (isDevelopment) {
    await new Promise(r => setTimeout(r, 600))
    mockFiles.unshift({
      annotationid: `dev-${mockId++}`,
      filename: file.name,
      mimetype: file.type,
      filesize: file.size,
      createdon: new Date().toISOString(),
      documentbody,
    })
    return
  }

  const token = await getCsrfToken()
  const response = await fetch('/_api/annotations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      __RequestVerificationToken: token,
    },
    body: JSON.stringify({
      subject: file.name,
      filename: file.name,
      mimetype: file.type,
      documentbody, // base64 file content
      isdocument: true,
      // Bind the note to the signed-in user's contact record.
      'objectid_contact@odata.bind': `/contacts(${contactId})`,
    }),
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(
      `Upload failed (status ${response.status}). ` +
        'Check that the Web API is enabled for the annotation table and your web role can create notes.',
    )
  }
}

/** List the files (notes) attached to the signed-in user's contact. */
export async function listFiles(): Promise<UploadedFile[]> {
  const contactId = getContactId()

  if (isDevelopment) {
    return mockFiles.map(({ documentbody: _ignored, ...rest }) => rest)
  }

  const query =
    `/_api/annotations?$select=annotationid,filename,mimetype,filesize,createdon` +
    `&$filter=_objectid_value eq ${contactId} and isdocument eq true` +
    `&$orderby=createdon desc`

  const response = await fetch(query, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error(`Could not load files (status ${response.status}).`)
  }
  const body = await response.json()
  return body.value as UploadedFile[]
}

/** Download a file by reading its note's documentbody and decoding the base64. */
export async function downloadFile(annotationid: string): Promise<void> {
  let filename: string
  let mimetype: string
  let documentbody: string

  if (isDevelopment) {
    const found = mockFiles.find(f => f.annotationid === annotationid)
    if (!found) throw new Error('File not found.')
    ;({ filename, mimetype, documentbody } = found)
  } else {
    const response = await fetch(
      `/_api/annotations(${annotationid})?$select=filename,mimetype,documentbody`,
      { headers: { Accept: 'application/json' }, credentials: 'same-origin' },
    )
    if (!response.ok) {
      throw new Error(`Download failed (status ${response.status}).`)
    }
    const body = await response.json()
    filename = body.filename
    mimetype = body.mimetype
    documentbody = body.documentbody
  }

  // Decode base64 -> bytes -> Blob -> trigger a browser download.
  const bytes = Uint8Array.from(atob(documentbody), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: mimetype || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Delete a file (note). */
export async function deleteFile(annotationid: string): Promise<void> {
  if (isDevelopment) {
    mockFiles = mockFiles.filter(f => f.annotationid !== annotationid)
    return
  }

  const token = await getCsrfToken()
  const response = await fetch(`/_api/annotations(${annotationid})`, {
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
