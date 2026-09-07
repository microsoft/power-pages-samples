// src/shared/hooks/useCategories.ts
// React hooks for consuming category data from the Power Pages Web API.

import { useState, useEffect, useCallback } from 'react'
import { getAllCategories, getCategoryById } from '../services/categoryService'
import type { Category } from '../../types/category'

// -- useCategories ------------------------------------------------------------
// Fetches the full list of categories. Categories are a small, reference-data
// table so we fetch all records at once (suitable for sidebar filters, dropdowns).

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAllCategories()
      setCategories(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { categories, isLoading, error, refetch: fetchData }
}

// -- useCategory --------------------------------------------------------------
// Fetches a single category by its Dataverse record ID.

export function useCategory(id: string | undefined) {
  const [category, setCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) {
      setCategory(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getCategoryById(id)
      setCategory(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch category')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { category, isLoading, error, refetch: fetchData }
}
