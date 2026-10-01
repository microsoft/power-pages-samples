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
  INVOICE_STATUS_VALUE_TO_LABEL,
  mapInvoiceEntity,
} from '../types/invoice'
import { callServerLogic } from './serverLogicApi'

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

// The Power Pages *client* Web API rejects $apply=groupby(...)/aggregate(...)
// with "WebAPI * is not enabled": any request without an explicit $select is
// treated as selecting all columns, which the (deprecated) wildcard field
// permission model can no longer satisfy - see
// https://learn.microsoft.com/power-pages/configure/configure-table-permissions
// for the Web API field allowlist this depends on. There is no $select
// workaround because Dataverse validates $select against the base entity's
// schema, and aggregate/groupby result aliases (e.g. "count") do not exist
// on that schema. Until the platform ships a fix, the dashboard-aggregates
// server logic (.powerpages-site/server-logic/dashboard-aggregates) runs the
// same $apply query server-side via Server.Connector.Dataverse instead: it
// still enforces table permissions (Supplier: own invoices only, Reviewer:
// all invoices) but isn't subject to the client Web API's wildcard gate.
export const getInvoiceCountByStatus = async (): Promise<
  Array<{ status: InvoiceStatusLabel; statusValue: number; count: number }>
> => {
  const response = await callServerLogic<{ counts: Array<{ statusValue: number; count: number }> }>(
    'dashboard-aggregates',
    'GET',
    { stat: 'invoice-status-counts' },
  )

  return response.counts.map(({ statusValue, count }) => ({
    status: INVOICE_STATUS_VALUE_TO_LABEL[statusValue] ?? 'Draft',
    statusValue,
    count,
  }))
}

// -- Aggregation: amount totals -----------------------------------------------

/**
 * Returns the sum and average of spnvc_amount across every invoice the current
 * portal user can see, via the dashboard-aggregates server logic. See the
 * comment above getInvoiceCountByStatus for why this can't run as a client
 * Web API $apply query.
 */
export const getInvoiceAmountStats = async (): Promise<{ total: number; avg: number }> => {
  const response = await callServerLogic<{ stats: { total: number; avg: number } }>(
    'dashboard-aggregates',
    'GET',
    { stat: 'invoice-amount-stats' },
  )

  return response.stats
}
