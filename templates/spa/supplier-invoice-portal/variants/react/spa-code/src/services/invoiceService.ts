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

export const getInvoiceCountByStatus = async (): Promise<
  Array<{ status: InvoiceStatusLabel; statusValue: number; count: number }>
> => {
  const url = buildODataUrl(ENTITY_SET, {
    '$apply': 'groupby((spnvc_invoicestatus),aggregate($count as count))',
  })

  const response = await powerPagesFetch<ODataCollectionResponse<Record<string, unknown>>>(url)

  const STATUS_VALUE_TO_LABEL: Record<number, InvoiceStatusLabel> = {
    1: 'Draft',
    2: 'Submitted',
    3: 'Under Review',
    4: 'Needs Revision',
    5: 'Approved',
    6: 'Rejected',
    7: 'Paid',
  }

  return (response?.value ?? []).map((row) => {
    const statusValue = row['spnvc_invoicestatus'] as number
    return {
      status: STATUS_VALUE_TO_LABEL[statusValue] ?? 'Draft',
      statusValue,
      count: row['count'] as number,
    }
  })
}

// -- Aggregation: amount totals -----------------------------------------------

export const getInvoiceAmountStats = async (): Promise<{ total: number; avg: number }> => {
  // Power Pages Web API does not support multiple aggregate expressions in a single $apply call.
  // Split into individual queries to avoid 500 errors.
  const [sumResponse, avgResponse] = await Promise.all([
    powerPagesFetch<ODataCollectionResponse<Record<string, unknown>>>(
      buildODataUrl(ENTITY_SET, { '$apply': 'aggregate(spnvc_amount with sum as total)' })
    ),
    powerPagesFetch<ODataCollectionResponse<Record<string, unknown>>>(
      buildODataUrl(ENTITY_SET, { '$apply': 'aggregate(spnvc_amount with average as avg)' })
    ),
  ])

  const total = (sumResponse?.value?.[0]?.['total'] as number) ?? 0
  const avg = (avgResponse?.value?.[0]?.['avg'] as number) ?? 0
  return { total, avg }
}
