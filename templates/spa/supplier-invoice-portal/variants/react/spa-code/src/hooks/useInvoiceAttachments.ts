// src/hooks/useInvoiceAttachments.ts
// React hooks for the spnvc_invoiceattachment Dataverse table.

import { useState, useEffect, useCallback } from 'react'
import {
  listInvoiceAttachments,
  listAttachmentsByInvoice,
  getInvoiceAttachmentById,
  createInvoiceAttachment,
  createInvoiceAttachmentWithFile,
  deleteInvoiceAttachment,
  downloadAttachmentFile,
  uploadAttachmentFile,
  type InvoiceAttachmentListParams,
} from '../services/invoiceAttachmentService'
import type {
  InvoiceAttachment,
  CreateInvoiceAttachmentInput,
} from '../types/invoiceAttachment'
import type { PaginatedResult } from '../services/powerPagesApi'

// -- useInvoiceAttachments (list) ---------------------------------------------

export function useInvoiceAttachments(params?: InvoiceAttachmentListParams) {
  const [data, setData] = useState<PaginatedResult<InvoiceAttachment>>({
    items: [],
    totalCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize the dependency values to avoid infinite re-render loops
  const pageSize = params?.pageSize
  const filter = params?.filter
  const orderBy = params?.orderBy
  const invoiceId = params?.invoiceId
  const commentId = params?.commentId

  const fetchData = useCallback(async (overrides?: Partial<InvoiceAttachmentListParams>) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await listInvoiceAttachments({
        pageSize,
        filter,
        orderBy,
        invoiceId,
        commentId,
        ...overrides,
      })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attachments')
    } finally {
      setIsLoading(false)
    }
  }, [pageSize, filter, orderBy, invoiceId, commentId])

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

// -- useInvoiceAttachmentsByInvoice -------------------------------------------
// Convenience hook that filters attachments for a specific invoice.

export function useInvoiceAttachmentsByInvoice(
  invoiceId: string | undefined,
  params?: Omit<InvoiceAttachmentListParams, 'invoiceId' | 'filter'>,
) {
  const [data, setData] = useState<PaginatedResult<InvoiceAttachment>>({
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
      const result = await listAttachmentsByInvoice(invoiceId, {
        pageSize,
        orderBy,
      })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attachments')
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId, pageSize, orderBy])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

// -- useInvoiceAttachment (single record) -------------------------------------

export function useInvoiceAttachment(id: string | undefined) {
  const [attachment, setAttachment] = useState<InvoiceAttachment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) {
      setAttachment(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await getInvoiceAttachmentById(id)
      setAttachment(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attachment')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { attachment, isLoading, error, refetch: fetchData }
}

// -- useCreateInvoiceAttachment -----------------------------------------------

export function useCreateInvoiceAttachment() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (
    input: CreateInvoiceAttachmentInput,
    file?: Blob,
  ): Promise<InvoiceAttachment | null> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = file
        ? await createInvoiceAttachmentWithFile(input, file)
        : await createInvoiceAttachment(input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create attachment')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { create, isSubmitting, error }
}

// -- useDeleteInvoiceAttachment -----------------------------------------------

export function useDeleteInvoiceAttachment() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await deleteInvoiceAttachment(id)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attachment')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { remove, isSubmitting, error }
}

// -- useDownloadAttachmentFile ------------------------------------------------
// Hook for downloading the file blob from an attachment record.

export function useDownloadAttachmentFile() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async (id: string): Promise<string | null> => {
    setIsDownloading(true)
    setError(null)
    try {
      const objectUrl = await downloadAttachmentFile(id)
      return objectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file')
      return null
    } finally {
      setIsDownloading(false)
    }
  }, [])

  return { download, isDownloading, error }
}

// -- useUploadAttachmentFile --------------------------------------------------
// Hook for uploading a file to an existing attachment record.

export function useUploadAttachmentFile() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (
    id: string,
    file: Blob,
    fileName?: string,
  ): Promise<boolean> => {
    setIsUploading(true)
    setError(null)
    try {
      await uploadAttachmentFile(id, file, fileName)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      return false
    } finally {
      setIsUploading(false)
    }
  }, [])

  return { upload, isUploading, error }
}
