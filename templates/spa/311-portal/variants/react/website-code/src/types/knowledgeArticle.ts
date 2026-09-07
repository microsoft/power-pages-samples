// src/types/knowledgeArticle.ts
// TypeScript types for the knowledgearticle Dataverse table.
//
// The knowledgearticle table is a standard Dataverse table with custom columns
// added under the spa311 publisher prefix. Standard columns (knowledgearticleid,
// title, content, keywords) use their built-in logical names. Custom columns
// (spa311_slug, spa311_summary, spa311_publishedon) use the publisher prefix.
//
// NOTE: Column logical names are from the data model manifest. API metadata
// verification was not available at generation time -- names may need correction
// if Dataverse auto-generated different logical names.

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface KnowledgeArticleEntity {
  knowledgearticleid: string
  title?: string
  content?: string
  keywords?: string
  spa311_slug?: string
  spa311_summary?: string
  spa311_publishedon?: string
  statecode?: number
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Domain Type --------------------------------------------------------------
// Clean application type for UI consumption.

export interface KnowledgeArticle {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  tags: string[]
  publishedAt: string
}

// -- Entity-to-Domain Mapper --------------------------------------------------

/**
 * Parse the keywords column (comma-separated string) into an array of tags.
 * Trims whitespace and filters out empty strings.
 */
const parseKeywords = (keywords?: string): string[] => {
  if (!keywords) return []
  return keywords
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
}

export const mapKnowledgeArticleEntity = (
  entity: KnowledgeArticleEntity
): KnowledgeArticle => ({
  id: entity.knowledgearticleid,
  title: entity.title ?? '',
  slug: entity.spa311_slug ?? '',
  summary: entity.spa311_summary ?? '',
  content: entity.content ?? '',
  tags: parseKeywords(entity.keywords),
  publishedAt: entity.spa311_publishedon ?? entity.createdon ?? new Date().toISOString(),
})
