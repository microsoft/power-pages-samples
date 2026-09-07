// src/shared/services/serviceRequestService.ts
// CRUD service for the spa311_servicerequest Dataverse table.
//
// Operations: list (paginated), getById, getByRequestNumber, create, update, getCount.
// Delete is intentionally excluded per requirements.
//
// NOTE: Column logical names are from the data model manifest. API metadata
// verification was not available at generation time -- names may need correction
// if Dataverse auto-generated different logical names.
// Navigation property names (spa311_ServiceTypeId, spa311_CategoryId, spa311_ContactId)
// are assumed PascalCase per convention.

import {
  powerPagesFetch,
  powerPagesFetchResponse,
  extractRecordId,
  buildODataUrl,
  escapeODataString,
  type ODataCollectionResponse,
  type PaginatedResult,
} from '../powerPagesApi'
import {
  type ServiceRequest,
  type ServiceRequestEntity,
  type CreateServiceRequestInput,
  type UpdateServiceRequestInput,
  mapServiceRequestEntity,
  mapStatusToPicklist,
  mapUrgencyToPicklist,
} from '../../types/serviceRequest'

// -- Select Columns -----------------------------------------------------------
// Always specify exact columns -- never use wildcards.

const SERVICE_REQUEST_SELECT = [
  'spa311_servicerequestid',
  'spa311_requestnumber',
  'spa311_description',
  'spa311_address',
  'spa311_latitude',
  'spa311_longitude',
  'spa311_status',
  'spa311_urgency',
  'spa311_department',
  'spa311_dateobserved',
  '_spa311_servicetypeid_value',
  '_spa311_categoryid_value',
  '_spa311_contactid_value',
  'createdon',
  'modifiedon',
].join(',')

// Expand uses the Navigation Property (case-sensitive) to fetch related records.
const SERVICE_REQUEST_EXPAND = [
  'spa311_ServiceTypeId($select=spa311_servicetypeid,spa311_name,spa311_slug,spa311_icon)',
  'spa311_CategoryId($select=spa311_categoryid,spa311_name,spa311_slug,spa311_icon)',
].join(',')

// -- List Parameters ----------------------------------------------------------

export interface ListServiceRequestsParams {
  pageSize?: number
  nextLink?: string
  filter?: string
  orderBy?: string
  statusFilter?: string
  categoryFilter?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listServiceRequests = async (
  params?: ListServiceRequestsParams
): Promise<PaginatedResult<ServiceRequest>> => {
  const pageSize = params?.pageSize ?? 50

  // Build composite filter from convenience params + raw filter
  const filters: string[] = []
  if (params?.statusFilter) {
    filters.push(`spa311_status eq ${params.statusFilter}`)
  }
  if (params?.categoryFilter) {
    filters.push(`_spa311_categoryid_value eq ${params.categoryFilter}`)
  }
  if (params?.filter) {
    filters.push(params.filter)
  }
  const compositeFilter = filters.length > 0 ? filters.join(' and ') : undefined

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const url = params?.nextLink ?? buildODataUrl('spa311_servicerequests', {
    '$select': SERVICE_REQUEST_SELECT,
    '$expand': SERVICE_REQUEST_EXPAND,
    '$orderby': params?.orderBy ?? 'createdon desc',
    '$count': 'true',
    '$top': String(pageSize),
    '$filter': compositeFilter,
  })

  const response = await powerPagesFetch<ODataCollectionResponse<ServiceRequestEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapServiceRequestEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- Get by ID ----------------------------------------------------------------

export const getServiceRequestById = async (id: string): Promise<ServiceRequest | null> => {
  const url = buildODataUrl(`spa311_servicerequests(${id})`, {
    '$select': SERVICE_REQUEST_SELECT,
    '$expand': SERVICE_REQUEST_EXPAND,
  })

  try {
    const entity = await powerPagesFetch<ServiceRequestEntity>(url)
    return entity ? mapServiceRequestEntity(entity) : null
  } catch {
    return null
  }
}

// -- Get by Request Number ----------------------------------------------------
// Used on the Track page to look up a service request by its human-readable ID.

export const getServiceRequestByNumber = async (
  requestNumber: string
): Promise<ServiceRequest | null> => {
  const url = buildODataUrl('spa311_servicerequests', {
    '$select': SERVICE_REQUEST_SELECT,
    '$expand': SERVICE_REQUEST_EXPAND,
    '$filter': `spa311_requestnumber eq '${escapeODataString(requestNumber)}'`,
    '$top': '1',
    '$count': 'true',
  })

  try {
    const response = await powerPagesFetch<ODataCollectionResponse<ServiceRequestEntity>>(url)
    const entity = response?.value?.[0]
    return entity ? mapServiceRequestEntity(entity) : null
  } catch {
    return null
  }
}

// -- Create -------------------------------------------------------------------

export const createServiceRequest = async (
  input: CreateServiceRequestInput
): Promise<ServiceRequest> => {
  // Generate a request number: SR-YYYYMMDD-XXXXX
  const now = new Date()
  const datePart = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const randomPart = String(Math.floor(10000 + Math.random() * 90000))
  const requestNumber = `SR-${datePart}-${randomPart}`

  // Step 1: Create the record with scalar fields only (no lookup bindings).
  // Power Pages v2 has a known issue where appendto permission checks fail
  // for @odata.bind during POST, even when the permission is correctly set.
  // Store category/service type names in spa311_department as a workaround.
  const department = [input.categoryName, input.serviceTypeName].filter(Boolean).join(' > ') || ''

  const body: Record<string, unknown> = {
    spa311_requestnumber: requestNumber,
    spa311_description: input.description,
    spa311_address: input.address,
    spa311_status: 100000000, // Submitted
    spa311_urgency: mapUrgencyToPicklist(input.urgency),
    spa311_department: department,
  }

  // Round lat/lng to 6 decimal places (Dataverse Decimal column precision)
  if (input.latitude !== undefined) body.spa311_latitude = Math.round(input.latitude * 1e6) / 1e6
  if (input.longitude !== undefined) body.spa311_longitude = Math.round(input.longitude * 1e6) / 1e6
  if (input.dateObserved) body.spa311_dateobserved = input.dateObserved

  // NOTE: We intentionally do NOT associate the submitter's contact via
  // `spa311_ContactId@odata.bind`. That association requires AppendTo permission
  // on the contact table (error 90040101/90040106 otherwise), and nothing in the
  // app filters requests by contact -- tracking is done by request number. Keeping
  // the create to scalar fields only means it needs just Create on the request table.

  // Do NOT send `Prefer: return=representation`. That asks the Web API to return
  // every column of the created row, which Power Pages reports as
  // "Attribute * ... is not enabled for Web Api" (code 90040101) when field-level
  // Web API access is restricted. Instead we read the new record's ID from the
  // OData-EntityId response header and re-fetch with an explicit $select below.
  const response = await powerPagesFetchResponse('/_api/spa311_servicerequests', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const createdId = extractRecordId(response)

  if (createdId) {
    const created = await getServiceRequestById(createdId)
    if (created) return created
  }

  throw new Error('Failed to retrieve created service request -- no OData-EntityId header returned')
}

// -- Update -------------------------------------------------------------------

export const updateServiceRequest = async (
  id: string,
  input: UpdateServiceRequestInput
): Promise<ServiceRequest> => {
  const body: Record<string, unknown> = {}

  if (input.status !== undefined) body.spa311_status = mapStatusToPicklist(input.status)
  if (input.urgency !== undefined) body.spa311_urgency = mapUrgencyToPicklist(input.urgency)
  if (input.department !== undefined) body.spa311_department = input.department
  if (input.description !== undefined) body.spa311_description = input.description
  if (input.address !== undefined) body.spa311_address = input.address

  await powerPagesFetch(`/_api/spa311_servicerequests(${id})`, {
    method: 'PATCH',
    headers: { 'If-Match': '*' },
    body: JSON.stringify(body),
  })

  const updated = await getServiceRequestById(id)
  if (!updated) throw new Error('Failed to fetch updated service request')
  return updated
}

// -- Count (for stats) --------------------------------------------------------
// Returns the total count of service requests, optionally filtered.

export const getServiceRequestCount = async (filter?: string): Promise<number> => {
  const url = buildODataUrl('spa311_servicerequests', {
    '$select': 'spa311_servicerequestid',
    '$count': 'true',
    '$top': '1',
    '$filter': filter,
  })

  const response = await powerPagesFetch<ODataCollectionResponse<ServiceRequestEntity>>(url)
  return response?.['@odata.count'] ?? 0
}
