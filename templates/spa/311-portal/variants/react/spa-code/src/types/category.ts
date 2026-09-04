// src/types/category.ts
// TypeScript types for the spa311_category Dataverse table.

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly (verified against API metadata).

export interface CategoryEntity {
  spa311_categoryid: string
  spa311_name?: string
  spa311_slug?: string
  spa311_icon?: string
  spa311_description?: string
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Domain Type --------------------------------------------------------------
// Clean application type for UI consumption.

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description: string
}

// -- Entity-to-Domain Mapper --------------------------------------------------

export const mapCategoryEntity = (entity: CategoryEntity): Category => ({
  id: entity.spa311_categoryid,
  name: entity.spa311_name ?? '',
  slug: entity.spa311_slug ?? '',
  icon: entity.spa311_icon ?? '',
  description: entity.spa311_description ?? '',
})
