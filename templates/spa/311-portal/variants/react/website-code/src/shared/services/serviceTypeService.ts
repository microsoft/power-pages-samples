// src/shared/services/serviceTypeService.ts
// Read-only service for the spa311_servicetype Dataverse table.
//
// NOTE: Column logical names are from the data model manifest. API metadata
// verification was not available at generation time -- names may need correction
// if Dataverse auto-generated different logical names.
// Navigation property name spa311_CategoryId is assumed PascalCase per convention.

import {
  powerPagesFetch,
  buildODataUrl,
  escapeODataString,
  fetchAllPages,
  type ODataCollectionResponse,
  type PaginatedResult,
} from '../powerPagesApi'
import {
  type ServiceType,
  type ServiceTypeEntity,
  mapServiceTypeEntity,
} from '../../types/serviceType'

// -- Select Columns -----------------------------------------------------------
// Always specify exact columns -- never use wildcards.

const SERVICE_TYPE_SELECT = [
  'spa311_servicetypeid',
  'spa311_name',
  'spa311_slug',
  'spa311_icon',
  'spa311_description',
  'spa311_details',
  'spa311_whatyouneed',
  'spa311_eligibility',
  'spa311_targetsla',
  'spa311_sladays',
  '_spa311_categoryid_value',
  'createdon',
  'modifiedon',
].join(',')

// Expand uses the Navigation Property (case-sensitive) to fetch related category.
const SERVICE_TYPE_EXPAND =
  'spa311_CategoryId($select=spa311_categoryid,spa311_name,spa311_slug,spa311_icon,spa311_description)'

// -- List Parameters ----------------------------------------------------------

export interface ListServiceTypesParams {
  pageSize?: number
  nextLink?: string
  filter?: string
  orderBy?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listServiceTypes = async (
  params?: ListServiceTypesParams
): Promise<PaginatedResult<ServiceType>> => {
  const pageSize = params?.pageSize ?? 50

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const url = params?.nextLink ?? buildODataUrl('spa311_servicetypes', {
    '$select': SERVICE_TYPE_SELECT,
    '$expand': SERVICE_TYPE_EXPAND,
    '$orderby': params?.orderBy ?? 'spa311_name asc',
    '$count': 'true',
    '$top': String(pageSize),
    '$filter': params?.filter,
  })

  const response = await powerPagesFetch<ODataCollectionResponse<ServiceTypeEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapServiceTypeEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- Get All Service Types ----------------------------------------------------
// Fetches all service types using pagination. Suitable for search, dropdowns,
// and reference-data usage where the full list is needed client-side.

export const getAllServiceTypes = async (): Promise<ServiceType[]> => {
  const url = buildODataUrl('spa311_servicetypes', {
    '$select': SERVICE_TYPE_SELECT,
    '$expand': SERVICE_TYPE_EXPAND,
    '$orderby': 'spa311_name asc',
    '$top': '250',
  })

  const entities = await fetchAllPages<ServiceTypeEntity>(url)
  return entities.map(mapServiceTypeEntity)
}

// -- Get by ID ----------------------------------------------------------------

export const getServiceTypeById = async (id: string): Promise<ServiceType | null> => {
  const url = buildODataUrl(`spa311_servicetypes(${id})`, {
    '$select': SERVICE_TYPE_SELECT,
    '$expand': SERVICE_TYPE_EXPAND,
  })

  try {
    const entity = await powerPagesFetch<ServiceTypeEntity>(url)
    return entity ? mapServiceTypeEntity(entity) : null
  } catch {
    return null
  }
}

// -- Get by Slug --------------------------------------------------------------

export const getServiceTypeBySlug = async (slug: string): Promise<ServiceType | null> => {
  const url = buildODataUrl('spa311_servicetypes', {
    '$select': SERVICE_TYPE_SELECT,
    '$expand': SERVICE_TYPE_EXPAND,
    '$filter': `spa311_slug eq '${escapeODataString(slug)}'`,
    '$top': '1',
  })

  try {
    const response = await powerPagesFetch<ODataCollectionResponse<ServiceTypeEntity>>(url)
    const entity = response?.value?.[0]
    return entity ? mapServiceTypeEntity(entity) : null
  } catch {
    return null
  }
}

// -- Get by Category ----------------------------------------------------------
// Returns all service types that belong to a given category (by category GUID).

export const getServiceTypesByCategory = async (
  categoryId: string
): Promise<ServiceType[]> => {
  const url = buildODataUrl('spa311_servicetypes', {
    '$select': SERVICE_TYPE_SELECT,
    '$expand': SERVICE_TYPE_EXPAND,
    '$filter': `_spa311_categoryid_value eq ${categoryId}`,
    '$orderby': 'spa311_name asc',
    '$top': '250',
  })

  const entities = await fetchAllPages<ServiceTypeEntity>(url)
  return entities.map(mapServiceTypeEntity)
}
