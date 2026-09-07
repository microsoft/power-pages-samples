// src/shared/services/annotationService.ts
// Service for uploading file attachments via Dataverse annotation (notes) entity.

import { powerPagesFetchResponse, extractRecordId } from '../powerPagesApi'
import type { CreateAnnotationInput } from '../../types/serviceRequest'

// -- File Validation ----------------------------------------------------------

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', // images
  'pdf',                                                         // documents
  'doc', 'docx',                                                 // word
])

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/** Validate a file's extension (from filename) and size, independent of MIME/accept. */
export const validateFile = (file: File): FileValidationResult => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type ".${ext}" is not allowed. Accepted: images, PDF, Word documents.` }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File "${file.name}" exceeds the 5 MB size limit.` }
  }
  if (file.size === 0) {
    return { valid: false, error: `File "${file.name}" is empty.` }
  }
  return { valid: true }
}

/**
 * Convert a File to a base64-encoded string (without the data URI prefix).
 */
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the "data:<mime>;base64," prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

/**
 * Create a single annotation (note with attachment) linked to a service request.
 *
 * Uses a two-step approach because Power Pages Web API does not support the
 * polymorphic objectid_spa311_servicerequest@odata.bind syntax on POST.
 * Step 1: Create the annotation with file data (no objectid).
 * Step 2: PATCH the annotation to bind it to the service request.
 */
export const createAnnotation = async (input: CreateAnnotationInput): Promise<string | null> => {
  // Step 1: Create annotation with file data only
  const createBody: Record<string, unknown> = {
    subject: input.subject,
    filename: input.filename,
    mimetype: input.mimetype,
    documentbody: input.documentbody,
    isdocument: true,
    notetext: input.notetext ?? input.filename,
  }

  const createResponse = await powerPagesFetchResponse('/_api/annotations', {
    method: 'POST',
    body: JSON.stringify(createBody),
  })

  const annotationId = extractRecordId(createResponse)
  if (!annotationId) {
    throw new Error('Annotation created but could not extract record ID')
  }

  // Step 2: Associate annotation with service request via objectid
  const patchBody: Record<string, unknown> = {
    'objectid_spa311_servicerequest@odata.bind': `/spa311_servicerequests(${input.objectId})`,
  }

  await powerPagesFetchResponse(`/_api/annotations(${annotationId})`, {
    method: 'PATCH',
    headers: { 'If-Match': '*' },
    body: JSON.stringify(patchBody),
  })

  return annotationId
}

/**
 * Upload multiple file attachments for a service request.
 * Files are uploaded sequentially to avoid overwhelming the API.
 * Returns counts of succeeded and failed uploads.
 */
export const uploadAttachments = async (
  parentId: string,
  files: File[]
): Promise<{ succeeded: number; failed: number }> => {
  let succeeded = 0
  let failed = 0

  for (const file of files) {
    const validation = validateFile(file)
    if (!validation.valid) {
      console.warn(`Skipping ${file.name}: ${validation.error}`)
      failed++
      continue
    }

    try {
      const base64 = await fileToBase64(file)
      await createAnnotation({
        subject: `Attachment: ${file.name}`,
        filename: file.name,
        mimetype: file.type || 'application/octet-stream',
        documentbody: base64,
        objectId: parentId,
      })
      succeeded++
    } catch (err) {
      console.error(`Failed to upload ${file.name}:`, err)
      failed++
    }
  }

  return { succeeded, failed }
}
