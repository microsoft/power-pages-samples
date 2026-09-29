// src/hooks/useInvoices.ts
// React hooks for the spnvc_invoice Dataverse table.

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceCountByStatus,
  getInvoiceAmountStats,
  type InvoiceListParams,
} from '../services/invoiceService'
import type {
  Invoice,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceStatusLabel,
} from '../types/invoice'
import type { PaginatedResult } from '../services/powerPagesApi'

// -- useInvoices (list) -------------------------------------------------------

export function useInvoices(params?: InvoiceListParams) {
  const [data, setData] = useState<PaginatedResult<Invoice>>({
    items: [],
    totalCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize the dependency values to avoid infinite re-render loops
  const pageSize = params?.pageSize
  const filter = params?.filter
  const orderBy = params?.orderBy
  const search = params?.search

  const fetchData = useCallback(async (overrides?: Partial<InvoiceListParams>) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await listInvoices({
        pageSize,
        filter,
        orderBy,
        search,
        ...overrides,
      })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices')
    } finally {
      setIsLoading(false)
    }
  }, [pageSize, filter, orderBy, search])

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

// -- useInvoice (single record) -----------------------------------------------

export function useInvoice(id: string | undefined) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) {
      setInvoice(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await getInvoiceById(id)
      setInvoice(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { invoice, isLoading, error, refetch: fetchData }
}

// -- useCreateInvoice ---------------------------------------------------------

export function useCreateInvoice() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: CreateInvoiceInput): Promise<Invoice | null> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await createInvoice(input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { create, isSubmitting, error }
}

// -- useUpdateInvoice ---------------------------------------------------------

export function useUpdateInvoice() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (
    id: string,
    input: UpdateInvoiceInput,
  ): Promise<Invoice | null> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await updateInvoice(id, input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { update, isSubmitting, error }
}

// -- useDeleteInvoice ---------------------------------------------------------

export function useDeleteInvoice() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await deleteInvoice(id)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { remove, isSubmitting, error }
}

// -- useInvoiceCountByStatus --------------------------------------------------

export function useInvoiceCountByStatus() {
  const [counts, setCounts] = useState<
    Array<{ status: InvoiceStatusLabel; statusValue: number; count: number }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getInvoiceCountByStatus()
      setCounts(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status counts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Convenience: map of status label to count
  const countMap = useMemo(() => {
    const map: Partial<Record<InvoiceStatusLabel, number>> = {}
    for (const entry of counts) {
      map[entry.status] = entry.count
    }
    return map
  }, [counts])

  const totalCount = useMemo(
    () => counts.reduce((sum, entry) => sum + entry.count, 0),
    [counts],
  )

  return { counts, countMap, totalCount, isLoading, error, refetch: fetchData }
}

// -- useInvoiceAmountStats ----------------------------------------------------

export function useInvoiceAmountStats() {
  const [stats, setStats] = useState<{ total: number; avg: number }>({ total: 0, avg: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getInvoiceAmountStats()
      setStats(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch amount stats')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...stats, isLoading, error, refetch: fetchData }
}
