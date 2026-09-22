// src/services/invoiceService.ts
// CRUD service for the spnvc_invoice Dataverse table via Power Pages Web API.

import {
  powerPagesFetch,
  powerPagesFetchResponse,
  parseResponseBody,
  extractRecordId,
  buildODataUrl,
  escapeODataString,
  type ODataCollectionResponse,
  type PaginatedResult,
} from './powerPagesApi'
import {
  type InvoiceEntity,
  type Invoice,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
  type InvoiceStatusLabel,
  INVOICE_STATUS,
  mapInvoiceEntity,
} from '../types/invoice'

// -- Constants ----------------------------------------------------------------

const ENTITY_SET = 'spnvc_invoices'

const INVOICE_SELECT = [
  'spnvc_invoiceid',
  'spnvc_name',
  'spnvc_ponumber',
  'spnvc_description',
  'spnvc_submissiondate',
  'spnvc_duedate',
  'spnvc_amount',
  'spnvc_invoicestatus',
  '_spnvc_contactid_value',
  '_spnvc_supplierid_value',
  '_spnvc_purchaseorderid_value',
  'createdon',
  'modifiedon',
].join(',')

// Navigation property names are case-sensitive and come from Dataverse metadata:
//   spnvc_ContactId -> contact (ReferencingEntityNavigationPropertyName)
//   spnvc_SupplierId -> spnvc_supplier (ReferencingEntityNavigationPropertyName)
const INVOICE_EXPAND = [
  'spnvc_ContactId($select=contactid,fullname)',
  'spnvc_SupplierId($select=spnvc_supplierid,spnvc_name)',
].join(',')

// -- List Parameters ----------------------------------------------------------

export interface InvoiceListParams {
  pageSize?: number
  nextLink?: string
  filter?: string
  orderBy?: string
  search?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listInvoices = async (
  params?: InvoiceListParams,
): Promise<PaginatedResult<Invoice>> => {
  const pageSize = params?.pageSize ?? 10

  // Build $filter combining any custom filter with optional search
  let filter = params?.filter
  if (params?.search) {
    const escaped = escapeODataString(params.search)
    const searchFilter = `contains(spnvc_name,'${escaped}') or contains(spnvc_ponumber,'${escaped}') or contains(spnvc_description,'${escaped}')`
    filter = filter ? `(${filter}) and (${searchFilter})` : searchFilter
  }

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const url = params?.nextLink ?? buildODataUrl(ENTITY_SET, {
    '$select': INVOICE_SELECT,
    '$expand': INVOICE_EXPAND,
    '$orderby': params?.orderBy ?? 'createdon desc',
    '$count': 'true',
    '$top': String(pageSize),
    '$filter': filter,
  })

  const response = await powerPagesFetch<ODataCollectionResponse<InvoiceEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapInvoiceEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- List by status -----------------------------------------------------------

export const listInvoicesByStatus = async (
  status: InvoiceStatusLabel,
  params?: Omit<InvoiceListParams, 'filter'>,
): Promise<PaginatedResult<Invoice>> => {
  const statusValue = INVOICE_STATUS[status]
  return listInvoices({
    ...params,
    filter: `spnvc_invoicestatus eq ${statusValue}`,
  })
}

// -- Get by ID ----------------------------------------------------------------

export const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  const url = buildODataUrl(`${ENTITY_SET}(${id})`, {
    '$select': INVOICE_SELECT,
    '$expand': INVOICE_EXPAND,
  })

  try {
    const entity = await powerPagesFetch<InvoiceEntity>(url)
    return entity ? mapInvoiceEntity(entity) : null
  } catch (err) {
    console.error(`[invoiceService] getInvoiceById(${id}) failed:`, err)
    return null
  }
}

// -- Create -------------------------------------------------------------------

export const createInvoice = async (payload: CreateInvoiceInput): Promise<Invoice> => {
  const body: Record<string, unknown> = {
    spnvc_name: payload.invoiceNumber,
    spnvc_ponumber: payload.poNumber ?? '',
    spnvc_description: payload.description ?? '',
    spnvc_amount: payload.amount,
    spnvc_invoicestatus: INVOICE_STATUS[payload.status ?? 'Draft'],
  }

  if (payload.submissionDate) {
    body.spnvc_submissiondate = payload.submissionDate
  }
  if (payload.dueDate) {
    body.spnvc_duedate = payload.dueDate
  }

  // Bind lookups using @odata.bind with Navigation Property names (case-sensitive)
  if (payload.contactId) {
    body['spnvc_ContactId@odata.bind'] = `/contacts(${payload.contactId})`
  }
  if (payload.supplierId) {
    body['spnvc_SupplierId@odata.bind'] = `/spnvc_suppliers(${payload.supplierId})`
  }

  const response = await powerPagesFetchResponse(`/_api/${ENTITY_SET}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })

  // Try to parse the entity from the response body
  const entity = await parseResponseBody<InvoiceEntity>(response)
  if (entity) return mapInvoiceEntity(entity)

  // No body -- extract the ID from the Location header and fetch the record
  const createdId = extractRecordId(response)
  if (createdId) {
    const created = await getInvoiceById(createdId)
    if (created) return created
  }

  throw new Error('Failed to retrieve created record -- no response body or Location header')
}

// -- Update -------------------------------------------------------------------

export const updateInvoice = async (
  id: string,
  payload: UpdateInvoiceInput,
): Promise<Invoice> => {
  const body: Record<string, unknown> = {}

  if (payload.invoiceNumber !== undefined) body.spnvc_name = payload.invoiceNumber
  if (payload.poNumber !== undefined) body.spnvc_ponumber = payload.poNumber
  if (payload.description !== undefined) body.spnvc_description = payload.description
  if (payload.submissionDate !== undefined) body.spnvc_submissiondate = payload.submissionDate
  if (payload.dueDate !== undefined) body.spnvc_duedate = payload.dueDate
  if (payload.amount !== undefined) body.spnvc_amount = payload.amount
  if (payload.status !== undefined) body.spnvc_invoicestatus = INVOICE_STATUS[payload.status]

  // Handle lookup bind/unbind
  if (payload.contactId !== undefined) {
    if (payload.contactId) {
      body['spnvc_ContactId@odata.bind'] = `/contacts(${payload.contactId})`
    } else {
      body['spnvc_ContactId@odata.bind'] = null
    }
  }
  if (payload.supplierId !== undefined) {
    if (payload.supplierId) {
      body['spnvc_SupplierId@odata.bind'] = `/spnvc_suppliers(${payload.supplierId})`
    } else {
      body['spnvc_SupplierId@odata.bind'] = null
    }
  }

  await powerPagesFetch(`/_api/${ENTITY_SET}(${id})`, {
    method: 'PATCH',
    headers: { 'If-Match': '*' },
    body: JSON.stringify(body),
  })

  const updated = await getInvoiceById(id)
  if (!updated) throw new Error('Failed to fetch updated record')
  return updated
}

// -- Delete -------------------------------------------------------------------

export const deleteInvoice = async (id: string): Promise<void> => {
  await powerPagesFetch(`/_api/${ENTITY_SET}(${id})`, {
    method: 'DELETE',
  })
}

// -- Count helper -------------------------------------------------------------

export const getInvoiceCount = async (filter?: string): Promise<number> => {
  const url = buildODataUrl(ENTITY_SET, {
    '$select': 'spnvc_invoiceid',
    '$filter': filter,
    '$count': 'true',
    '$top': '0',
  })

  const response = await powerPagesFetch<ODataCollectionResponse<InvoiceEntity>>(url)
  return response?.['@odata.count'] ?? 0
}

// -- Aggregation: count by status ---------------------------------------------

// The Power Pages Web API rejects `$apply` (OData aggregate/groupby) requests
// with a "WebAPI * is not enabled" error: the table's `Webapi/<table>/fields`
// site setting would need to be the wildcard `*` for aggregate to see every
// column, but that wildcard is blocked (deprecated for security reasons) and
// there is currently no non-wildcard way to opt a table into `$apply`. Until
// a runtime fix ships, compute per-status counts with one non-aggregate
// `$count=true&$top=0` request per status instead.
export const getInvoiceCountByStatus = async (): Promise<
  Array<{ status: InvoiceStatusLabel; statusValue: number; count: number }>
> => {
  const entries = Object.entries(INVOICE_STATUS) as Array<[InvoiceStatusLabel, number]>

  const counts = await Promise.all(
    entries.map(async ([status, statusValue]) => {
      const url = buildODataUrl(ENTITY_SET, {
        '$select': 'spnvc_invoiceid',
        '$filter': `spnvc_invoicestatus eq ${statusValue}`,
        '$count': 'true',
        '$top': '0',
      })
      const response = await powerPagesFetch<ODataCollectionResponse<InvoiceEntity>>(url)
      return { status, statusValue, count: response?.['@odata.count'] ?? 0 }
    }),
  )

  return counts
}

// -- Aggregation: amount totals -----------------------------------------------

// Same restriction as above -- `$apply` aggregate expressions are unavailable
// without the blocked `Webapi/<table>/fields = *` wildcard, so page through
// `spnvc_amount` values and sum/average them on the client.
export const getInvoiceAmountStats = async (): Promise<{ total: number; avg: number }> => {
  let total = 0
  let count = 0
  let url: string | undefined = buildODataUrl(ENTITY_SET, {
    '$select': 'spnvc_amount',
    '$top': '5000',
  })

  while (url) {
    const response: ODataCollectionResponse<Record<string, unknown>> | null =
      await powerPagesFetch<ODataCollectionResponse<Record<string, unknown>>>(url)
    for (const row of response?.value ?? []) {
      total += (row['spnvc_amount'] as number) ?? 0
      count += 1
    }
    url = response?.['@odata.nextLink']
  }

  return { total, avg: count > 0 ? total / count : 0 }
}
