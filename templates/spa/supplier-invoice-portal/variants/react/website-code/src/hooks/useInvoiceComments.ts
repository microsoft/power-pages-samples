// src/hooks/useInvoiceComments.ts
// React hooks for the spnvc_invoicecomment Dataverse table.

import { useState, useEffect, useCallback } from 'react'
import {
  listInvoiceComments,
  listCommentsByInvoiceId,
  getInvoiceCommentById,
  createInvoiceComment,
  type InvoiceCommentListParams,
} from '../services/invoiceCommentService'
import type {
  InvoiceComment,
  CreateInvoiceCommentInput,
} from '../types/invoiceComment'
import type { PaginatedResult } from '../services/powerPagesApi'

// -- useInvoiceComments (list) ------------------------------------------------

export function useInvoiceComments(params?: InvoiceCommentListParams) {
  const [data, setData] = useState<PaginatedResult<InvoiceComment>>({
    items: [],
    totalCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize the dependency values to avoid infinite re-render loops
  const pageSize = params?.pageSize
  const filter = params?.filter
  const orderBy = params?.orderBy

  const fetchData = useCallback(async (overrides?: Partial<InvoiceCommentListParams>) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await listInvoiceComments({
        pageSize,
        filter,
        orderBy,
        ...overrides,
      })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments')
    } finally {
      setIsLoading(false)
    }
  }, [pageSize, filter, orderBy])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchNextPage = useCallback(() => {
    if (data.nextLink) fetchData({ nextLink: data.nextLink })
  }, [data.nextLink, fetchData])

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchData,
    fetchNextPage,
  }
}

// -- useInvoiceCommentsByInvoice (list filtered by invoice ID) ----------------

export function useInvoiceCommentsByInvoice(
  invoiceId: string | undefined,
  params?: Omit<InvoiceCommentListParams, 'filter'>,
) {
  const [data, setData] = useState<PaginatedResult<InvoiceComment>>({
    items: [],
    totalCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pageSize = params?.pageSize
  const orderBy = params?.orderBy

  const fetchData = useCallback(async () => {
    if (!invoiceId) {
      setData({ items: [], totalCount: 0 })
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await listCommentsByInvoiceId(invoiceId, {
        pageSize,
        orderBy,
      })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments')
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId, pageSize, orderBy])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchNextPage = useCallback(async () => {
    if (!data.nextLink) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await listInvoiceComments({ nextLink: data.nextLink })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch next page')
    } finally {
      setIsLoading(false)
    }
  }, [data.nextLink])

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchData,
    fetchNextPage,
  }
}

// -- useInvoiceComment (single record) ----------------------------------------

export function useInvoiceComment(id: string | undefined) {
  const [comment, setComment] = useState<InvoiceComment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) {
      setComment(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await getInvoiceCommentById(id)
      setComment(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comment')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { comment, isLoading, error, refetch: fetchData }
}

// -- useCreateInvoiceComment --------------------------------------------------

export function useCreateInvoiceComment() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (
    input: CreateInvoiceCommentInput,
  ): Promise<InvoiceComment | null> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await createInvoiceComment(input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create comment')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { create, isSubmitting, error }
}
