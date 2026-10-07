// src/services/invoiceService.ts
// CRUD service for the spnvc_invoice Dataverse table via Power Pages Web API.

import {
  powerPagesFetch,
  collectionCount,
  and, or, eq, contains, type ODataFilter,
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
import { callServerLogic, createBusinessRecord } from './serverLogicApi'
import { fetchBusinessCollection, fetchBusinessRecord } from './businessReadService'

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
  '_spnvc_supplieraccountid_value',
  '_spnvc_purchaseorderid_value',
  'createdon',
  'modifiedon',
].join(',')

// Navigation property names are case-sensitive and come from Dataverse metadata:
//   spnvc_ContactId -> contact (ReferencingEntityNavigationPropertyName)
// Supplier names arrive as lookup formatted values, so supplier-facing reads do
// not need permission to expand or browse Account records.

// -- List Parameters ----------------------------------------------------------

export interface InvoiceListParams {
  pageSize?: number
  nextLink?: string
  filter?: ODataFilter
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
    const searchFilter = or(contains('spnvc_name', params.search), contains('spnvc_ponumber', params.search), contains('spnvc_description', params.search))
    filter = and(filter, searchFilter)
  }

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const response = await fetchBusinessCollection<InvoiceEntity>(ENTITY_SET, {
    select: INVOICE_SELECT,
    orderBy: params?.orderBy ?? 'createdon desc',
    count: true,
    filter,
  }, pageSize, params?.nextLink)

  return {
    items: response.value.map(mapInvoiceEntity),
    totalCount: collectionCount(response),
    nextLink: response['@odata.nextLink'],
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
    filter: eq('spnvc_invoicestatus', statusValue),
  })
}

// -- Get by ID ----------------------------------------------------------------

export const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  const entity = await fetchBusinessRecord<InvoiceEntity>(ENTITY_SET, id, INVOICE_SELECT)
  return entity ? mapInvoiceEntity(entity) : null
}

// -- Create -------------------------------------------------------------------

export const createInvoice = async (payload: CreateInvoiceInput): Promise<Invoice> => {
  // Contact, Company, PO number and submission time are derived by the scoped
  // endpoint. Legacy caller identity hints are never forwarded as authority.
  const entity = await createBusinessRecord<InvoiceEntity>('submit-invoice', {
    invoiceNumber: payload.invoiceNumber,
    description: payload.description ?? '',
    amount: payload.amount,
    dueDate: payload.dueDate,
    purchaseOrderId: payload.purchaseOrderId,
    status: payload.status ?? 'Draft',
  })
  return mapInvoiceEntity(entity)
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
      body['spnvc_SupplierAccountId@odata.bind'] = `/accounts(${payload.supplierId})`
    } else {
      body['spnvc_SupplierAccountId@odata.bind'] = null
    }
  }
  if (payload.purchaseOrderId !== undefined) {
    if (payload.purchaseOrderId) {
      body['spnvc_PurchaseOrderId@odata.bind'] = `/spnvc_purchaseorders(${payload.purchaseOrderId})`
    } else {
      body['spnvc_PurchaseOrderId@odata.bind'] = null
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

export const getInvoiceCount = async (filter?: ODataFilter): Promise<number> => {
  const response = await fetchBusinessCollection<InvoiceEntity>(ENTITY_SET, {
    select: 'spnvc_invoiceid',
    filter,
    count: true,
    top: 1,
  }, 1)
  return collectionCount(response)
}

// -- Aggregation: count by status ---------------------------------------------

// Aggregate aliases cannot be selected as real columns by the client Web API.
// The protected dashboard connector instead uses FetchXML and enforces the
// caller's Company Name/N:N table permissions.
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
 * comment above getInvoiceCountByStatus for why the connector is used.
 */
export const getInvoiceAmountStats = async (): Promise<{ total: number; avg: number }> => {
  const response = await callServerLogic<{ stats: { total: number; avg: number } }>(
    'dashboard-aggregates',
    'GET',
    { stat: 'invoice-amount-stats' },
  )

  return response.stats
}
