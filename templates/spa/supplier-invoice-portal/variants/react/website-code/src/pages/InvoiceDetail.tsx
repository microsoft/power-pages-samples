import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Building2, Calendar, FileText, Hash, Paperclip, Download, Trash2, Eye,
  Send, RotateCcw, XCircle, Edit3, AlertTriangle, CheckCircle2, Check,
  ThumbsUp, ThumbsDown, MessageSquare, Sparkles, RefreshCw, Bell,
} from 'lucide-react'
import { formatCurrency, formatDate, useInvoiceDetail, useUpdateInvoiceAction, useCreateCommentAction, downloadAttachment, deleteAttachment } from '../data/invoiceProvider'
import { statusOrder, getCurrentMockUser } from '../data/mockData'
import type { CommentFile } from '../components/CommentSection'
import { isInvoiceLocked } from '../types/invoice'
import { useAuthorization } from '../hooks/useAuthorization'
import type { InvoiceStatus, Comment, Attachment } from '../types'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import ActionDialog from '../components/ActionDialog'
import CommentSection from '../components/CommentSection'
import usePageTitle from '../hooks/usePageTitle'
import InvoiceDetailSkeleton from '../components/InvoiceDetailSkeleton'
import FilePreviewPanel from '../components/FilePreviewPanel'
import { useInvoiceSummary } from '../hooks/useInvoiceSummary'
import { useSendReviewerReminder } from '../hooks/useSendReviewerReminder'

/* ── Timeline helpers ── */

const timelineSteps: { label: string; statuses: InvoiceStatus[] }[] = [
  { label: 'Draft', statuses: ['Draft'] },
  { label: 'Submitted', statuses: ['Submitted'] },
  { label: 'Under Review', statuses: ['Under Review'] },
  { label: 'Approved', statuses: ['Approved'] },
  { label: 'Paid', statuses: ['Paid'] },
]

type TimelineState = 'completed' | 'current' | 'upcoming' | 'rejected' | 'needsRevision'

function getTimelineState(
  currentStatus: InvoiceStatus,
  stepStatuses: InvoiceStatus[]
): TimelineState {
  if (currentStatus === 'Rejected') {
    const rejectedIndex = statusOrder.indexOf('Rejected')
    const stepIndex = statusOrder.indexOf(stepStatuses[0])
    if (stepIndex < rejectedIndex - 2) return 'completed'
    if (stepStatuses[0] === 'Under Review') return 'rejected'
    return 'upcoming'
  }
  if (currentStatus === 'Needs Revision') {
    const stepName = stepStatuses[0]
    if (stepName === 'Draft' || stepName === 'Submitted') return 'completed'
    if (stepName === 'Under Review') return 'needsRevision'
    return 'upcoming'
  }
  const currentIndex = statusOrder.indexOf(currentStatus)
  const stepIndex = statusOrder.indexOf(stepStatuses[0])
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

const stateColors: Record<TimelineState, { dot: string; line: string; text: string }> = {
  completed: { dot: 'var(--color-success)', line: 'var(--color-success)', text: 'var(--color-text)' },
  current: { dot: 'var(--color-primary)', line: 'var(--color-border)', text: 'var(--color-primary)' },
  upcoming: { dot: 'var(--color-border)', line: 'var(--color-border)', text: 'var(--color-text-muted)' },
  rejected: { dot: 'var(--color-error)', line: 'var(--color-border)', text: 'var(--color-error)' },
  needsRevision: { dot: 'var(--color-revision)', line: 'var(--color-border)', text: 'var(--color-revision)' },
}

/* ── Action dialog configs ── */

interface ActionConfig {
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  noteRequired?: boolean
  notePlaceholder?: string
  toastMessage: string
  linkedAction: string
}

const actionConfigs: Record<string, ActionConfig> = {
  // Supplier actions
  submit: {
    title: 'Submit Invoice',
    description: 'This invoice will be sent for review. You can add a note for the reviewer below.',
    confirmLabel: 'Submit Invoice',
    notePlaceholder: 'e.g. Pricing per catalog, delivery completed on Jan 8...',
    toastMessage: 'Invoice submitted!',
    linkedAction: 'Submitted',
  },
  withdraw: {
    title: 'Withdraw Invoice',
    description: 'This will withdraw the invoice from review. You will need to resubmit it later.',
    confirmLabel: 'Withdraw',
    confirmVariant: 'danger',
    noteRequired: true,
    notePlaceholder: 'Please explain why you are withdrawing this invoice...',
    toastMessage: 'Invoice withdrawn',
    linkedAction: 'Withdrawn',
  },
  resubmit: {
    title: 'Resubmit Invoice',
    description: 'This will resubmit the invoice for review. Add any relevant context for the reviewer.',
    confirmLabel: 'Resubmit for Review',
    notePlaceholder: 'e.g. Corrected the amount, attached missing documents...',
    toastMessage: 'Invoice resubmitted!',
    linkedAction: 'Resubmitted',
  },
  // Reviewer actions
  approve: {
    title: 'Approve Invoice',
    description: 'This will approve the invoice for payment processing. You can add an optional note below.',
    confirmLabel: 'Approve',
    notePlaceholder: 'e.g. Pricing verified against contract...',
    toastMessage: 'Invoice approved!',
    linkedAction: 'Approved',
  },
  reject: {
    title: 'Reject Invoice',
    description: 'This will reject the invoice. Please provide a reason for rejection.',
    confirmLabel: 'Reject',
    confirmVariant: 'danger',
    noteRequired: true,
    notePlaceholder: 'Please explain why this invoice is being rejected...',
    toastMessage: 'Invoice rejected',
    linkedAction: 'Rejected',
  },
  requestRevision: {
    title: 'Request Revision',
    description: 'This will send the invoice back to the supplier for revision. Please describe what needs to be changed.',
    confirmLabel: 'Request Revision',
    noteRequired: true,
    notePlaceholder: 'e.g. Missing delivery receipt, incorrect amount...',
    toastMessage: 'Revision requested',
    linkedAction: 'Needs Revision',
  },
}

/* ── Status Alert Banner ── */

function StatusAlertBanner({ invoice, onAction, isReviewer }: {
  invoice: { status: InvoiceStatus; statusHistory: { status: InvoiceStatus; note?: string; author?: string }[] }
  onAction: (action: string) => void
  isReviewer: boolean
}) {
  // Find the most relevant note for the current status
  const lastEntry = [...invoice.statusHistory].reverse().find(h =>
    h.status === invoice.status && h.note
  )

  if (invoice.status === 'Rejected') {
    return (
      <div
        role="alert"
        className="animate-in"
        style={{
          background: 'var(--color-error-light)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <XCircle size={20} color="var(--color-error)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#991B1B', marginBottom: 4 }}>
            Invoice Rejected
          </div>
          {lastEntry?.note && (
            <p style={{ fontSize: '0.875rem', color: '#991B1B', lineHeight: 1.5, marginBottom: isReviewer ? 0 : 10 }}>
              {lastEntry.note}
              {lastEntry.author && (
                <span style={{ color: '#B91C1C', fontWeight: 500 }}> — {lastEntry.author}</span>
              )}
            </p>
          )}
          {!isReviewer && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onAction('edit')} className="btn-outline-sm" style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: 'var(--color-error)', color: '#991B1B' }}>
                <Edit3 size={13} aria-hidden="true" /> Edit Invoice
              </button>
              <button onClick={() => onAction('resubmit')} className="btn-primary-sm" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                <RotateCcw size={13} aria-hidden="true" /> Resubmit Invoice
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (invoice.status === 'Needs Revision') {
    return (
      <div
        role="alert"
        className="animate-in"
        style={{
          background: 'var(--color-revision-light)',
          border: '1px solid var(--color-revision)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <AlertTriangle size={20} color="var(--color-revision)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-revision)', marginBottom: 4 }}>
            Revision Requested
          </div>
          {lastEntry?.note && (
            <p style={{ fontSize: '0.875rem', color: '#BF360C', lineHeight: 1.5, marginBottom: isReviewer ? 0 : 10 }}>
              {lastEntry.note}
              {lastEntry.author && (
                <span style={{ color: 'var(--color-revision)', fontWeight: 500 }}> — {lastEntry.author}</span>
              )}
            </p>
          )}
          {!isReviewer && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onAction('edit')} className="btn-outline-sm" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                <Edit3 size={13} aria-hidden="true" /> Edit Invoice
              </button>
              <button onClick={() => onAction('resubmit')} className="btn-primary-sm" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                <Send size={13} aria-hidden="true" /> Resubmit
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (invoice.status === 'Approved') {
    return (
      <div
        className="animate-in"
        style={{
          background: 'var(--color-success-light)',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <CheckCircle2 size={18} color="var(--color-success)" aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', color: '#065F46', fontWeight: 500 }}>
          Invoice approved — awaiting payment processing.
        </span>
      </div>
    )
  }

  if (invoice.status === 'Paid') {
    return (
      <div
        className="animate-in"
        style={{
          background: 'var(--color-success-light)',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <CheckCircle2 size={18} color="var(--color-success)" aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', color: '#065F46', fontWeight: 500 }}>
          Payment completed. This invoice is fully processed.
        </span>
      </div>
    )
  }

  return null
}

/* ── Main component ── */

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isReviewer } = useAuthorization()
  const { invoice, isLoading, error, refetch } = useInvoiceDetail(id)
  const {
    summary: aiSummary,
    recommendations: aiRecommendations,
    isLoading: isSummaryLoading,
    error: summaryError,
    errorCode: summaryErrorCode,
    summarize: generateSummary,
    refineWithRecommendation,
  } = useInvoiceSummary(id)
  const { update: updateInvoice } = useUpdateInvoiceAction()
  const { create: createComment, isSubmitting: isCommentSubmitting } = useCreateCommentAction()
  const { isSending: isReminderSending, send: sendReviewerReminder } = useSendReviewerReminder()
  usePageTitle(invoice ? invoice.invoiceNumber : isLoading ? 'Loading...' : 'Invoice Not Found')
  const locked = isInvoiceLocked(invoice?.status)
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null)
  const [comments, setComments] = useState<Comment[]>(invoice?.comments ?? [])
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [isSummaryOpen, setIsSummaryOpen] = useState(true)

  // Sync comments when invoice data changes (e.g. after refetch)
  useEffect(() => {
    if (invoice?.comments) {
      setComments(invoice.comments)
    }
  }, [invoice?.comments])

  // Attached Documents shows server data only — no optimistic duplicates.
  // The comment section already shows optimistic attachments inline.
  const allAttachments = invoice?.attachments ?? []

  function showToast(message: string, variant: 'success' | 'error' = 'success') {
    setToast({ message, variant })
  }

  const addComment = useCallback(async (text: string, linkedAction?: string, files?: CommentFile[]) => {
    if (!id) return

    // Optimistic local update for immediate feedback
    const user = getCurrentMockUser()
    const attachments = files?.map(f => f.attachment)
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: user.name,
      authorInitials: user.initials,
      date: new Date().toISOString(),
      text,
      linkedAction,
      attachments,
    }
    setComments(prev => [...prev, newComment])

    // Persist to API
    const filePayloads = files?.map(f => ({
      file: f.file,
      name: f.attachment.name,
      size: f.attachment.size,
      type: f.attachment.type,
    }))
    const result = await createComment(id, text, linkedAction, filePayloads, invoice?.contactId)

    if (result === 'success') {
      refetch()
    } else if (result === 'partial') {
      showToast('Comment saved but some attachments failed to upload', 'error')
      refetch()
    } else {
      // Comment creation failed — roll back optimistic comment
      setComments(prev => prev.filter(c => c.id !== newComment.id))
      showToast('Failed to save comment', 'error')
    }
  }, [id, createComment, refetch, invoice?.contactId])

  const handleActionConfirm = useCallback(async (note: string) => {
    if (!activeAction || !actionConfigs[activeAction] || !id) return
    const config = actionConfigs[activeAction]

    // Determine the target status for each action
    const statusMap: Record<string, string> = {
      submit: 'Submitted',
      resubmit: 'Submitted',
      withdraw: 'Draft',
      approve: 'Approved',
      reject: 'Rejected',
      requestRevision: 'Needs Revision',
    }
    const targetStatus = statusMap[activeAction]

    if (targetStatus) {
      const extraFields: Record<string, string | undefined> = {}
      if (activeAction === 'submit' || activeAction === 'resubmit') {
        extraFields.submissionDate = new Date().toISOString()
      }
      const success = await updateInvoice(id, {
        status: targetStatus,
        ...extraFields,
      } as Parameters<typeof updateInvoice>[1])
      if (!success) {
        // Throw so ActionDialog stays open and user can retry
        throw new Error('Failed to update invoice')
      }
    }

    // Create a comment with the linked action
    if (note) {
      await createComment(id, note, config.linkedAction, undefined, invoice?.contactId)
    }

    showToast(config.toastMessage)
    setActiveAction(null)

    // Refetch to get updated status and comments from server
    refetch()
  }, [activeAction, id, updateInvoice, createComment, refetch, invoice?.contactId])

  const handleAddComment = useCallback((text: string, files?: CommentFile[]) => {
    addComment(text, undefined, files)
  }, [addComment])

  const handleSendReviewerReminder = useCallback(async () => {
    if (!invoice || !id) return
    const submitted = invoice.submissionDate ? new Date(invoice.submissionDate).getTime() : NaN
    const daysPending = Number.isFinite(submitted)
      ? Math.max(0, Math.floor((Date.now() - submitted) / 86_400_000))
      : 0
    const ok = await sendReviewerReminder({
      InvoiceNumber: invoice.invoiceNumber,
      InvoiceId: id,
      ReviewerEmail: 'pagesteam@portalauto.onmicrosoft.com',
      SupplierName: invoice.company,
      DaysPending: daysPending,
    })
    showToast(
      ok ? 'Reminder sent to reviewer' : 'Could not send reminder. Please try again.',
      ok ? 'success' : 'error',
    )
  }, [invoice, id, sendReviewerReminder])

  function handleBannerAction(action: string) {
    if (action === 'edit') {
      navigate(`/invoices/${id}/edit`)
    } else {
      setActiveAction(action)
    }
  }

  if (isLoading) {
    return <InvoiceDetailSkeleton />
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={48} color="var(--color-error)" aria-hidden="true" style={{ marginBottom: 12 }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8 }}>We couldn&apos;t load this invoice</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
          This might be a temporary issue. Check your connection and try again.
        </p>
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showErrorDetails ? 'Hide details' : 'Show details'}
          </button>
          {showErrorDetails && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 8, fontFamily: 'monospace' }}>
              {error}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => refetch()} className="btn-primary-sm">
            Try Again
          </button>
          <button onClick={() => navigate('/invoices')} className="btn-outline-sm">
            Back to Invoices
          </button>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FileText size={48} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: 12 }}>Invoice not found</h1>
        <button onClick={() => navigate('/invoices')} className="btn-primary">
          Back to Invoices
        </button>
      </div>
    )
  }

  const details = [
    { icon: Hash, label: 'PO Number', value: invoice.poNumber, link: invoice.purchaseOrderId ? `/purchase-orders/${invoice.purchaseOrderId}` : undefined },
    { icon: FileText, label: 'Amount', value: formatCurrency(invoice.amount) },
    { icon: Calendar, label: 'Submitted', value: formatDate(invoice.submissionDate) },
    { icon: Calendar, label: 'Due Date', value: formatDate(invoice.dueDate) },
    { icon: Building2, label: 'Company', value: invoice.company },
  ]

  const currentActionConfig = activeAction ? actionConfigs[activeAction] : null
  const hasAlertBanner = ['Rejected', 'Needs Revision'].includes(invoice.status)

  return (
    <div style={{ maxWidth: 800 }}>
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}

      {currentActionConfig && (
        <ActionDialog
          open={!!activeAction}
          title={currentActionConfig.title}
          description={currentActionConfig.description}
          confirmLabel={currentActionConfig.confirmLabel}
          confirmVariant={currentActionConfig.confirmVariant}
          noteRequired={currentActionConfig.noteRequired}
          notePlaceholder={currentActionConfig.notePlaceholder}
          onConfirm={handleActionConfirm}
          onCancel={() => setActiveAction(null)}
        />
      )}

      {/* ── 1. Breadcrumbs ── */}
      <nav aria-label="Breadcrumb" className="animate-in" style={{ marginBottom: 16 }}>
        <ol style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
          <li>
            <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              Dashboard
            </Link>
          </li>
          <li style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">/</li>
          <li>
            <Link to={isReviewer ? '/review' : '/invoices'} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              {isReviewer ? 'Review Queue' : 'My Invoices'}
            </Link>
          </li>
          <li style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">/</li>
          <li style={{ color: 'var(--color-text)', fontWeight: 500 }} aria-current="page">
            {invoice.invoiceNumber}
          </li>
        </ol>
      </nav>

      {/* ── 2. Header: Title + Badge + Actions (single row) ── */}
      <div
        className="animate-in"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            {invoice.invoiceNumber}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>

        {/* Actions — role-dependent */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Reviewer actions: shown for Submitted and Under Review */}
          {isReviewer && (invoice.status === 'Submitted' || invoice.status === 'Under Review') && (
            <>
              <button onClick={() => setActiveAction('approve')} className="btn-primary-sm">
                <ThumbsUp size={15} aria-hidden="true" /> Approve
              </button>
              <button onClick={() => setActiveAction('requestRevision')} className="btn-outline-sm">
                <MessageSquare size={15} aria-hidden="true" /> Request Revision
              </button>
              <button onClick={() => setActiveAction('reject')} className="btn-outline-sm" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                <ThumbsDown size={15} aria-hidden="true" /> Reject
              </button>
            </>
          )}

          {/* Supplier actions — only when no alert banner (banner has its own CTAs) */}
          {!isReviewer && !hasAlertBanner && (
            <>
              {invoice.status === 'Draft' && (
                <>
                  <button onClick={() => navigate(`/invoices/${id}/edit`)} className="btn-outline-sm">
                    <Edit3 size={15} aria-hidden="true" /> Edit
                  </button>
                  <button onClick={() => setActiveAction('submit')} className="btn-primary-sm">
                    <Send size={15} aria-hidden="true" /> Submit
                  </button>
                </>
              )}
              {invoice.status === 'Submitted' && (
                <button onClick={() => setActiveAction('withdraw')} className="btn-outline-sm">
                  <XCircle size={15} aria-hidden="true" /> Withdraw
                </button>
              )}
              {(invoice.status === 'Submitted' || invoice.status === 'Under Review') && (
                <button
                  onClick={handleSendReviewerReminder}
                  disabled={isReminderSending}
                  className="btn-outline-sm"
                  title="Send a reminder email to the reviewer"
                >
                  <Bell size={15} aria-hidden="true" />{' '}
                  {isReminderSending ? 'Sending...' : 'Send reminder'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 3. Status Alert Banner (Rejected / Needs Revision / Approved / Paid) ── */}
      <StatusAlertBanner invoice={invoice} onAction={handleBannerAction} isReviewer={isReviewer} />

      {/* ── 4. Horizontal Status Stepper ── */}
      <div
        className="animate-in animate-in-1"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          marginBottom: 24,
          overflowX: 'auto',
        }}
      >
        <div
          role="list"
          aria-label="Invoice status progress"
          style={{ display: 'flex', alignItems: 'flex-start', minWidth: 480 }}
        >
          {timelineSteps.map((step, i) => {
            const state = getTimelineState(invoice.status, step.statuses)
            const colors = stateColors[state]
            const isLast = i === timelineSteps.length - 1
            const showRejected = invoice.status === 'Rejected' && step.label === 'Under Review'
            const showNeedsRevision = invoice.status === 'Needs Revision' && step.label === 'Under Review'
            const isHighlighted = state === 'current' || state === 'rejected' || state === 'needsRevision'

            const historyEntry = invoice.statusHistory?.find((h) => {
              if (showRejected && h.status === 'Rejected') return true
              if (showNeedsRevision && h.status === 'Needs Revision') return true
              return h.status === step.statuses[0]
            })

            const label = showRejected ? 'Rejected' : showNeedsRevision ? 'Needs Revision' : step.label

            // Dot size
            const dotSize = isHighlighted ? 28 : 24

            return (
              <div
                key={step.label}
                role="listitem"
                aria-current={isHighlighted ? 'step' : undefined}
                style={{ display: 'flex', alignItems: 'flex-start', flex: isLast ? '0 0 auto' : 1 }}
              >
                {/* Step: dot + label + date */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
                  {/* Dot */}
                  <div
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: '50%',
                      background: state === 'completed' ? colors.dot : state === 'upcoming' ? 'var(--color-surface)' : colors.dot,
                      border: state === 'upcoming' ? '2px solid var(--color-border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isHighlighted
                        ? state === 'current'
                          ? '0 0 0 4px rgba(45, 90, 61, 0.15)'
                          : state === 'rejected'
                            ? '0 0 0 4px rgba(197, 48, 48, 0.12)'
                            : '0 0 0 4px rgba(230, 81, 0, 0.12)'
                        : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {state === 'completed' && (
                      <Check size={14} color="#fff" strokeWidth={3} aria-hidden="true" />
                    )}
                    {isHighlighted && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#fff',
                        }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: isHighlighted ? 600 : 400,
                      color: colors.text,
                      fontFamily: isHighlighted ? 'var(--font-heading)' : 'var(--font-body)',
                      marginTop: 8,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {label}
                  </div>

                  {/* Date (compact) */}
                  {(state === 'completed' || isHighlighted) && historyEntry && (
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: isHighlighted ? colors.text : 'var(--color-text-muted)',
                        marginTop: 2,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(historyEntry.date)}
                    </div>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: state === 'completed' ? 'var(--color-success)' : 'var(--color-border)',
                      marginTop: dotSize / 2,
                      minWidth: 20,
                      transition: 'background 0.3s ease',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 5. Invoice Details (reference info — pushed down) ── */}
      <div
        className="animate-in animate-in-2"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.05rem',
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          Invoice Details
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
          }}
        >
          {details.map((d) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius)',
                  background: 'var(--color-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <d.icon size={16} color="var(--color-text-muted)" aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                  {d.label}
                </div>
                <div style={{ fontSize: '0.925rem', fontWeight: 500 }}>
                  {d.link ? (
                    <Link to={d.link} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                      {d.value}
                    </Link>
                  ) : d.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {invoice.description && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Description
            </div>
            <p style={{ fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
              {invoice.description}
            </p>
          </div>
        )}
      </div>

      {/* ── 5b. AI Summary (generative-AI data summarization) ── */}
      <section
        aria-labelledby="ai-summary-heading"
        className="animate-in animate-in-2"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          marginBottom: 24,
          // Copilot brand accent — gradient top border cue.
          borderTop: '2px solid transparent',
          borderImage:
            'linear-gradient(90deg, rgb(70,79,235) 35%, rgb(71,207,250) 70%, rgb(180,124,248) 92%) 1',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: aiSummary || isSummaryLoading || summaryError ? 16 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} color="var(--color-primary)" aria-hidden="true" />
            <h2
              id="ai-summary-heading"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.05rem',
                fontWeight: 600,
                margin: 0,
              }}
            >
              AI Summary
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!aiSummary && !isSummaryLoading && !summaryError && (
              <button
                type="button"
                onClick={generateSummary}
                disabled={!id}
                className="btn-primary-sm"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                <Sparkles size={13} aria-hidden="true" /> Generate summary
              </button>
            )}
            {aiSummary && !isSummaryLoading && (
              <button
                type="button"
                onClick={generateSummary}
                className="btn-outline-sm"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                title="Regenerate summary"
              >
                <RefreshCw size={13} aria-hidden="true" /> Regenerate
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSummaryOpen((v) => !v)}
              aria-expanded={isSummaryOpen}
              aria-controls="ai-summary-body"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                fontSize: '0.78rem',
              }}
            >
              {isSummaryOpen ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {isSummaryOpen && (
          <div id="ai-summary-body">
            {/* Loading state */}
            {isSummaryLoading && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                Generating summary...
              </div>
            )}

            {/* Error state */}
            {!isSummaryLoading && summaryError && (
              <div
                role="alert"
                style={{
                  background: 'var(--color-error-light)',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 16px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <AlertTriangle
                  size={16}
                  color="var(--color-error)"
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ flex: 1, fontSize: '0.85rem', color: '#991B1B' }}>
                  {/* Remediation branch: tenant-level AI disabled. Retrying won't help — a
                      Power Platform admin needs to enable generative-AI features. */}
                  {summaryErrorCode === '90041001' ? (
                    <>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        AI summaries are turned off for this environment
                      </div>
                      <div style={{ lineHeight: 1.5 }}>
                        An administrator needs to enable generative-AI features for the
                        tenant or Power Platform environment before this card can produce a
                        summary.
                      </div>
                    </>
                  ) : summaryErrorCode === '90041003' ? (
                    <>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        Data summarization isn&apos;t enabled for this site
                      </div>
                      <div style={{ lineHeight: 1.5 }}>
                        A maker needs to set the <code>Summarization/Data/Enable</code> site
                        setting to <code>true</code>.
                      </div>
                    </>
                  ) : (
                    <div style={{ lineHeight: 1.5 }}>{summaryError}</div>
                  )}
                  {summaryErrorCode !== '90041001' && summaryErrorCode !== '90041003' && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={generateSummary}
                        className="btn-outline-sm"
                        style={{
                          fontSize: '0.78rem',
                          padding: '4px 10px',
                          borderColor: 'var(--color-error)',
                          color: '#991B1B',
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty state — pre-request idle */}
            {!isSummaryLoading && !summaryError && !aiSummary && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Use AI to summarize this invoice&apos;s key details, supplier context, and
                status. Summaries are generated on demand.
              </p>
            )}

            {/* Content state */}
            {!isSummaryLoading && !summaryError && aiSummary && (
              <>
                <p
                  style={{
                    fontSize: '0.925rem',
                    lineHeight: 1.6,
                    color: 'var(--color-text)',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}
                >
                  {aiSummary}
                </p>

                {aiRecommendations.length > 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--color-text-muted)',
                        marginBottom: 8,
                      }}
                    >
                      Refine
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {aiRecommendations.map((rec, i) => (
                        <button
                          key={`${i}-${rec.Text}`}
                          type="button"
                          onClick={() => refineWithRecommendation(rec)}
                          className="btn-outline-sm"
                          style={{
                            fontSize: '0.78rem',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                          }}
                        >
                          {rec.Text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    marginTop: 16,
                    marginBottom: 0,
                    fontStyle: 'italic',
                  }}
                >
                  AI-generated content may be incorrect.
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── 6. Attached Documents (original + added via comments) ── */}
      <div
        className="animate-in animate-in-3"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.05rem',
            fontWeight: 600,
            marginBottom: allAttachments.length > 0 ? 16 : 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Paperclip size={18} color="var(--color-primary)" aria-hidden="true" />
          Attached Documents
          {allAttachments.length > 0 && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg)',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {allAttachments.length}
            </span>
          )}
        </h2>
        {allAttachments.length > 0 ? (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allAttachments.map((att) => (
              <li
                key={att.id}
                className="attachment-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Paperclip size={15} color="var(--color-text-muted)" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(att)}
                  style={{
                    flex: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-primary)',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    textDecoration: 'none',
                  }}
                  title="Preview"
                >
                  {att.name}
                </button>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{att.size}</span>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(att)}
                  aria-label={`Preview ${att.name}`}
                  title="Preview"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <Eye size={14} color="var(--color-primary)" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    showToast(`Downloading ${att.name}...`)
                    const ok = await downloadAttachment(att.id, att.name)
                    if (!ok) showToast(`Could not download ${att.name}`, 'error')
                  }}
                  aria-label={`Download ${att.name}`}
                  title="Download"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <Download size={14} color="var(--color-text-muted)" aria-hidden="true" />
                </button>
                {!locked && !isReviewer && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(att)}
                  aria-label={`Delete ${att.name}`}
                  title="Delete"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <Trash2 size={14} color="var(--color-error)" aria-hidden="true" />
                </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 12 }}>
            {locked ? 'No documents attached.' : 'No documents attached. You can attach files when adding a comment below.'}
          </p>
        )}
      </div>

      {/* Delete attachment confirmation dialog */}
      {deleteTarget && (
        <ActionDialog
          open={true}
          title="Delete Attachment"
          description={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          confirmVariant="danger"
          onConfirm={async () => {
            setIsDeleting(true)
            const ok = await deleteAttachment(deleteTarget.id)
            setIsDeleting(false)
            if (ok) {
              setDeleteTarget(null)
              showToast('Attachment deleted')
              refetch()
            } else {
              showToast('Failed to delete attachment', 'error')
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* File preview panel */}
      <FilePreviewPanel
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        onDownload={async (att) => {
          showToast(`Downloading ${att.name}...`)
          const ok = await downloadAttachment(att.id, att.name)
          if (!ok) showToast(`Could not download ${att.name}`, 'error')
        }}
      />

      {/* ── 7. Activity & Comments ── */}
      <CommentSection
        comments={comments}
        statusHistory={invoice.statusHistory}
        onAddComment={handleAddComment}
        isSubmitting={isCommentSubmitting}
        readOnly={locked}
      />
    </div>
  )
}
