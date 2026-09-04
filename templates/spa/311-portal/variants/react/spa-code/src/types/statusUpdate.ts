// src/types/statusUpdate.ts
// TypeScript types for the spa311_statusupdate Dataverse table.
//
// Operations: Create, Read (list by service request ID).
// No Update or Delete operations.
//
// NOTE: Column logical names are from the data model manifest. API metadata
// verification was not available at generation time -- names may need correction
// if Dataverse auto-generated different logical names.
// Navigation property name (spa311_ServiceRequestId) is assumed PascalCase per convention.

import type { RequestStatus } from './serviceRequest'
import { mapStatusFromPicklist, mapStatusToPicklist } from './serviceRequest'

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface StatusUpdateEntity {
  spa311_statusupdateid: string
  spa311_name?: string
  spa311_status?: number
  spa311_updatedate?: string
  spa311_note?: string
  // Lookup raw GUID (used in $select)
  _spa311_servicerequestid_value?: string
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Domain Type --------------------------------------------------------------
// Clean application type for UI consumption.
// The `status` field uses the shared RequestStatus union from serviceRequest.ts.

export interface StatusUpdate {
  id: string
  name: string
  status: RequestStatus
  date: string
  note: string
  serviceRequestId: string
  createdOn: string
}

// -- Input Type ---------------------------------------------------------------

export interface CreateStatusUpdateInput {
  name: string
  status: RequestStatus
  updateDate: string
  note: string
  serviceRequestId: string
}

// -- Entity-to-Domain Mapper --------------------------------------------------

export const mapStatusUpdateEntity = (entity: StatusUpdateEntity): StatusUpdate => ({
  id: entity.spa311_statusupdateid,
  name: entity.spa311_name ?? '',
  status: mapStatusFromPicklist(entity.spa311_status),
  date: entity.spa311_updatedate ?? entity.createdon ?? '',
  note: entity.spa311_note ?? '',
  serviceRequestId: entity._spa311_servicerequestid_value ?? '',
  createdOn: entity.createdon ?? '',
})

// Re-export mapStatusToPicklist for use by the service layer
export { mapStatusToPicklist }
