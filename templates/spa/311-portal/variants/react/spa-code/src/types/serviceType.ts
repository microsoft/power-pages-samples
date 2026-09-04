// src/types/serviceType.ts
// TypeScript types for the spa311_servicetype Dataverse table.
//
// NOTE: Column logical names are from the data model manifest. API metadata
// verification was not available at generation time -- names may need correction
// if Dataverse auto-generated different logical names.

import { getFormattedValue } from '../shared/powerPagesApi'
import type { Category, CategoryEntity } from './category'

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface ServiceTypeEntity {
  spa311_servicetypeid: string
  spa311_name?: string
  spa311_slug?: string
  spa311_icon?: string
  spa311_description?: string
  spa311_details?: string
  spa311_whatyouneed?: string
  spa311_eligibility?: string
  spa311_targetsla?: string
  spa311_sladays?: number
  // Lookup raw value -- the GUID of the related category record
  _spa311_categoryid_value?: string
  // Expanded navigation property (when $expand is used)
  spa311_CategoryId?: CategoryEntity
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Domain Type --------------------------------------------------------------
// Clean application type for UI consumption.

export interface ServiceType {
  id: string
  name: string
  slug: string
  icon: string
  description: string
  details: string
  whatYouNeed: string[]
  eligibility: string
  targetSLA: string
  slaDays: number
  categoryId: string
  categoryName: string
  category?: Category
}

// -- Entity-to-Domain Mapper --------------------------------------------------

/**
 * Parse the whatyouneed Memo column into an array of strings.
 * The Dataverse Memo field stores this as a newline-delimited or
 * JSON array string. We handle both formats gracefully.
 */
const parseWhatYouNeed = (raw?: string): string[] => {
  if (!raw) return []

  // Try JSON array first
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // Not JSON -- fall through to line-based parsing
  }

  // Split by newlines, trim, and filter empty lines
  return raw
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

export const mapServiceTypeEntity = (entity: ServiceTypeEntity): ServiceType => ({
  id: entity.spa311_servicetypeid,
  name: entity.spa311_name ?? '',
  slug: entity.spa311_slug ?? '',
  icon: entity.spa311_icon ?? '',
  description: entity.spa311_description ?? '',
  details: entity.spa311_details ?? '',
  whatYouNeed: parseWhatYouNeed(entity.spa311_whatyouneed),
  eligibility: entity.spa311_eligibility ?? '',
  targetSLA: entity.spa311_targetsla ?? '',
  slaDays: entity.spa311_sladays ?? 0,
  categoryId: entity._spa311_categoryid_value ?? '',
  categoryName:
    getFormattedValue(entity, '_spa311_categoryid_value') ??
    entity.spa311_CategoryId?.spa311_name ??
    '',
  category: entity.spa311_CategoryId
    ? {
        id: entity.spa311_CategoryId.spa311_categoryid,
        name: entity.spa311_CategoryId.spa311_name ?? '',
        slug: entity.spa311_CategoryId.spa311_slug ?? '',
        icon: entity.spa311_CategoryId.spa311_icon ?? '',
        description: entity.spa311_CategoryId.spa311_description ?? '',
      }
    : undefined,
})
