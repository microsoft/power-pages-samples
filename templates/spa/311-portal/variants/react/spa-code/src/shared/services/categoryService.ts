// src/shared/services/categoryService.ts
// Read-only service for the spa311_category Dataverse table.

import {
  powerPagesFetch,
  buildODataUrl,
  fetchAllPages,
  type ODataCollectionResponse,
  type PaginatedResult,
} from '../powerPagesApi'
import { type Category, type CategoryEntity, mapCategoryEntity } from '../../types/category'

// -- Select Columns -----------------------------------------------------------
// Always specify exact columns -- never use wildcards.

const CATEGORY_SELECT = [
  'spa311_categoryid',
  'spa311_name',
  'spa311_slug',
  'spa311_icon',
  'spa311_description',
].join(',')

// -- List Parameters ----------------------------------------------------------

export interface ListCategoriesParams {
  pageSize?: number
  nextLink?: string
  filter?: string
  orderBy?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listCategories = async (
  params?: ListCategoriesParams
): Promise<PaginatedResult<Category>> => {
  const pageSize = params?.pageSize ?? 50

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const url = params?.nextLink ?? buildODataUrl('spa311_categories', {
    '$select': CATEGORY_SELECT,
    '$orderby': params?.orderBy ?? 'spa311_name asc',
    '$count': 'true',
    '$top': String(pageSize),
    '$filter': params?.filter,
  })

  const response = await powerPagesFetch<ODataCollectionResponse<CategoryEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapCategoryEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- Get All Categories -------------------------------------------------------
// Fetches all categories using pagination. Suitable for dropdowns and filters
// where the full list is needed client-side.

export const getAllCategories = async (): Promise<Category[]> => {
  const url = buildODataUrl('spa311_categories', {
    '$select': CATEGORY_SELECT,
    '$orderby': 'spa311_name asc',
    '$top': '250',
  })

  const entities = await fetchAllPages<CategoryEntity>(url)
  return entities.map(mapCategoryEntity)
}

// -- Get by ID ----------------------------------------------------------------

export const getCategoryById = async (id: string): Promise<Category | null> => {
  const url = buildODataUrl(`spa311_categories(${id})`, {
    '$select': CATEGORY_SELECT,
  })

  try {
    const entity = await powerPagesFetch<CategoryEntity>(url)
    return entity ? mapCategoryEntity(entity) : null
  } catch {
    return null
  }
}
