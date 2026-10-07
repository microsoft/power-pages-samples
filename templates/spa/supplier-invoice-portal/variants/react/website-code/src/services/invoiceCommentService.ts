// src/services/invoiceCommentService.ts
// Read + Create service for the spnvc_invoicecomment Dataverse table via Power Pages Web API.

import {
  powerPagesFetchResponse,
  parseResponseBody,
  extractRecordId,
  fetchODataRecord, collectionCount, eq, type ODataFilter,
  type PaginatedResult,
} from './powerPagesApi'
import {
  type InvoiceCommentEntity,
  type InvoiceComment,
  type CreateInvoiceCommentInput,
  mapInvoiceCommentEntity,
} from '../types/invoiceComment'
import { fetchBusinessCollection } from './businessReadService'

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

// Lookup annotations supply names without expanding related Contacts/Invoices
// across Parent/N:N permission chains.

// -- List Parameters ----------------------------------------------------------

export interface InvoiceCommentListParams {
  pageSize?: number
  nextLink?: string
  filter?: ODataFilter
  orderBy?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listInvoiceComments = async (
  params?: InvoiceCommentListParams,
): Promise<PaginatedResult<InvoiceComment>> => {
  const pageSize = params?.pageSize ?? 25

  const response = await fetchBusinessCollection<InvoiceCommentEntity>(ENTITY_SET, {
    select: COMMENT_SELECT,
    orderBy: params?.orderBy ?? 'createdon asc',
    count: true,
    filter: params?.filter,
  }, pageSize, params?.nextLink)

  return {
    items: response.value.map(mapInvoiceCommentEntity),
    totalCount: collectionCount(response),
    nextLink: response['@odata.nextLink'],
  }
}

// -- List by Invoice ID -------------------------------------------------------

export const listCommentsByInvoiceId = async (
  invoiceId: string,
  params?: Omit<InvoiceCommentListParams, 'filter'>,
): Promise<PaginatedResult<InvoiceComment>> => {
  return listInvoiceComments({
    ...params,
    filter: eq('_spnvc_invoiceid_value', invoiceId),
  })
}

// -- Get by ID ----------------------------------------------------------------

export const getInvoiceCommentById = async (id: string): Promise<InvoiceComment | null> => {
  const entity = await fetchODataRecord<InvoiceCommentEntity>(ENTITY_SET, id, COMMENT_SELECT)
  return entity ? mapInvoiceCommentEntity(entity) : null
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

export const getInvoiceCommentCount = async (filter?: ODataFilter): Promise<number> => {
  const response = await fetchBusinessCollection<InvoiceCommentEntity>(ENTITY_SET, {
    select: 'spnvc_invoicecommentid',
    filter,
    count: true,
    top: 1,
  }, 1)
  return collectionCount(response)
}

// -- Count comments for an invoice --------------------------------------------

export const getCommentCountForInvoice = async (invoiceId: string): Promise<number> => {
  return getInvoiceCommentCount(eq('_spnvc_invoiceid_value', invoiceId))
}
