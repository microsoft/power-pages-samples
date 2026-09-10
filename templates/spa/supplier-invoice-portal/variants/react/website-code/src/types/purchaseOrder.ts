// src/types/purchaseOrder.ts
// TypeScript types for the spnvc_purchaseorder Dataverse table.

import { getFormattedValue } from '../services/powerPagesApi'
import choiceValues from '../../dataverse-choice-values.json'

// -- Raw OData Entity ---------------------------------------------------------

export interface PurchaseOrderEntity {
  spnvc_purchaseorderid: string
  spnvc_name?: string                // PO Number (primary name attribute)
  spnvc_description?: string         // Description (Memo)
  spnvc_totalamount?: number         // Total Amount (Money)
  spnvc_deliverydate?: string        // Delivery Date (DateTime ISO)
  spnvc_postatus?: number            // PO Status (Picklist)
  // Lookup raw GUID values
  _spnvc_supplierid_value?: string   // Supplier GUID
  // Expanded navigation properties
  spnvc_SupplierId?: { spnvc_supplierid: string; spnvc_name?: string }
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

export const mapPurchaseOrderEntity = (entity: PurchaseOrderEntity): PurchaseOrder => {
  const totalAmount = entity.spnvc_totalamount ?? 0
  return {
    id: entity.spnvc_purchaseorderid,
    poNumber: entity.spnvc_name ?? '',
    description: entity.spnvc_description ?? '',
    totalAmount,
    invoicedAmount: 0, // Will be computed from linked invoices
    remainingAmount: totalAmount,
    deliveryDate: entity.spnvc_deliverydate ?? '',
    status: PO_STATUS_VALUE_TO_LABEL[entity.spnvc_postatus ?? 0] ?? 'Draft',
    statusValue: entity.spnvc_postatus ?? PO_STATUS.Draft,
    supplierId: entity._spnvc_supplierid_value,
    supplierName:
      getFormattedValue(entity, '_spnvc_supplierid_value')
      ?? entity.spnvc_SupplierId?.spnvc_name
      ?? '',
    createdOn: entity.createdon ?? '',
    modifiedOn: entity.modifiedon ?? entity.createdon ?? '',
  }
}
