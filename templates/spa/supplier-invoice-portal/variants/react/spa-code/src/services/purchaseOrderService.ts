// src/services/purchaseOrderService.ts
// CRUD service for the spnvc_purchaseorder Dataverse table via Power Pages Web API.

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
  type PurchaseOrderEntity,
  type PurchaseOrder,
  type CreatePurchaseOrderInput,
  type UpdatePurchaseOrderInput,
  type POStatusLabel,
  PO_STATUS,
  mapPurchaseOrderEntity,
} from '../types/purchaseOrder'

// -- Constants ----------------------------------------------------------------

const ENTITY_SET = 'spnvc_purchaseorders'

const PO_SELECT = [
  'spnvc_purchaseorderid',
  'spnvc_name',
  'spnvc_description',
  'spnvc_totalamount',
  'spnvc_deliverydate',
  'spnvc_postatus',
  '_spnvc_supplierid_value',
  'createdon',
  'modifiedon',
].join(',')

const PO_EXPAND = [
  'spnvc_SupplierId($select=spnvc_supplierid,spnvc_name)',
].join(',')

// -- List Parameters ----------------------------------------------------------

export interface POListParams {
  pageSize?: number
  nextLink?: string
  filter?: string
  orderBy?: string
  search?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listPurchaseOrders = async (
  params?: POListParams,
): Promise<PaginatedResult<PurchaseOrder>> => {
  const pageSize = params?.pageSize ?? 10

  let filter = params?.filter
  if (params?.search) {
    const escaped = escapeODataString(params.search)
    const searchFilter = `contains(spnvc_name,'${escaped}') or contains(spnvc_description,'${escaped}')`
    filter = filter ? `(${filter}) and (${searchFilter})` : searchFilter
  }

  const url = params?.nextLink ?? buildODataUrl(ENTITY_SET, {
    '$select': PO_SELECT,
    '$expand': PO_EXPAND,
    '$orderby': params?.orderBy ?? 'createdon desc',
    '$count': 'true',
    '$top': String(pageSize),
    '$filter': filter,
  })

  const response = await powerPagesFetch<ODataCollectionResponse<PurchaseOrderEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapPurchaseOrderEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- Get by ID ----------------------------------------------------------------

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder | null> => {
  const url = buildODataUrl(`${ENTITY_SET}(${id})`, {
    '$select': PO_SELECT,
    '$expand': PO_EXPAND,
  })

  try {
    const entity = await powerPagesFetch<PurchaseOrderEntity>(url)
    return entity ? mapPurchaseOrderEntity(entity) : null
  } catch (err) {
    console.error(`[purchaseOrderService] getPurchaseOrderById(${id}) failed:`, err)
    return null
  }
}

// -- Get POs by Supplier ------------------------------------------------------

export const getPOsBySupplier = async (supplierId: string): Promise<PurchaseOrder[]> => {
  const url = buildODataUrl(ENTITY_SET, {
    '$select': PO_SELECT,
    '$expand': PO_EXPAND,
    '$filter': `_spnvc_supplierid_value eq ${supplierId}`,
    '$orderby': 'createdon desc',
  })

  const response = await powerPagesFetch<ODataCollectionResponse<PurchaseOrderEntity>>(url)
  return (response?.value ?? []).map(mapPurchaseOrderEntity)
}

// -- Create -------------------------------------------------------------------

export const createPurchaseOrder = async (payload: CreatePurchaseOrderInput): Promise<PurchaseOrder> => {
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
    body['spnvc_SupplierId@odata.bind'] = `/spnvc_suppliers(${payload.supplierId})`
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

export const getPOCountByStatus = async (): Promise<
  Array<{ status: POStatusLabel; statusValue: number; count: number }>
> => {
  const url = buildODataUrl(ENTITY_SET, {
    '$apply': 'groupby((spnvc_postatus),aggregate($count as count))',
  })

  const response = await powerPagesFetch<ODataCollectionResponse<Record<string, unknown>>>(url)

  const STATUS_VALUE_TO_LABEL: Record<number, POStatusLabel> = {
    1: 'Draft',
    2: 'Issued',
    3: 'Partially Invoiced',
    4: 'Fully Invoiced',
    5: 'Closed',
    6: 'Cancelled',
  }

  return (response?.value ?? []).map((row) => {
    const statusValue = row['spnvc_postatus'] as number
    return {
      status: STATUS_VALUE_TO_LABEL[statusValue] ?? 'Draft',
      statusValue,
      count: row['count'] as number,
    }
  })
}
