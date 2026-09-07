// src/shared/hooks/useArticles.ts
// React hooks for consuming knowledge article data from the Power Pages Web API.

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAllArticles,
  getArticleBySlug,
  searchArticles as searchArticlesApi,
} from '../services/articleService'
import { useI18n } from '../../i18n'
import type { KnowledgeArticle } from '../../types/knowledgeArticle'
import { knowledgeArticles as localArticles } from '../../data/articles'
import { serviceTypes as localServiceTypes } from '../../data/categories'

// -- useArticles --------------------------------------------------------------
// Fetches the full list of published knowledge articles. Articles are a
// reference-data table so we fetch all records at once (suitable for the
// knowledge base listing, tag filtering, and client-side search).

export function useArticles() {
  const { language } = useI18n()
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAllArticles(language)
      setArticles(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch articles')
    } finally {
      setIsLoading(false)
    }
  }, [language])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // -- Derived helpers --------------------------------------------------------
  // These mirror the functions previously exported from the mock data module,
  // but now operate on the live data fetched from the API.

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    articles.forEach(a => a.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [articles])

  const getArticlesByTag = useCallback(
    (tag: string): KnowledgeArticle[] => {
      return articles.filter(a => a.tags.includes(tag))
    },
    [articles]
  )

  const filterArticles = useCallback(
    (query: string, activeTags: string[]): KnowledgeArticle[] => {
      return articles.filter(a => {
        if (activeTags.length > 0 && !activeTags.some(t => a.tags.includes(t))) return false
        if (query) {
          const q = query.toLowerCase()
          if (
            !a.title.toLowerCase().includes(q) &&
            !a.summary.toLowerCase().includes(q) &&
            !a.tags.some(t => t.includes(q))
          ) return false
        }
        return true
      })
    },
    [articles]
  )

  const searchArticlesLocal = useCallback(
    (query: string): KnowledgeArticle[] => {
      if (!query.trim()) return []
      const q = query.toLowerCase()
      return articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tags.some(t => t.includes(q))
      )
    },
    [articles]
  )

  return {
    articles,
    isLoading,
    error,
    refetch: fetchData,
    allTags,
    getArticlesByTag,
    filterArticles,
    searchArticles: searchArticlesLocal,
  }
}

// -- useArticleBySlug ---------------------------------------------------------
// Fetches a single knowledge article by its URL slug.

export function useArticleBySlug(slug: string | undefined) {
  const { language } = useI18n()
  const [article, setArticle] = useState<KnowledgeArticle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!slug) {
      setArticle(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getArticleBySlug(slug, language)
      setArticle(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch article')
    } finally {
      setIsLoading(false)
    }
  }, [slug, language])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { article, isLoading, error, refetch: fetchData }
}

// -- useArticleSearch ---------------------------------------------------------
// Server-side search for knowledge articles via the Web API.
// Use this when you need server-side filtering (e.g., large datasets).
// For client-side search on already-fetched data, use the searchArticles
// function returned by useArticles().

// -- useRelatedArticles -------------------------------------------------------
// Returns articles related to a given service type slug.
// Matches via relatedServiceTypeIds from local article data, then falls back
// to tag-based matching for Dataverse articles that lack this field.

export function useRelatedArticles(serviceSlug: string | undefined, maxResults = 3) {
  const { articles, isLoading } = useArticles()

  const related = useMemo(() => {
    if (!serviceSlug || articles.length === 0) return []

    // Resolve service slug to its id (they can differ, e.g. slug 'streetlight-outage' → id 'streetlight')
    const serviceId = localServiceTypes.find(s => s.slug === serviceSlug)?.id ?? serviceSlug

    // Build a set of article slugs that map to this service via local data
    const localMatchSlugs = new Set<string>()
    for (const la of localArticles) {
      if (la.relatedServiceTypeIds?.includes(serviceId)) {
        localMatchSlugs.add(la.slug)
      }
    }

    // Primary: match by relatedServiceTypeIds from local data
    if (localMatchSlugs.size > 0) {
      const matched = articles.filter(a => localMatchSlugs.has(a.slug))
      if (matched.length > 0) return matched.slice(0, maxResults)
    }

    // Fallback: match by tags containing the service slug or its parts
    const slugParts = serviceSlug.split('-')
    const tagMatched = articles.filter(a =>
      a.tags.some(tag =>
        tag === serviceSlug ||
        slugParts.some(part => part.length > 2 && tag.includes(part))
      )
    )
    return tagMatched.slice(0, maxResults)
  }, [articles, serviceSlug, maxResults])

  return { articles: related, isLoading }
}

// -- useArticleSearch ---------------------------------------------------------
// Server-side search for knowledge articles via the Web API.
// Use this when you need server-side filtering (e.g., large datasets).
// For client-side search on already-fetched data, use the searchArticles
// function returned by useArticles().

export function useArticleSearch(query: string, maxResults = 10) {
  const [results, setResults] = useState<KnowledgeArticle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    let cancelled = false

    const doSearch = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await searchArticlesApi(query, maxResults)
        if (!cancelled) setResults(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    // Debounce: wait 300ms before firing the API call
    const timer = setTimeout(doSearch, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, maxResults])

  return { results, isLoading, error }
}
