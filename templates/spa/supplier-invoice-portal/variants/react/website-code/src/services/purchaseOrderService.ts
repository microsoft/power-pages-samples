// src/services/purchaseOrderService.ts
// CRUD service for the spnvc_purchaseorder Dataverse table via Power Pages Web API.

import {
  powerPagesFetch,
  collectPaginatedItems, collectionCount,
  and, or, eq, contains, isGuid, type ODataFilter,
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
  PO_INVOICED_STATUSES,
} from '../types/purchaseOrder'
import { callServerLogic, createBusinessRecord } from './serverLogicApi'
import { requireAssignableSupplier } from './supplierService'
import { SUPPLIER_CATEGORY, ACCOUNT_STATE } from '../types/supplier'
import { fetchBusinessCollection, fetchBusinessRecord } from './businessReadService'
import { INVOICE_STATUS } from '../types/invoice'

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

interface LinkedInvoiceAmount {
  spnvc_invoiceid: string
  spnvc_amount: number
  spnvc_invoicestatus: number
  _spnvc_purchaseorderid_value: string
}

async function mapPurchaseOrdersWithBalances(entities: PurchaseOrderEntity[]): Promise<PurchaseOrder[]> {
  const ids = [...new Set(entities.map(entity => {
    if (!isGuid(entity.spnvc_purchaseorderid)) throw new Error('Missing purchase order ID for invoiced totals.')
    return entity.spnvc_purchaseorderid.toLowerCase()
  }))]
  const totals = new Map<string, number>()
  const statuses = PO_INVOICED_STATUSES.map(status => INVOICE_STATUS[status])
  // The existing fixed reader permits 64 filter nodes. Fifty PO IDs plus
  // the fixed status group fit that budget; bulk reads avoid one call per PO.
  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50)
    const filter = and(
      or(...batch.map(id => eq('_spnvc_purchaseorderid_value', id))),
      or(...statuses.map(status => eq('spnvc_invoicestatus', status))),
    )
    const rows = await collectPaginatedItems(async nextLink => {
      const response = await fetchBusinessCollection<LinkedInvoiceAmount>('spnvc_invoices', {
        select: 'spnvc_invoiceid,spnvc_amount,spnvc_invoicestatus,_spnvc_purchaseorderid_value',
        filter,
        orderBy: 'spnvc_invoiceid asc',
      }, 500, nextLink)
      return { items: response.value, totalCount: collectionCount(response), nextLink: response['@odata.nextLink'] }
    })
    const seen = new Set<string>()
    for (const row of rows) {
      if (!isGuid(row.spnvc_invoiceid) || !isGuid(row._spnvc_purchaseorderid_value) ||
          !batch.includes(row._spnvc_purchaseorderid_value.toLowerCase()) ||
          !statuses.includes(row.spnvc_invoicestatus) ||
          typeof row.spnvc_amount !== 'number' || !Number.isFinite(row.spnvc_amount) || row.spnvc_amount < 0 ||
          seen.has(row.spnvc_invoiceid.toLowerCase())) {
        throw new Error('Invalid or duplicate linked invoice in purchase order totals.')
      }
      seen.add(row.spnvc_invoiceid.toLowerCase())
      const id = row._spnvc_purchaseorderid_value.toLowerCase()
      const total = (totals.get(id) ?? 0) + row.spnvc_amount
      if (!Number.isFinite(total)) throw new Error('Purchase order invoiced total exceeds the supported amount range.')
      totals.set(id, total)
    }
  }
  return entities.map(entity => mapPurchaseOrderEntity(entity, totals.get(entity.spnvc_purchaseorderid.toLowerCase()) ?? 0))
}

// Read the supplier lookup's formatted name without expanding Account records.
// https://learn.microsoft.com/power-apps/maker/data-platform/types-of-fields#different-types-of-lookups

// -- List Parameters ----------------------------------------------------------

export interface POListParams {
  pageSize?: number
  nextLink?: string
  filter?: ODataFilter
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
  if (params?.assignableOnly) {
    // The relationship export declares spnvc_SupplierAccountId with this casing.
    // Filter the related Account on the server; do not fetch and discard other POs.
    filter = and(filter,
      eq('spnvc_SupplierAccountId/accountcategorycode', SUPPLIER_CATEGORY),
      eq('spnvc_SupplierAccountId/statecode', ACCOUNT_STATE.Active))
  }

  const response = await fetchBusinessCollection<PurchaseOrderEntity>(ENTITY_SET, {
    select: PO_SELECT,
    orderBy: params?.orderBy ?? 'createdon desc',
    count: true,
    filter,
  }, pageSize, params?.nextLink)

  return {
    items: await mapPurchaseOrdersWithBalances(response.value),
    totalCount: collectionCount(response),
    nextLink: response['@odata.nextLink'],
  }
}

// -- Get by ID ----------------------------------------------------------------

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder | null> => {
  const entity = await fetchBusinessRecord<PurchaseOrderEntity>(ENTITY_SET, id, PO_SELECT)
  return entity ? (await mapPurchaseOrdersWithBalances([entity]))[0] : null
}

// -- Get POs by Supplier ------------------------------------------------------

export const getPOsBySupplier = async (supplierId: string): Promise<PurchaseOrder[]> => {
  return collectPaginatedItems(nextLink => listPurchaseOrders({
    nextLink,
    filter: eq('_spnvc_supplieraccountid_value', supplierId),
    orderBy: 'createdon desc',
  }))
}

// -- Create -------------------------------------------------------------------

export const createPurchaseOrder = async (payload: CreatePurchaseOrderInput): Promise<PurchaseOrder> => {
  if (payload.supplierId) await requireAssignableSupplier(payload.supplierId)
  const entity = await createBusinessRecord<PurchaseOrderEntity>('create-purchase-order', {
    poNumber: payload.poNumber,
    description: payload.description ?? '',
    totalAmount: payload.totalAmount,
    deliveryDate: payload.deliveryDate,
    supplierId: payload.supplierId,
    status: payload.status ?? 'Draft',
  })
  return mapPurchaseOrderEntity(entity)
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
