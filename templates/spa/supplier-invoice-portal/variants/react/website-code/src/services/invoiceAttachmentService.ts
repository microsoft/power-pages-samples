// src/services/invoiceAttachmentService.ts
// CRUD service for the spnvc_invoiceattachment Dataverse table via Power Pages Web API.
// Operations: create, read (list + get by ID), delete.
// This table has a File column (spnvc_file) with download/upload/delete helpers.

import {
  powerPagesFetch,
  powerPagesFetchResponse,
  parseResponseBody,
  extractRecordId,
  buildODataUrl,
  fetchFileColumnUrl,
  uploadFileColumn,
  deleteFileColumn,
  type ODataCollectionResponse,
  type PaginatedResult,
} from './powerPagesApi'
import {
  type InvoiceAttachmentEntity,
  type InvoiceAttachment,
  type CreateInvoiceAttachmentInput,
  mapInvoiceAttachmentEntity,
} from '../types/invoiceAttachment'

// -- Constants ----------------------------------------------------------------

const ENTITY_SET = 'spnvc_invoiceattachments'

const ATTACHMENT_SELECT = [
  'spnvc_invoiceattachmentid',
  'spnvc_name',
  'spnvc_filesize',
  'spnvc_filetype',
  'spnvc_file_name',
  '_spnvc_invoiceid_value',
  '_spnvc_invoicecommentid_value',
  'createdon',
  'modifiedon',
].join(',')

// $expand is intentionally omitted. Power Pages injects internal permission-chain
// columns (e.g. _spnvc_contactid_value from the invoice's contact-scope) into the
// query when $expand references a parent-scoped entity, causing 400 errors.
// Display names are already available via OData formatted-value annotations
// (returned by the Prefer header), so $expand is not needed.

// -- List Parameters ----------------------------------------------------------

export interface InvoiceAttachmentListParams {
  pageSize?: number
  nextLink?: string
  filter?: string
  orderBy?: string
  invoiceId?: string
  commentId?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listInvoiceAttachments = async (
  params?: InvoiceAttachmentListParams,
): Promise<PaginatedResult<InvoiceAttachment>> => {
  const pageSize = params?.pageSize ?? 25

  // Build $filter combining any custom filter with optional invoiceId / commentId
  let filter = params?.filter
  if (params?.invoiceId) {
    const invoiceFilter = `_spnvc_invoiceid_value eq ${params.invoiceId}`
    filter = filter ? `(${filter}) and (${invoiceFilter})` : invoiceFilter
  }
  if (params?.commentId) {
    const commentFilter = `_spnvc_invoicecommentid_value eq ${params.commentId}`
    filter = filter ? `(${filter}) and (${commentFilter})` : commentFilter
  }

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const url = params?.nextLink ?? buildODataUrl(ENTITY_SET, {
    '$select': ATTACHMENT_SELECT,
    '$orderby': params?.orderBy ?? 'createdon desc',
    '$count': 'true',
    '$top': String(pageSize),
    '$filter': filter,
  })

  const response = await powerPagesFetch<ODataCollectionResponse<InvoiceAttachmentEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapInvoiceAttachmentEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- List by Invoice ----------------------------------------------------------

export const listAttachmentsByInvoice = async (
  invoiceId: string,
  params?: Omit<InvoiceAttachmentListParams, 'invoiceId' | 'filter'>,
): Promise<PaginatedResult<InvoiceAttachment>> => {
  return listInvoiceAttachments({ ...params, invoiceId })
}

// -- List by Comment ----------------------------------------------------------

export const listAttachmentsByComment = async (
  commentId: string,
  params?: Omit<InvoiceAttachmentListParams, 'commentId' | 'filter'>,
): Promise<PaginatedResult<InvoiceAttachment>> => {
  return listInvoiceAttachments({ ...params, commentId })
}

// -- Get by ID ----------------------------------------------------------------

export const getInvoiceAttachmentById = async (
  id: string,
): Promise<InvoiceAttachment | null> => {
  const url = buildODataUrl(`${ENTITY_SET}(${id})`, {
    '$select': ATTACHMENT_SELECT,
  })

  try {
    const entity = await powerPagesFetch<InvoiceAttachmentEntity>(url)
    return entity ? mapInvoiceAttachmentEntity(entity) : null
  } catch (err) {
    console.error(`[invoiceAttachmentService] getInvoiceAttachmentById(${id}) failed:`, err)
    return null
  }
}

// -- Create -------------------------------------------------------------------

export const createInvoiceAttachment = async (
  payload: CreateInvoiceAttachmentInput,
): Promise<InvoiceAttachment> => {
  const body: Record<string, unknown> = {
    spnvc_name: payload.fileName,
    spnvc_filesize: payload.fileSize ?? '',
    spnvc_filetype: payload.fileType ?? '',
  }

  // Bind lookups using @odata.bind with Navigation Property names (case-sensitive)
  if (payload.invoiceId) {
    body['spnvc_InvoiceId@odata.bind'] = `/spnvc_invoices(${payload.invoiceId})`
  }
  if (payload.commentId) {
    body['spnvc_InvoiceCommentId@odata.bind'] = `/spnvc_invoicecomments(${payload.commentId})`
  }

  // Bind the invoice owner's contact for parent-scope permission resolution.
  if (payload.contactId) {
    body['spnvc_ContactId@odata.bind'] = `/contacts(${payload.contactId})`
  }

  const response = await powerPagesFetchResponse(`/_api/${ENTITY_SET}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })

  // Try to parse the entity from the response body
  const entity = await parseResponseBody<InvoiceAttachmentEntity>(response)
  if (entity) return mapInvoiceAttachmentEntity(entity)

  // No body -- extract the ID from the Location header and fetch the record
  const createdId = extractRecordId(response)
  if (createdId) {
    const created = await getInvoiceAttachmentById(createdId)
    if (created) return created
  }

  throw new Error('Failed to retrieve created record -- no response body or Location header')
}

// -- Create with file upload --------------------------------------------------
// Convenience method: creates the attachment record and then uploads the file.

export const createInvoiceAttachmentWithFile = async (
  payload: CreateInvoiceAttachmentInput,
  file: Blob,
): Promise<InvoiceAttachment> => {
  const attachment = await createInvoiceAttachment(payload)
  await uploadFileColumn(ENTITY_SET, attachment.id, 'spnvc_file', file, payload.fileName)
  return attachment
}

// -- Delete -------------------------------------------------------------------

export const deleteInvoiceAttachment = async (id: string): Promise<void> => {
  await powerPagesFetch(`/_api/${ENTITY_SET}(${id})`, {
    method: 'DELETE',
  })
}

// -- File Column: Download ----------------------------------------------------
// Returns an object URL for the file blob, or null if no file is stored.

export const downloadAttachmentFile = async (
  id: string,
  mimeType?: string,
): Promise<string | null> => {
  return fetchFileColumnUrl(ENTITY_SET, id, 'spnvc_file', mimeType)
}

// -- File Column: Upload ------------------------------------------------------
// Uploads a file to an existing attachment record's file column.

export const uploadAttachmentFile = async (
  id: string,
  file: Blob,
  fileName?: string,
): Promise<void> => {
  await uploadFileColumn(ENTITY_SET, id, 'spnvc_file', file, fileName)
}

// -- File Column: Delete ------------------------------------------------------
// Removes the file from the column without deleting the attachment record.

export const deleteAttachmentFile = async (id: string): Promise<void> => {
  await deleteFileColumn(ENTITY_SET, id, 'spnvc_file')
}

// -- Count helper -------------------------------------------------------------

export const getInvoiceAttachmentCount = async (
  filter?: string,
): Promise<number> => {
  const url = buildODataUrl(ENTITY_SET, {
    '$select': 'spnvc_invoiceattachmentid',
    '$filter': filter,
    '$count': 'true',
    '$top': '0',
  })

  const response = await powerPagesFetch<ODataCollectionResponse<InvoiceAttachmentEntity>>(url)
  return response?.['@odata.count'] ?? 0
}

// -- Count by Invoice ---------------------------------------------------------

export const getAttachmentCountByInvoice = async (
  invoiceId: string,
): Promise<number> => {
  return getInvoiceAttachmentCount(`_spnvc_invoiceid_value eq ${invoiceId}`)
}
