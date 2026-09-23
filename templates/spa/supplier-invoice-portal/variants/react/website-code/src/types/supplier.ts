// src/types/supplier.ts
// TypeScript types for the spnvc_supplier Dataverse table.

import choiceValues from '../../dataverse-choice-values.json'

// -- Raw OData Entity ---------------------------------------------------------

export interface SupplierEntity {
  spnvc_supplierid: string
  spnvc_name?: string       // Supplier Name (primary name attribute)
  spnvc_email?: string      // Contact email
  spnvc_status?: number     // Supplier Status (Picklist)
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Supplier Status Option Set -----------------------------------------------

export const SUPPLIER_STATUS = Object.freeze(
  choiceValues.tables.spnvc_supplier.spnvc_status,
)

export type SupplierStatusLabel = keyof typeof SUPPLIER_STATUS

export const SUPPLIER_STATUS_VALUE_TO_LABEL = Object.fromEntries(
  Object.entries(SUPPLIER_STATUS).map(([label, value]) => [value, label]),
) as Record<number, SupplierStatusLabel>

// -- Clean Domain Type --------------------------------------------------------

export interface Supplier {
  id: string
  name: string
  email: string
  status: SupplierStatusLabel | undefined
}

// -- Mapper -------------------------------------------------------------------

export const mapSupplierEntity = (entity: SupplierEntity): Supplier => ({
  id: entity.spnvc_supplierid,
  name: entity.spnvc_name ?? '',
  email: entity.spnvc_email ?? '',
  status:
    entity.spnvc_status === undefined
      ? undefined
      : SUPPLIER_STATUS_VALUE_TO_LABEL[entity.spnvc_status],
})
