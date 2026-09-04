// src/shared/services/articleService.ts
// Read-only service for the knowledgearticle Dataverse table.
//
// Knowledge Articles use statecode eq 3 (Published) to filter only published articles.
// The entity set name is "knowledgearticles" (standard Dataverse table).
//
// NOTE: Column logical names are from the data model manifest. API metadata
// verification was not available at generation time -- names may need correction
// if Dataverse auto-generated different logical names.

import {
  powerPagesFetch,
  buildODataUrl,
  escapeODataString,
  fetchAllPages,
  type ODataCollectionResponse,
  type PaginatedResult,
} from '../powerPagesApi'
import {
  type KnowledgeArticle,
  type KnowledgeArticleEntity,
  mapKnowledgeArticleEntity,
} from '../../types/knowledgeArticle'
import { knowledgeArticles as localArticlesEn } from '../../data/articles'
import { knowledgeArticlesFr as localArticlesFr } from '../../data/articles-fr'
import type { Language } from '../../i18n'

const getLocalArticles = (lang: Language): KnowledgeArticle[] =>
  lang === 'fr' ? localArticlesFr : localArticlesEn

// -- Select Columns -----------------------------------------------------------
// Always specify exact columns -- never use wildcards.

const ARTICLE_SELECT = [
  'knowledgearticleid',
  'title',
  'content',
  'keywords',
  'spa311_slug',
  'spa311_summary',
  'spa311_publishedon',
  'statecode',
  'createdon',
  'modifiedon',
].join(',')

// -- Published Filter ---------------------------------------------------------
// Knowledge Articles must be filtered by statecode eq 3 to only get published articles.

const PUBLISHED_FILTER = 'statecode eq 3'

/**
 * Combine the published filter with an optional additional filter.
 */
const withPublishedFilter = (additionalFilter?: string): string => {
  if (!additionalFilter) return PUBLISHED_FILTER
  return `${PUBLISHED_FILTER} and (${additionalFilter})`
}

// -- List Parameters ----------------------------------------------------------

export interface ListArticlesParams {
  pageSize?: number
  nextLink?: string
  filter?: string
  orderBy?: string
  search?: string
}

// -- List (paginated) ---------------------------------------------------------

export const listArticles = async (
  params?: ListArticlesParams
): Promise<PaginatedResult<KnowledgeArticle>> => {
  const pageSize = params?.pageSize ?? 50

  // Build a filter combining the published check with optional search
  let filter = params?.filter
  if (params?.search) {
    const escaped = escapeODataString(params.search)
    const searchFilter = `(contains(title,'${escaped}') or contains(spa311_summary,'${escaped}') or contains(keywords,'${escaped}'))`
    filter = filter ? `${filter} and ${searchFilter}` : searchFilter
  }

  // If we have a nextLink from a previous response, use it directly.
  // Dataverse does NOT support $skip -- pagination uses @odata.nextLink cursors.
  const url = params?.nextLink ?? buildODataUrl('knowledgearticles', {
    '$select': ARTICLE_SELECT,
    '$orderby': params?.orderBy ?? 'spa311_publishedon desc',
    '$count': 'true',
    '$top': String(pageSize),
    '$filter': withPublishedFilter(filter),
  })

  const response = await powerPagesFetch<ODataCollectionResponse<KnowledgeArticleEntity>>(url)

  return {
    items: (response?.value ?? []).map(mapKnowledgeArticleEntity),
    totalCount: response?.['@odata.count'] ?? response?.value?.length ?? 0,
    nextLink: response?.['@odata.nextLink'],
  }
}

// -- Get All Articles ---------------------------------------------------------
// Fetches all published articles using pagination. Suitable for search,
// knowledge base views, and tag aggregation where the full list is needed
// client-side.

export const getAllArticles = async (lang: Language = 'en'): Promise<KnowledgeArticle[]> => {
  const url = buildODataUrl('knowledgearticles', {
    '$select': ARTICLE_SELECT,
    '$orderby': 'spa311_publishedon desc',
    '$top': '250',
    '$filter': PUBLISHED_FILTER,
  })

  try {
    const entities = await fetchAllPages<KnowledgeArticleEntity>(url)
    if (entities.length > 0) return entities.map(mapKnowledgeArticleEntity)
  } catch { /* API unavailable — fall through to local data */ }

  // Fallback: if no Dataverse articles for this language, try English from API
  if (lang !== 'en') {
    try {
      const enUrl = buildODataUrl('knowledgearticles', {
        '$select': ARTICLE_SELECT,
        '$orderby': 'spa311_publishedon desc',
        '$top': '250',
        '$filter': PUBLISHED_FILTER,
      })
      const entities = await fetchAllPages<KnowledgeArticleEntity>(enUrl)
      if (entities.length > 0) return entities.map(mapKnowledgeArticleEntity)
    } catch { /* fall through */ }
  }

  // Final fallback: local static articles
  return getLocalArticles(lang)
}

// -- Get by ID ----------------------------------------------------------------

export const getArticleById = async (id: string): Promise<KnowledgeArticle | null> => {
  const url = buildODataUrl(`knowledgearticles(${id})`, {
    '$select': ARTICLE_SELECT,
  })

  try {
    const entity = await powerPagesFetch<KnowledgeArticleEntity>(url)
    return entity ? mapKnowledgeArticleEntity(entity) : null
  } catch {
    return null
  }
}

// -- Get by Slug --------------------------------------------------------------

export const getArticleBySlug = async (slug: string, lang: Language = 'en'): Promise<KnowledgeArticle | null> => {
  const slugFilter = `spa311_slug eq '${escapeODataString(slug)}'`
  const url = buildODataUrl('knowledgearticles', {
    '$select': ARTICLE_SELECT,
    '$filter': withPublishedFilter(slugFilter),
    '$top': '1',
  })

  try {
    const response = await powerPagesFetch<ODataCollectionResponse<KnowledgeArticleEntity>>(url)
    const entity = response?.value?.[0]
    if (entity) return mapKnowledgeArticleEntity(entity)
  } catch { /* fall through */ }

  // Fallback: try English from API if we were looking for French
  if (lang !== 'en') {
    try {
      const enUrl = buildODataUrl('knowledgearticles', {
        '$select': ARTICLE_SELECT,
        '$filter': withPublishedFilter(`spa311_slug eq '${escapeODataString(slug)}'`),
        '$top': '1',
      })
      const response = await powerPagesFetch<ODataCollectionResponse<KnowledgeArticleEntity>>(enUrl)
      const entity = response?.value?.[0]
      if (entity) return mapKnowledgeArticleEntity(entity)
    } catch { /* fall through */ }
  }

  // Final fallback: local static articles
  return getLocalArticles(lang).find(a => a.slug === slug) ?? null
}

// -- Search Articles ----------------------------------------------------------
// Searches published articles by title, summary, and keywords using OData
// contains() filters.

export const searchArticles = async (
  query: string,
  maxResults = 10
): Promise<KnowledgeArticle[]> => {
  if (!query.trim()) return []

  const escaped = escapeODataString(query.trim())
  const searchFilter = `(contains(title,'${escaped}') or contains(spa311_summary,'${escaped}') or contains(keywords,'${escaped}'))`

  const url = buildODataUrl('knowledgearticles', {
    '$select': ARTICLE_SELECT,
    '$filter': withPublishedFilter(searchFilter),
    '$orderby': 'spa311_publishedon desc',
    '$top': String(maxResults),
    '$count': 'true',
  })

  const response = await powerPagesFetch<ODataCollectionResponse<KnowledgeArticleEntity>>(url)
  return (response?.value ?? []).map(mapKnowledgeArticleEntity)
}
