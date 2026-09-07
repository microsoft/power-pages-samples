// src/shared/services/statusUpdateService.ts
// Service for the spa311_statusupdate Dataverse table.
//
// Operations: Create, Read (list by service request ID).
// No Update or Delete operations.
//
// NOTE: Column logical names are from the data model manifest. API metadata
// verification was not available at generation time -- names may need correction
// if Dataverse auto-generated different logical names.
// Navigation property name (spa311_ServiceRequestId) is assumed PascalCase per convention.

import {
  powerPagesFetch,
  powerPagesFetchResponse,
  extractRecordId,
  buildODataUrl,
  bindLookup,
  type ODataCollectionResponse,
  type PaginatedResult,
} from '../powerPagesApi'
import {
  type StatusUpdate,
  type StatusUpdateEntity,
  type CreateStatusUpdateInput,
  mapStatusUpdateEntity,
  mapStatusToPicklist,
} from '../../types/statusUpdate'

// -- Select Columns -----------------------------------------------------------
// Always specify exact columns -- never use wildcards.

const STATUS_UPDATE_SELECT = [
  'spa311_statusupdateid',
  'spa311_name',
  'spa311_status',
  'spa311_updatedate',
  'spa311_note',
  '_spa311_servicerequestid_value',
  'createdon',
  'modifiedon',
].join(',')

// -- List by Service Request ID -----------------------------------------------
// Fetches all status updates for a given service request, ordered by updatedate ascending.

export const listStatusUpdatesByServiceRequest = async (
  serviceRequestId: string,
  pageSize = 50
): Promise<PaginatedResult<StatusUpdate>> => {
  const url = buildODataUrl('spa311_statusupdates', {
    '$select': STATUS_UPDATE_SELECT,
    '$filter': `_spa311_servicerequestid_value eq ${serviceRequestId}`,
    '$orderby': 'spa311_updatedate asc',
    '$count': 'true',
    '$top': String(pageSize),
  })

  const response = await powerPagesFetch<ODataCollectionResponse<StatusUpdateEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapStatusUpdateEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- Get by ID ----------------------------------------------------------------

export const getStatusUpdateById = async (id: string): Promise<StatusUpdate | null> => {
  const url = buildODataUrl(`spa311_statusupdates(${id})`, {
    '$select': STATUS_UPDATE_SELECT,
  })

  try {
    const entity = await powerPagesFetch<StatusUpdateEntity>(url)
    return entity ? mapStatusUpdateEntity(entity) : null
  } catch {
    return null
  }
}

// -- Create -------------------------------------------------------------------

export const createStatusUpdate = async (
  input: CreateStatusUpdateInput
): Promise<StatusUpdate> => {
  const body: Record<string, unknown> = {
    spa311_name: input.name,
    spa311_status: mapStatusToPicklist(input.status),
    spa311_updatedate: input.updateDate,
    spa311_note: input.note,
  }

  // Set the service request lookup using @odata.bind
  bindLookup(body, 'spa311_ServiceRequestId', 'spa311_servicerequests', input.serviceRequestId)

  // Do NOT send `Prefer: return=representation` -- requesting the full row back
  // triggers "Attribute * ... is not enabled for Web Api" (90040101) under
  // field-level Web API restrictions. Read the new ID from the OData-EntityId
  // header and re-fetch with an explicit $select instead.
  const response = await powerPagesFetchResponse('/_api/spa311_statusupdates', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const createdId = extractRecordId(response)
  if (createdId) {
    const created = await getStatusUpdateById(createdId)
    if (created) return created
  }

  throw new Error('Failed to retrieve created status update -- no OData-EntityId header returned')
}
