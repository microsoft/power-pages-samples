// src/services/supplierService.ts
// Read service for Supplier-category Accounts via Power Pages Web API.

import { buildFetchXmlUrl, fetchAllXmlPages, fetchXmlRecord, and, eq } from './fetchXmlApi'
import {
  type SupplierEntity,
  type Supplier,
  SUPPLIER_CATEGORY,
  ACCOUNT_STATE,
  isAssignableSupplierAccount,
  mapSupplierEntity,
} from '../types/supplier'

// -- Constants ----------------------------------------------------------------

const ENTITY_SET = 'accounts'

const SUPPLIER_SELECT = [
  'accountid',
  'name',
  'accountcategorycode',
  'statecode',
].join(',')

// -- List assignable suppliers ------------------------------------------------

/**
 * Returns suppliers that a purchase order can be assigned to, ordered by name.
 *
 * Both category and Account state are required; ordinary customer Accounts
 * must never be offered for supplier assignment.
 */
export const listAssignableSuppliers = async (): Promise<Supplier[]> => {
  const url = buildFetchXmlUrl(ENTITY_SET, {
    select: SUPPLIER_SELECT,
    filter: and(eq('accountcategorycode', SUPPLIER_CATEGORY), eq('statecode', ACCOUNT_STATE.Active)),
    orderBy: 'name asc',
    pageSize: 5000,
  })

  const entities = await fetchAllXmlPages<SupplierEntity>(url)
  return entities.filter(isAssignableSupplierAccount).map(mapSupplierEntity)
}

// -- Get by ID ----------------------------------------------------------------

export const getSupplierById = async (id: string): Promise<Supplier | null> => {
  const entity = await fetchXmlRecord<SupplierEntity>(ENTITY_SET, id, SUPPLIER_SELECT)
  return entity?.accountcategorycode === SUPPLIER_CATEGORY ? mapSupplierEntity(entity) : null
}

export const requireAssignableSupplier = async (id: string): Promise<void> => {
  const supplier = await getSupplierById(id)
  if (supplier?.status !== 'Active') {
    throw new Error('Select an accessible, active Supplier Account before assigning a purchase order.')
  }
}
