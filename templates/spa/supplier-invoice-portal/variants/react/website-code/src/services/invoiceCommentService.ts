// src/services/invoiceCommentService.ts
// Read + Create service for the spnvc_invoicecomment Dataverse table via Power Pages Web API.

import {
  powerPagesFetch,
  powerPagesFetchResponse,
  parseResponseBody,
  extractRecordId,
  buildODataUrl,
  type ODataCollectionResponse,
  type PaginatedResult,
} from './powerPagesApi'
import {
  type InvoiceCommentEntity,
  type InvoiceComment,
  type CreateInvoiceCommentInput,
  mapInvoiceCommentEntity,
} from '../types/invoiceComment'

// -- Constants ----------------------------------------------------------------

const ENTITY_SET = 'spnvc_invoicecomments'

const COMMENT_SELECT = [
  'spnvc_invoicecommentid',
  'spnvc_name',
  'spnvc_commenttext',
  'spnvc_linkedaction',
  '_spnvc_invoiceid_value',
  '_spnvc_authorcontactid_value',
  'createdon',
  'modifiedon',
].join(',')

// $expand is intentionally omitted. Power Pages injects internal permission-chain
// columns (e.g. _spnvc_contactid_value from the invoice's contact-scope) into the
// query when $expand references a parent-scoped entity, causing 400 errors.
// Display names are already available via OData formatted-value annotations
// (returned by the Prefer header), so $expand is not needed.

// -- List Parameters ----------------------------------------------------------

export interface InvoiceCommentListParams {
  pageSize?: number
  nextLink?: string
  filter?: string
  orderBy?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listInvoiceComments = async (
  params?: InvoiceCommentListParams,
): Promise<PaginatedResult<InvoiceComment>> => {
  const pageSize = params?.pageSize ?? 25

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const url = params?.nextLink ?? buildODataUrl(ENTITY_SET, {
    '$select': COMMENT_SELECT,
    '$orderby': params?.orderBy ?? 'createdon asc',
    '$count': 'true',
    '$top': String(pageSize),
    '$filter': params?.filter,
  })

  const response = await powerPagesFetch<ODataCollectionResponse<InvoiceCommentEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapInvoiceCommentEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- List by Invoice ID -------------------------------------------------------

export const listCommentsByInvoiceId = async (
  invoiceId: string,
  params?: Omit<InvoiceCommentListParams, 'filter'>,
): Promise<PaginatedResult<InvoiceComment>> => {
  return listInvoiceComments({
    ...params,
    filter: `_spnvc_invoiceid_value eq ${invoiceId}`,
  })
}

// -- Get by ID ----------------------------------------------------------------

export const getInvoiceCommentById = async (id: string): Promise<InvoiceComment | null> => {
  const url = buildODataUrl(`${ENTITY_SET}(${id})`, {
    '$select': COMMENT_SELECT,
  })

  try {
    const entity = await powerPagesFetch<InvoiceCommentEntity>(url)
    return entity ? mapInvoiceCommentEntity(entity) : null
  } catch (err) {
    console.error(`[invoiceCommentService] getInvoiceCommentById(${id}) failed:`, err)
    return null
  }
}

// -- Create -------------------------------------------------------------------

export const createInvoiceComment = async (
  payload: CreateInvoiceCommentInput,
): Promise<InvoiceComment> => {
  const body: Record<string, unknown> = {
    spnvc_commenttext: payload.commentText,
  }

  if (payload.title !== undefined) {
    body.spnvc_name = payload.title
  }
  if (payload.linkedAction !== undefined) {
    body.spnvc_linkedaction = payload.linkedAction
  }

  // Bind lookups using @odata.bind with Navigation Property names (case-sensitive)
  body['spnvc_InvoiceId@odata.bind'] = `/spnvc_invoices(${payload.invoiceId})`

  if (payload.authorContactId) {
    body['spnvc_AuthorContactId@odata.bind'] = `/contacts(${payload.authorContactId})`
  }

  // Bind the invoice owner's contact for parent-scope permission resolution.
  // Power Pages requires this column on the child entity to resolve
  // Parent scope → Contact scope permission chains.
  if (payload.contactId) {
    body['spnvc_ContactId@odata.bind'] = `/contacts(${payload.contactId})`
  }

  const response = await powerPagesFetchResponse(`/_api/${ENTITY_SET}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })

  // Try to parse the entity from the response body
  const entity = await parseResponseBody<InvoiceCommentEntity>(response)
  if (entity) return mapInvoiceCommentEntity(entity)

  // No body -- extract the ID from the Location header and fetch the record
  const createdId = extractRecordId(response)
  if (createdId) {
    const created = await getInvoiceCommentById(createdId)
    if (created) return created
  }

  throw new Error('Failed to retrieve created comment -- no response body or Location header')
}

// -- Count helper -------------------------------------------------------------

export const getInvoiceCommentCount = async (filter?: string): Promise<number> => {
  const url = buildODataUrl(ENTITY_SET, {
    '$select': 'spnvc_invoicecommentid',
    '$filter': filter,
    '$count': 'true',
    '$top': '0',
  })

  const response = await powerPagesFetch<ODataCollectionResponse<InvoiceCommentEntity>>(url)
  return response?.['@odata.count'] ?? 0
}

// -- Count comments for an invoice --------------------------------------------

export const getCommentCountForInvoice = async (invoiceId: string): Promise<number> => {
  return getInvoiceCommentCount(`_spnvc_invoiceid_value eq ${invoiceId}`)
}
