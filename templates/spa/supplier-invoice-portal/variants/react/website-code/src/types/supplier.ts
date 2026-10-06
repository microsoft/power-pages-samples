// src/types/supplier.ts
// Suppliers are businesses classified by the standard Account Category choice.

import choiceValues from '../../dataverse-choice-values.json'

// -- Raw OData Entity ---------------------------------------------------------

export interface SupplierEntity {
  accountid: string
  name?: string
  accountcategorycode?: number
  statecode?: number
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Supplier Status Option Set -----------------------------------------------

export const SUPPLIER_CATEGORY = choiceValues.tables.account.accountcategorycode.Supplier
export const ACCOUNT_STATE = Object.freeze({ Active: 0, Inactive: 1 })
export type SupplierStatusLabel = keyof typeof ACCOUNT_STATE

export const isAssignableSupplierAccount = (entity: SupplierEntity): boolean =>
  entity.accountcategorycode === SUPPLIER_CATEGORY && entity.statecode === ACCOUNT_STATE.Active

// -- Clean Domain Type --------------------------------------------------------

export interface Supplier {
  id: string
  name: string
  status: SupplierStatusLabel | undefined
}

// -- Mapper -------------------------------------------------------------------

export const mapSupplierEntity = (entity: SupplierEntity): Supplier => ({
  id: entity.accountid,
  name: entity.name ?? '',
  status: entity.statecode === ACCOUNT_STATE.Active
    ? 'Active'
    : entity.statecode === ACCOUNT_STATE.Inactive ? 'Inactive' : undefined,
})
