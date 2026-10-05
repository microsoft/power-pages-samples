// src/services/purchaseOrderService.ts
// CRUD service for the spnvc_purchaseorder Dataverse table via Power Pages Web API.

import {
  powerPagesFetch,
  powerPagesFetchResponse,
  parseResponseBody,
  extractRecordId,
  type PaginatedResult,
} from './powerPagesApi'
import {
  type PurchaseOrderEntity,
  type PurchaseOrder,
  type CreatePurchaseOrderInput,
  type UpdatePurchaseOrderInput,
  type POStatusLabel,
  PO_STATUS,
  PO_STATUS_VALUE_TO_LABEL,
  mapPurchaseOrderEntity,
} from '../types/purchaseOrder'
import { callServerLogic } from './serverLogicApi'
import { requireAssignableSupplier } from './supplierService'
import { buildFetchXmlUrl, fetchXmlCollection, fetchXmlRecord, and, or, eq, contains, type FetchFilter } from './fetchXmlApi'

// -- Constants ----------------------------------------------------------------

const ENTITY_SET = 'spnvc_purchaseorders'

const PO_SELECT = [
  'spnvc_purchaseorderid',
  'spnvc_name',
  'spnvc_description',
  'spnvc_totalamount',
  'spnvc_deliverydate',
  'spnvc_postatus',
  '_spnvc_supplieraccountid_value',
  'createdon',
  'modifiedon',
].join(',')

// Read the supplier lookup's formatted name without expanding Account records.
// https://learn.microsoft.com/power-apps/maker/data-platform/types-of-fields#different-types-of-lookups

// -- List Parameters ----------------------------------------------------------

export interface POListParams {
  pageSize?: number
  nextLink?: string
  filter?: FetchFilter
  orderBy?: string
  search?: string
  assignableOnly?: boolean
}

// -- List (paginated) ---------------------------------------------------------

export const listPurchaseOrders = async (
  params?: POListParams,
): Promise<PaginatedResult<PurchaseOrder>> => {
  const pageSize = params?.pageSize ?? 10

  let filter = params?.filter
  if (params?.search) {
    filter = and(filter, or(contains('spnvc_name', params.search), contains('spnvc_description', params.search)))
  }

  const url = params?.nextLink ?? buildFetchXmlUrl(ENTITY_SET, {
    select: PO_SELECT,
    orderBy: params?.orderBy ?? 'createdon desc',
    count: true,
    pageSize,
    filter,
    supplierAccountOnly: params?.assignableOnly,
  })

  const response = await fetchXmlCollection<PurchaseOrderEntity>(url)

  return {
    items: (response?.value ?? []).map(mapPurchaseOrderEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- Get by ID ----------------------------------------------------------------

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder | null> => {
  try {
    const entity = await fetchXmlRecord<PurchaseOrderEntity>(ENTITY_SET, id, PO_SELECT)
    return entity ? mapPurchaseOrderEntity(entity) : null
  } catch (err) {
    console.error(`[purchaseOrderService] getPurchaseOrderById(${id}) failed:`, err)
    return null
  }
}

// -- Get POs by Supplier ------------------------------------------------------

export const getPOsBySupplier = async (supplierId: string): Promise<PurchaseOrder[]> => {
  const url = buildFetchXmlUrl(ENTITY_SET, {
    select: PO_SELECT,
    filter: eq('spnvc_supplieraccountid', supplierId),
    orderBy: 'createdon desc',
  })

  const response = await fetchXmlCollection<PurchaseOrderEntity>(url)
  return (response?.value ?? []).map(mapPurchaseOrderEntity)
}

// -- Create -------------------------------------------------------------------

export const createPurchaseOrder = async (payload: CreatePurchaseOrderInput): Promise<PurchaseOrder> => {
  if (payload.supplierId) await requireAssignableSupplier(payload.supplierId)
  const body: Record<string, unknown> = {
    spnvc_name: payload.poNumber,
    spnvc_description: payload.description ?? '',
    spnvc_totalamount: payload.totalAmount,
    spnvc_postatus: PO_STATUS[payload.status ?? 'Draft'],
  }

  if (payload.deliveryDate) {
    body.spnvc_deliverydate = payload.deliveryDate
  }
  if (payload.supplierId) {
    body['spnvc_SupplierAccountId@odata.bind'] = `/accounts(${payload.supplierId})`
  }

  const response = await powerPagesFetchResponse(`/_api/${ENTITY_SET}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })

  const entity = await parseResponseBody<PurchaseOrderEntity>(response)
  if (entity) return mapPurchaseOrderEntity(entity)

  const createdId = extractRecordId(response)
  if (createdId) {
    const created = await getPurchaseOrderById(createdId)
    if (created) return created
  }

  throw new Error('Failed to retrieve created record')
}

// -- Update -------------------------------------------------------------------

export const updatePurchaseOrder = async (
  id: string,
  payload: UpdatePurchaseOrderInput,
): Promise<PurchaseOrder> => {
  const body: Record<string, unknown> = {}

  if (payload.poNumber !== undefined) body.spnvc_name = payload.poNumber
  if (payload.description !== undefined) body.spnvc_description = payload.description
  if (payload.totalAmount !== undefined) body.spnvc_totalamount = payload.totalAmount
  if (payload.deliveryDate !== undefined) body.spnvc_deliverydate = payload.deliveryDate
  if (payload.status !== undefined) body.spnvc_postatus = PO_STATUS[payload.status]

  if (payload.supplierId !== undefined) {
    if (payload.supplierId) {
      await requireAssignableSupplier(payload.supplierId)
      body['spnvc_SupplierAccountId@odata.bind'] = `/accounts(${payload.supplierId})`
    } else {
      body['spnvc_SupplierAccountId@odata.bind'] = null
    }
  }

  await powerPagesFetch(`/_api/${ENTITY_SET}(${id})`, {
    method: 'PATCH',
    headers: { 'If-Match': '*' },
    body: JSON.stringify(body),
  })

  const updated = await getPurchaseOrderById(id)
  if (!updated) throw new Error('Failed to fetch updated record')
  return updated
}

// -- Delete -------------------------------------------------------------------

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  await powerPagesFetch(`/_api/${ENTITY_SET}(${id})`, {
    method: 'DELETE',
  })
}

// -- Count by status ----------------------------------------------------------

// Use the same protected aggregate connector as invoiceService.ts.
export const getPOCountByStatus = async (): Promise<
  Array<{ status: POStatusLabel; statusValue: number; count: number }>
> => {
  const response = await callServerLogic<{ counts: Array<{ statusValue: number; count: number }> }>(
    'dashboard-aggregates',
    'GET',
    { stat: 'po-status-counts' },
  )

  return response.counts.map(({ statusValue, count }) => ({
    status: PO_STATUS_VALUE_TO_LABEL[statusValue] ?? 'Draft',
    statusValue,
    count,
  }))
}
