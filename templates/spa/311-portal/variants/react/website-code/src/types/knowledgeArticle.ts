// src/types/knowledgeArticle.ts
// TypeScript types for the knowledgearticle Dataverse table.
//
// The bundled solution uses the standard Dataverse Knowledge Article columns.
// Article public numbers provide stable links without requiring a custom slug column.

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface KnowledgeArticleEntity {
  knowledgearticleid: string
  title?: string
  content?: string
  keywords?: string
  articlepublicnumber?: string
  description?: string
  publishon?: string
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
  slug: entity.articlepublicnumber || entity.knowledgearticleid,
  summary: entity.description ?? '',
  content: entity.content ?? '',
  tags: parseKeywords(entity.keywords),
  publishedAt: entity.publishon ?? entity.createdon ?? new Date().toISOString(),
})
