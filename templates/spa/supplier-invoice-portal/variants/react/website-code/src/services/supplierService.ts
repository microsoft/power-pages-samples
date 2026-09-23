// src/services/supplierService.ts
// Read service for the spnvc_supplier Dataverse table via Power Pages Web API.

import {
  powerPagesFetch,
  buildODataUrl,
  fetchAllPages,
} from './powerPagesApi'
import {
  type SupplierEntity,
  type Supplier,
  SUPPLIER_STATUS,
  mapSupplierEntity,
} from '../types/supplier'

// -- Constants ----------------------------------------------------------------

const ENTITY_SET = 'spnvc_suppliers'

const SUPPLIER_SELECT = [
  'spnvc_supplierid',
  'spnvc_name',
  'spnvc_email',
  'spnvc_status',
].join(',')

// -- List assignable suppliers ------------------------------------------------

/**
 * Returns suppliers that a purchase order can be assigned to, ordered by name.
 *
 * Only Active suppliers are selectable: Inactive and Suspended suppliers should
 * not receive new purchase orders, and Pending ones are not yet onboarded.
 */
export const listAssignableSuppliers = async (): Promise<Supplier[]> => {
  const url = buildODataUrl(ENTITY_SET, {
    '$select': SUPPLIER_SELECT,
    '$filter': `spnvc_status eq ${SUPPLIER_STATUS.Active}`,
    '$orderby': 'spnvc_name asc',
  })

  const entities = await fetchAllPages<SupplierEntity>(url)
  return entities.map(mapSupplierEntity)
}

// -- Get by ID ----------------------------------------------------------------

export const getSupplierById = async (id: string): Promise<Supplier | null> => {
  const url = buildODataUrl(`${ENTITY_SET}(${id})`, {
    '$select': SUPPLIER_SELECT,
  })

  try {
    const entity = await powerPagesFetch<SupplierEntity>(url)
    return entity ? mapSupplierEntity(entity) : null
  } catch (err) {
    console.error(`[supplierService] getSupplierById(${id}) failed:`, err)
    return null
  }
}
