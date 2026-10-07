// src/types/purchaseOrder.ts
// TypeScript types for the spnvc_purchaseorder Dataverse table.

import { getLookupId, getLookupName } from '../services/powerPagesApi'
import choiceValues from '../../dataverse-choice-values.json'
import type { InvoiceStatusLabel } from './invoice'

// -- Raw OData Entity ---------------------------------------------------------

export interface PurchaseOrderEntity {
  spnvc_purchaseorderid: string
  spnvc_name?: string                // PO Number (primary name attribute)
  spnvc_description?: string         // Description (Memo)
  spnvc_totalamount?: number         // Total Amount (Money)
  spnvc_deliverydate?: string        // Delivery Date (DateTime ISO)
  spnvc_postatus?: number            // PO Status (Picklist)
  // Lookup raw GUID values
  _spnvc_supplieraccountid_value?: string   // Supplier GUID
  // Expanded navigation properties
  spnvc_SupplierAccountId?: { accountid: string; name?: string }
  // System columns
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- PO Status Option Set -----------------------------------------------------

export const PO_STATUS = Object.freeze(
  choiceValues.tables.spnvc_purchaseorder.spnvc_postatus,
)

export type POStatusLabel = keyof typeof PO_STATUS
export type POStatusValue = typeof PO_STATUS[POStatusLabel]

/** Statuses where the PO is finalized and no further actions are allowed. */
const LOCKED_PO_STATUSES: readonly POStatusLabel[] = ['Closed', 'Cancelled']

export function isPOLocked(status: string | undefined): boolean {
  return LOCKED_PO_STATUSES.includes(status as POStatusLabel)
}

export const PO_STATUS_VALUE_TO_LABEL = Object.fromEntries(
  Object.entries(PO_STATUS).map(([label, value]) => [value, label]),
) as Record<number, POStatusLabel>

// -- Clean Domain Type --------------------------------------------------------

export interface PurchaseOrder {
  id: string
  poNumber: string
  description: string
  totalAmount: number
  invoicedAmount: number
  remainingAmount: number
  overInvoicedAmount: number
  deliveryDate: string
  status: POStatusLabel
  statusValue: number
  supplierId?: string
  supplierName: string
  createdOn: string
  modifiedOn: string
}

// -- Input Types --------------------------------------------------------------

export interface CreatePurchaseOrderInput {
  poNumber: string
  description?: string
  totalAmount: number
  deliveryDate?: string
  status?: POStatusLabel
  supplierId?: string
}

export interface UpdatePurchaseOrderInput {
  poNumber?: string
  description?: string
  totalAmount?: number
  deliveryDate?: string
  status?: POStatusLabel
  supplierId?: string | null
}

// -- Entity-to-Domain Mapper --------------------------------------------------

export const PO_INVOICED_STATUSES: readonly InvoiceStatusLabel[] = ['Submitted', 'Approved', 'Paid']

export function calculatePOBalance(totalAmount: number, invoicedAmount: number) {
  if (!Number.isFinite(totalAmount) || totalAmount < 0 || !Number.isFinite(invoicedAmount) || invoicedAmount < 0) {
    throw new Error('Purchase order balances require finite nonnegative amounts.')
  }
  // Dataverse Money supports up to four decimal places. Normalize binary
  // addition noise without changing currency or rounding each invoice first.
  // https://learn.microsoft.com/power-apps/maker/data-platform/types-of-fields#currency
  const invoiced = Number(invoicedAmount.toFixed(4))
  return {
    invoicedAmount: invoiced,
    remainingAmount: Number(Math.max(0, totalAmount - invoiced).toFixed(4)),
    overInvoicedAmount: Number(Math.max(0, invoiced - totalAmount).toFixed(4)),
  }
}

export const mapPurchaseOrderEntity = (entity: PurchaseOrderEntity, invoicedAmount = 0): PurchaseOrder => {
  const totalAmount = entity.spnvc_totalamount ?? 0
  return {
    id: entity.spnvc_purchaseorderid,
    poNumber: entity.spnvc_name ?? '',
    description: entity.spnvc_description ?? '',
    totalAmount,
    ...calculatePOBalance(totalAmount, invoicedAmount),
    deliveryDate: entity.spnvc_deliverydate ?? '',
    status: PO_STATUS_VALUE_TO_LABEL[entity.spnvc_postatus ?? 0] ?? 'Draft',
    statusValue: entity.spnvc_postatus ?? PO_STATUS.Draft,
    supplierId: getLookupId(entity, 'spnvc_supplieraccountid'),
    supplierName:
      getLookupName(entity, 'spnvc_supplieraccountid')
      ?? entity.spnvc_SupplierAccountId?.name
      ?? '',
    createdOn: entity.createdon ?? '',
    modifiedOn: entity.modifiedon ?? entity.createdon ?? '',
  }
}
