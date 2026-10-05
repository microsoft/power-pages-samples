// src/services/invoiceAttachmentService.ts
// CRUD service for the spnvc_invoiceattachment Dataverse table via Power Pages Web API.
// Operations: create, read (list + get by ID), delete.
// This table has a File column (spnvc_file) with download/upload/delete helpers.

import {
  powerPagesFetch,
  powerPagesFetchResponse,
  parseResponseBody,
  extractRecordId,
  fetchFileColumnUrl,
  uploadFileColumn,
  deleteFileColumn,
  type PaginatedResult,
} from './powerPagesApi'
import {
  type InvoiceAttachmentEntity,
  type InvoiceAttachment,
  type CreateInvoiceAttachmentInput,
  mapInvoiceAttachmentEntity,
} from '../types/invoiceAttachment'
import { buildFetchXmlUrl, fetchXmlCollection, fetchXmlRecord, and, eq, type FetchFilter } from './fetchXmlApi'

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

// Lookup annotations supply names without expanding related Contacts/Invoices
// across Parent/N:N permission chains.

// -- List Parameters ----------------------------------------------------------

export interface InvoiceAttachmentListParams {
  pageSize?: number
  nextLink?: string
  filter?: FetchFilter
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
    filter = and(filter, eq('spnvc_invoiceid', params.invoiceId))
  }
  if (params?.commentId) {
    filter = and(filter, eq('spnvc_invoicecommentid', params.commentId))
  }

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const url = params?.nextLink ?? buildFetchXmlUrl(ENTITY_SET, {
    select: ATTACHMENT_SELECT,
    orderBy: params?.orderBy ?? 'createdon desc',
    count: true,
    pageSize,
    filter,
  })

  const response = await fetchXmlCollection<InvoiceAttachmentEntity>(url)

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
  try {
    const entity = await fetchXmlRecord<InvoiceAttachmentEntity>(ENTITY_SET, id, ATTACHMENT_SELECT)
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

  // The contact is provenance only; authorization follows the parent Invoice.
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
  filter?: FetchFilter,
): Promise<number> => {
  const url = buildFetchXmlUrl(ENTITY_SET, {
    select: 'spnvc_invoiceattachmentid',
    filter,
    count: true,
    pageSize: 1,
  })

  const response = await fetchXmlCollection<InvoiceAttachmentEntity>(url)
  return response?.['@odata.count'] ?? 0
}

// -- Count by Invoice ---------------------------------------------------------

export const getAttachmentCountByInvoice = async (
  invoiceId: string,
): Promise<number> => {
  return getInvoiceAttachmentCount(eq('spnvc_invoiceid', invoiceId))
}
