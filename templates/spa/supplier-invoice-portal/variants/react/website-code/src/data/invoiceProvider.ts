/**
 * Data provider that switches between mock data (localhost) and live Dataverse API.
 * Components import from here instead of mockData.ts or hooks directly.
 */

import { useState, useEffect, useCallback } from 'react'
import type { InvoiceStatus, StatusHistoryEntry, Attachment, Comment } from '../types'
import type { Invoice as ApiInvoice, InvoiceStatusLabel } from '../types/invoice'
import type { InvoiceComment as ApiComment } from '../types/invoiceComment'
import type { InvoiceAttachment as ApiAttachment } from '../types/invoiceAttachment'
import { getCurrentUser } from '../services/authService'

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// ── Unified types for components ──

export interface InvoiceItem {
  id: string
  invoiceNumber: string
  poNumber: string
  amount: number
  status: InvoiceStatus
  submissionDate: string
  dueDate: string
  description: string
  company: string
  contactId?: string
  purchaseOrderId?: string
  statusHistory: StatusHistoryEntry[]
  attachments: Attachment[]
  comments: Comment[]
}

export interface CommentItem {
  id: string
  author: string
  authorInitials: string
  date: string
  text: string
  linkedAction?: string
  attachments?: Attachment[]
}

// ── Format helpers ──

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Mappers: API types → component types ──

function apiInvoiceToItem(inv: ApiInvoice): InvoiceItem {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    poNumber: inv.poNumber,
    amount: inv.amount,
    status: inv.status as InvoiceStatus,
    submissionDate: inv.submissionDate,
    dueDate: inv.dueDate,
    description: inv.description,
    company: inv.supplierName || inv.contactName || '',
    contactId: inv.contactId,
    purchaseOrderId: inv.purchaseOrderId,
    statusHistory: [],
    attachments: [],
    comments: [],
  }
}

function apiCommentToItem(c: ApiComment, attachments?: ApiAttachment[]): CommentItem {
  const name = c.authorName || 'System'
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  // Find attachments linked to this comment
  const commentAttachments = attachments
    ?.filter(a => a.commentId === c.id)
    .map(apiAttachmentToUi)
  return {
    id: c.id,
    author: name,
    authorInitials: initials,
    date: c.createdOn,
    text: c.commentText,
    linkedAction: c.linkedAction || undefined,
    attachments: commentAttachments,
  }
}

function apiAttachmentToUi(a: ApiAttachment): Attachment {
  return {
    id: a.id,
    name: a.fileName,
    size: a.fileSize,
    type: a.fileType,
  }
}

// ── Hooks ──

interface UseInvoiceListResult {
  invoices: InvoiceItem[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useInvoiceList(params?: {
  status?: string
  search?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}): UseInvoiceListResult {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const status = params?.status
  const search = params?.search
  const sortKey = params?.sortKey || 'submissionDate'
  const sortDir = params?.sortDir || 'desc'
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    if (isDevelopment) {
      // Use mock data
      const { invoices: mockInvoices } = await import('./mockData')
      let list = [...mockInvoices]

      if (status && status !== 'All') {
        list = list.filter(i => i.status === status)
      }
      if (search) {
        const q = search.toLowerCase()
        list = list.filter(i =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.poNumber.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
        )
      }

      // Sort
      const fieldMap: Record<string, keyof typeof list[0]> = {
        invoiceNumber: 'invoiceNumber',
        poNumber: 'poNumber',
        amount: 'amount',
        status: 'status',
        submissionDate: 'submissionDate',
        dueDate: 'dueDate',
      }
      const field = fieldMap[sortKey] || 'submissionDate'
      list.sort((a, b) => {
        const aVal = a[field]
        const bVal = b[field]
        let cmp = 0
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal
        } else {
          cmp = String(aVal).localeCompare(String(bVal))
        }
        return sortDir === 'asc' ? cmp : -cmp
      })

      const total = list.length
      const start = (page - 1) * pageSize
      const paged = list.slice(start, start + pageSize)

      setInvoices(paged.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        poNumber: i.poNumber,
        amount: i.amount,
        status: i.status,
        submissionDate: i.submissionDate,
        dueDate: i.dueDate,
        description: i.description,
        company: i.company,
        statusHistory: i.statusHistory || [],
        attachments: i.attachments || [],
        comments: i.comments || [],
      })))
      setTotalCount(total)
      setIsLoading(false)
      return
    }

    // Live API
    try {
      const { listInvoices } = await import('../services/invoiceService')

      const sortFieldMap: Record<string, string> = {
        invoiceNumber: 'spnvc_name',
        poNumber: 'spnvc_ponumber',
        amount: 'spnvc_amount',
        status: 'spnvc_invoicestatus',
        submissionDate: 'spnvc_submissiondate',
        dueDate: 'spnvc_duedate',
      }

      let filter: string | undefined
      if (status && status !== 'All') {
        const { INVOICE_STATUS } = await import('../types/invoice')
        const statusVal = INVOICE_STATUS[status as InvoiceStatusLabel]
        if (statusVal) filter = `spnvc_invoicestatus eq ${statusVal}`
      }

      const result = await listInvoices({
        pageSize,
        filter,
        search: search || undefined,
        orderBy: `${sortFieldMap[sortKey] || 'spnvc_submissiondate'} ${sortDir}`,
      })

      setInvoices(result.items.map(apiInvoiceToItem))
      setTotalCount(result.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices')
    } finally {
      setIsLoading(false)
    }
  }, [status, search, sortKey, sortDir, page, pageSize])

  useEffect(() => { fetchData() }, [fetchData])

  return { invoices, totalCount, isLoading, error, refetch: fetchData }
}

// ── Single invoice ──

export function useInvoiceDetail(id: string | undefined) {
  const [invoice, setInvoice] = useState<InvoiceItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) { setInvoice(null); setIsLoading(false); return }
    setIsLoading(true)
    setError(null)

    if (isDevelopment) {
      const { getInvoiceById } = await import('./mockData')
      const mock = getInvoiceById(id)
      if (mock) {
        setInvoice({
          id: mock.id,
          invoiceNumber: mock.invoiceNumber,
          poNumber: mock.poNumber,
          amount: mock.amount,
          status: mock.status,
          submissionDate: mock.submissionDate,
          dueDate: mock.dueDate,
          description: mock.description,
          company: mock.company,
          statusHistory: mock.statusHistory || [],
          attachments: mock.attachments || [],
          comments: mock.comments || [],
        })
      } else {
        setInvoice(null)
      }
      setIsLoading(false)
      return
    }

    try {
      const [
        { getInvoiceById: getApi },
        { listCommentsByInvoiceId },
        { listAttachmentsByInvoice },
      ] = await Promise.all([
        import('../services/invoiceService'),
        import('../services/invoiceCommentService'),
        import('../services/invoiceAttachmentService'),
      ])

      const [invoiceResult, commentsResult, attachmentsResult] = await Promise.all([
        getApi(id),
        listCommentsByInvoiceId(id).catch(() => ({ items: [] as ApiComment[], totalCount: 0 })),
        listAttachmentsByInvoice(id).catch(() => ({ items: [] as ApiAttachment[], totalCount: 0 })),
      ])

      if (invoiceResult) {
        const item = apiInvoiceToItem(invoiceResult)
        // Merge comments with their linked attachments
        item.comments = commentsResult.items.map(c => {
          const mapped = apiCommentToItem(c, attachmentsResult.items)
          return {
            id: mapped.id,
            author: mapped.author,
            authorInitials: mapped.authorInitials,
            date: mapped.date,
            text: mapped.text,
            linkedAction: mapped.linkedAction,
            attachments: mapped.attachments,
          }
        })
        // All attachments for the "Attached Documents" section
        item.attachments = attachmentsResult.items.map(apiAttachmentToUi)
        setInvoice(item)
      } else {
        setInvoice(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  return { invoice, isLoading, error, refetch: fetchData }
}

// ── Dashboard metrics ──

export function useDashboardMetrics(isReviewer = false) {
  const [metrics, setMetrics] = useState({
    total: 0,
    needsRevision: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    totalPaid: 0,
    totalProcessed: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    if (isDevelopment) {
      const { invoices } = await import('./mockData')
      if (isReviewer) {
        const submitted = invoices.filter(i => i.status === 'Submitted').length
        const approved = invoices.filter(i => i.status === 'Approved').length
        const rejected = invoices.filter(i => i.status === 'Rejected').length
        setMetrics({
          total: invoices.length,
          needsRevision: 0,
          pendingReview: submitted,
          approved,
          rejected,
          totalPaid: 0,
          totalProcessed: approved + rejected + invoices.filter(i => i.status === 'Paid').length,
        })
      } else {
        setMetrics({
          total: invoices.length,
          needsRevision: invoices.filter(i => i.status === 'Needs Revision').length,
          pendingReview: invoices.filter(i => i.status === 'Submitted' || i.status === 'Under Review').length,
          approved: invoices.filter(i => i.status === 'Approved').length,
          rejected: 0,
          totalPaid: invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0),
          totalProcessed: 0,
        })
      }
      setIsLoading(false)
      return
    }

    try {
      const { getInvoiceCountByStatus, getInvoiceAmountStats } = await import('../services/invoiceService')
      const [counts, stats] = await Promise.all([getInvoiceCountByStatus(), getInvoiceAmountStats()])
      const countMap: Record<string, number> = {}
      let total = 0
      for (const entry of counts) {
        countMap[entry.status] = entry.count
        total += entry.count
      }
      if (isReviewer) {
        const approved = countMap['Approved'] || 0
        const rejected = countMap['Rejected'] || 0
        const paid = countMap['Paid'] || 0
        setMetrics({
          total,
          needsRevision: 0,
          pendingReview: countMap['Submitted'] || 0,
          approved,
          rejected,
          totalPaid: 0,
          totalProcessed: approved + rejected + paid,
        })
      } else {
        setMetrics({
          total,
          needsRevision: countMap['Needs Revision'] || 0,
          pendingReview: (countMap['Submitted'] || 0) + (countMap['Under Review'] || 0),
          approved: countMap['Approved'] || 0,
          rejected: 0,
          totalPaid: stats.total,
          totalProcessed: 0,
        })
      }
    } catch {
      // Silently fall back to zeros
    } finally {
      setIsLoading(false)
    }
  }, [isReviewer])

  useEffect(() => { fetchData() }, [fetchData])

  return { metrics, isLoading, refetch: fetchData }
}

// ── Recent invoices (Dashboard) ──

export function useRecentInvoices(count = 5, isReviewer = false) {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    if (isDevelopment) {
      const { invoices: mockInvoices } = await import('./mockData')
      let list = [...mockInvoices]
      if (isReviewer) {
        // Reviewer sees submitted invoices first (FIFO queue), then Under Review
        list = list.filter(i => i.status === 'Submitted' || i.status === 'Under Review')
        list.sort((a, b) => {
          // Submitted before Under Review
          if (a.status === 'Submitted' && b.status !== 'Submitted') return -1
          if (a.status !== 'Submitted' && b.status === 'Submitted') return 1
          // Within same status, oldest first
          return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime()
        })
      }
      setInvoices(list.slice(0, count).map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        poNumber: i.poNumber,
        amount: i.amount,
        status: i.status,
        submissionDate: i.submissionDate,
        dueDate: i.dueDate,
        description: i.description,
        company: i.company,
        statusHistory: i.statusHistory || [],
        attachments: i.attachments || [],
        comments: i.comments || [],
      })))
      setIsLoading(false)
      return
    }

    try {
      const { listInvoices } = await import('../services/invoiceService')
      if (isReviewer) {
        const { INVOICE_STATUS } = await import('../types/invoice')
        const result = await listInvoices({
          pageSize: count,
          filter: `spnvc_invoicestatus eq ${INVOICE_STATUS['Submitted']} or spnvc_invoicestatus eq ${INVOICE_STATUS['Under Review']}`,
          orderBy: 'spnvc_submissiondate asc',
        })
        setInvoices(result.items.map(apiInvoiceToItem))
      } else {
        const result = await listInvoices({
          pageSize: count,
          orderBy: 'spnvc_submissiondate desc',
        })
        setInvoices(result.items.map(apiInvoiceToItem))
      }
    } catch {
      // Empty on error
    } finally {
      setIsLoading(false)
    }
  }, [count, isReviewer])

  useEffect(() => { fetchData() }, [fetchData])

  return { invoices, isLoading }
}

// ── Create invoice ──

export function useCreateInvoiceAction() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (data: {
    poNumber: string
    amount: number
    dueDate: string
    description: string
    files?: { file: File; name: string; size: string }[]
  }): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)

    if (isDevelopment) {
      // Simulate submission
      await new Promise(r => setTimeout(r, 1000))
      setIsSubmitting(false)
      return true
    }

    try {
      const { createInvoice } = await import('../services/invoiceService')
      const user = getCurrentUser()
      const invoice = await createInvoice({
        invoiceNumber: `INV-${Date.now()}`,
        poNumber: data.poNumber,
        amount: data.amount,
        dueDate: data.dueDate,
        description: data.description,
        status: 'Submitted',
        submissionDate: new Date().toISOString(),
        contactId: user?.contactId,
      })

      // Upload attached files to the newly created invoice
      if (data.files?.length) {
        const { createInvoiceAttachmentWithFile } = await import('../services/invoiceAttachmentService')
        await Promise.all(data.files.map(f =>
          createInvoiceAttachmentWithFile(
            {
              fileName: f.name,
              fileSize: f.size,
              fileType: f.file.type,
              invoiceId: invoice.id,
              contactId: user?.contactId,
            },
            f.file,
          )
        ))
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { submit, isSubmitting, error }
}

// ── Update invoice ──

export function useUpdateInvoiceAction() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (id: string, data: {
    poNumber?: string
    amount?: number
    dueDate?: string
    description?: string
    status?: InvoiceStatusLabel
  }): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)

    if (isDevelopment) {
      await new Promise(r => setTimeout(r, 500))
      setIsSubmitting(false)
      return true
    }

    try {
      const { updateInvoice } = await import('../services/invoiceService')
      await updateInvoice(id, {
        poNumber: data.poNumber,
        amount: data.amount,
        dueDate: data.dueDate,
        description: data.description,
        status: data.status,
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { update, isSubmitting, error }
}

// ── Comments by invoice ──

export function useCommentsByInvoice(invoiceId: string | undefined) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!invoiceId) { setComments([]); setIsLoading(false); return }
    setIsLoading(true)

    if (isDevelopment) {
      const { getInvoiceById } = await import('./mockData')
      const invoice = getInvoiceById(invoiceId)
      setComments((invoice?.comments || []).map(c => ({
        id: c.id,
        author: c.author,
        authorInitials: c.authorInitials,
        date: c.date,
        text: c.text,
        linkedAction: c.linkedAction,
      })))
      setIsLoading(false)
      return
    }

    try {
      const [
        { listCommentsByInvoiceId },
        { listAttachmentsByInvoice },
      ] = await Promise.all([
        import('../services/invoiceCommentService'),
        import('../services/invoiceAttachmentService'),
      ])

      const [commentsResult, attachmentsResult] = await Promise.all([
        listCommentsByInvoiceId(invoiceId),
        listAttachmentsByInvoice(invoiceId).catch(() => ({ items: [] as ApiAttachment[], totalCount: 0 })),
      ])

      setComments(commentsResult.items.map(c => apiCommentToItem(c, attachmentsResult.items)))
    } catch {
      // Empty on error
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  useEffect(() => { fetchData() }, [fetchData])

  return { comments, isLoading, refetch: fetchData }
}

// ── Create comment ──

export function useCreateCommentAction() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Returns 'success' | 'partial' (comment saved, some files failed) | false (comment failed)
  const create = useCallback(async (
    invoiceId: string,
    text: string,
    linkedAction?: string,
    files?: { file: File; name: string; size: string; type: string }[],
    invoiceContactId?: string,
  ): Promise<'success' | 'partial' | false> => {
    setIsSubmitting(true)

    if (isDevelopment) {
      await new Promise(r => setTimeout(r, 300))
      setIsSubmitting(false)
      return 'success'
    }

    try {
      const { createInvoiceComment } = await import('../services/invoiceCommentService')
      const user = getCurrentUser()

      // 1. Create the comment record
      // contactId binds the invoice OWNER's contact for contact-scope permission resolution.
      // This must be the invoice owner (not the current user) so that
      // both supplier and reviewer comments are visible to the supplier.
      const ownerContactId = invoiceContactId || user?.contactId
      const comment = await createInvoiceComment({
        commentText: text,
        invoiceId,
        linkedAction,
        authorContactId: user?.contactId,
        contactId: ownerContactId,
      })

      // 2. Upload attachment files linked to both invoice and comment
      if (files && files.length > 0) {
        const { createInvoiceAttachmentWithFile } = await import('../services/invoiceAttachmentService')
        const results = await Promise.allSettled(files.map(f =>
          createInvoiceAttachmentWithFile(
            {
              fileName: f.name,
              fileSize: f.size,
              fileType: f.type,
              invoiceId,
              commentId: comment.id,
              contactId: ownerContactId,
            },
            f.file,
          )
        ))

        const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        if (failures.length > 0) {
          console.error(
            '[useCreateCommentAction] File upload failed for',
            failures.length, 'of', files.length, 'file(s):',
            failures.map(f => f.reason),
          )
          return 'partial'
        }
      }

      return 'success'
    } catch (err) {
      console.error('[useCreateCommentAction] Comment creation failed:', err)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { create, isSubmitting }
}

// ── Profile stats ──

export function useProfileStats() {
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, needsRevision: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setIsLoading(true)

      if (isDevelopment) {
        const { invoices } = await import('./mockData')
        setStats({
          total: invoices.length,
          paid: invoices.filter(i => i.status === 'Paid').length,
          pending: invoices.filter(i => i.status === 'Submitted' || i.status === 'Under Review').length,
          needsRevision: invoices.filter(i => i.status === 'Needs Revision').length,
        })
        setIsLoading(false)
        return
      }

      try {
        const { getInvoiceCountByStatus } = await import('../services/invoiceService')
        const counts = await getInvoiceCountByStatus()
        const map: Record<string, number> = {}
        let total = 0
        for (const e of counts) { map[e.status] = e.count; total += e.count }
        setStats({
          total,
          paid: map['Paid'] || 0,
          pending: (map['Submitted'] || 0) + (map['Under Review'] || 0),
          needsRevision: map['Needs Revision'] || 0,
        })
      } catch { /* zeros */ }
      finally { setIsLoading(false) }
    })()
  }, [])

  return { stats, isLoading }
}

// ── Download attachment ──

export async function downloadAttachment(attachmentId: string, fileName: string): Promise<boolean> {
  if (isDevelopment) return false

  try {
    const { downloadAttachmentFile } = await import('../services/invoiceAttachmentService')
    const blobUrl = await downloadAttachmentFile(attachmentId)
    if (!blobUrl) return false

    // Trigger browser download
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
    return true
  } catch {
    return false
  }
}

// ── Delete attachment ──

export async function deleteAttachment(attachmentId: string): Promise<boolean> {
  if (isDevelopment) return true

  try {
    const { deleteInvoiceAttachment } = await import('../services/invoiceAttachmentService')
    await deleteInvoiceAttachment(attachmentId)
    return true
  } catch (err) {
    console.error('[deleteAttachment] Failed:', err)
    return false
  }
}
