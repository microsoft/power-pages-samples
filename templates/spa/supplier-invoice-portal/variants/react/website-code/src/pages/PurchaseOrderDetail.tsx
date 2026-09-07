import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Building2, Calendar, FileText, Hash, DollarSign, AlertTriangle,
  Send, XCircle, CheckCircle2, Plus, Sparkles, RefreshCw,
} from 'lucide-react'
import { usePurchaseOrderDetail, useUpdatePOAction } from '../data/purchaseOrderProvider'
import { useInvoiceList, formatCurrency, formatDate } from '../data/invoiceProvider'
import { useAuthorization } from '../hooks/useAuthorization'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import ActionDialog from '../components/ActionDialog'
import usePageTitle from '../hooks/usePageTitle'
import { usePurchaseOrderSummary } from '../hooks/usePurchaseOrderSummary'

interface ActionConfig {
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  noteRequired?: boolean
  notePlaceholder?: string
  toastMessage: string
  targetStatus: string
}

const actionConfigs: Record<string, ActionConfig> = {
  issue: {
    title: 'Issue Purchase Order',
    description: 'This will issue the PO to the supplier, making it available for invoicing.',
    confirmLabel: 'Issue PO',
    toastMessage: 'Purchase order issued!',
    targetStatus: 'Issued',
  },
  close: {
    title: 'Close Purchase Order',
    description: 'This will close the PO. No further invoices can be submitted against it.',
    confirmLabel: 'Close PO',
    toastMessage: 'Purchase order closed',
    targetStatus: 'Closed',
  },
  cancel: {
    title: 'Cancel Purchase Order',
    description: 'This will cancel the PO. This action cannot be undone.',
    confirmLabel: 'Cancel PO',
    confirmVariant: 'danger',
    noteRequired: true,
    notePlaceholder: 'Reason for cancellation...',
    toastMessage: 'Purchase order cancelled',
    targetStatus: 'Cancelled',
  },
}

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isReviewer } = useAuthorization()
  const { purchaseOrder: po, isLoading, error, refetch } = usePurchaseOrderDetail(id)
  const { update: updatePO } = useUpdatePOAction()
  usePageTitle(po ? po.poNumber : isLoading ? 'Loading...' : 'PO Not Found')

  const [toast, setToast] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [isSummaryOpen, setIsSummaryOpen] = useState(true)

  // Fetch linked invoices by PO number
  const { invoices: linkedInvoices, isLoading: invoicesLoading } = useInvoiceList({
    search: po?.poNumber,
    pageSize: 50,
  })

  // AI summary — generative-AI data summarization for this PO record.
  const {
    summary: aiSummary,
    recommendations: aiRecommendations,
    isLoading: isSummaryLoading,
    error: summaryError,
    errorCode: summaryErrorCode,
    summarize: generateSummary,
    refineWithRecommendation,
  } = usePurchaseOrderSummary(id)

  const handleActionConfirm = useCallback(async (_note: string) => {
    if (!activeAction || !actionConfigs[activeAction] || !id) return
    const config = actionConfigs[activeAction]

    const success = await updatePO(id, {
      status: config.targetStatus as Parameters<typeof updatePO>[1]['status'],
    })
    if (!success) {
      setToast('Failed to update purchase order. Please try again.')
      setActiveAction(null)
      return
    }

    setToast(config.toastMessage)
    setActiveAction(null)
    refetch()
  }, [activeAction, id, updatePO, refetch])

  if (isLoading) {
    return (
      <div style={{ maxWidth: 800 }} aria-busy="true" aria-label="Loading purchase order details">
        {/* Breadcrumb skeleton */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <div className="skeleton" style={{ width: 70, height: 14 }} />
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <div className="skeleton" style={{ width: 110, height: 14 }} />
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <div className="skeleton" style={{ width: 90, height: 14 }} />
        </div>

        {/* Title + badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div className="skeleton skeleton-title" style={{ width: 180 }} />
          <div className="skeleton skeleton-badge" />
        </div>

        {/* Balance summary skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-card" style={{ padding: '20px 24px', textAlign: 'center' }}>
              <div className="skeleton skeleton-text" style={{ width: '60%', margin: '0 auto 8px' }} />
              <div className="skeleton" style={{ width: '50%', height: 24, margin: '0 auto' }} />
            </div>
          ))}
        </div>

        {/* Details card skeleton */}
        <div className="skeleton-card">
          <div className="skeleton skeleton-text-lg" style={{ width: 100 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 16 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} style={{ display: 'flex', gap: 10 }}>
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--radius)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={48} color="var(--color-error)" aria-hidden="true" style={{ marginBottom: 12 }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8 }}>Failed to load purchase order</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>{error}</p>
        <button onClick={() => refetch()} className="btn-primary-sm">Try Again</button>
      </div>
    )
  }

  if (!po) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FileText size={48} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: 12 }}>Purchase order not found</h1>
        <button onClick={() => navigate('/purchase-orders')} className="btn-primary">
          Back to Purchase Orders
        </button>
      </div>
    )
  }

  const details = [
    { icon: Hash, label: 'PO Number', value: po.poNumber },
    { icon: Building2, label: 'Supplier', value: po.supplierName },
    { icon: DollarSign, label: 'Total Amount', value: formatCurrency(po.totalAmount) },
    { icon: DollarSign, label: 'Invoiced', value: formatCurrency(po.invoicedAmount) },
    { icon: DollarSign, label: 'Remaining', value: formatCurrency(po.remainingAmount) },
    { icon: Calendar, label: 'Delivery Date', value: formatDate(po.deliveryDate) },
  ]

  const currentActionConfig = activeAction ? actionConfigs[activeAction] : null

  return (
    <div style={{ maxWidth: 800 }}>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

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

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="animate-in" style={{ marginBottom: 16 }}>
        <ol style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
          <li>
            <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              Dashboard
            </Link>
          </li>
          <li style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">/</li>
          <li>
            <Link to="/purchase-orders" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              {isReviewer ? 'Purchase Orders' : 'My POs'}
            </Link>
          </li>
          <li style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">/</li>
          <li style={{ color: 'var(--color-text)', fontWeight: 500 }} aria-current="page">
            {po.poNumber}
          </li>
        </ol>
      </nav>

      {/* Header */}
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
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 600 }}>
            {po.poNumber}
          </h1>
          <StatusBadge status={po.status} />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Reviewer actions */}
          {isReviewer && po.status === 'Draft' && (
            <button onClick={() => setActiveAction('issue')} className="btn-primary-sm">
              <Send size={15} aria-hidden="true" /> Issue PO
            </button>
          )}
          {isReviewer && (po.status === 'Issued' || po.status === 'Partially Invoiced') && (
            <button onClick={() => setActiveAction('close')} className="btn-outline-sm">
              <CheckCircle2 size={15} aria-hidden="true" /> Close
            </button>
          )}
          {isReviewer && po.status !== 'Cancelled' && po.status !== 'Closed' && (
            <button onClick={() => setActiveAction('cancel')} className="btn-outline-sm" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
              <XCircle size={15} aria-hidden="true" /> Cancel
            </button>
          )}

          {/* Supplier action: create invoice against this PO */}
          {!isReviewer && (po.status === 'Issued' || po.status === 'Partially Invoiced') && (
            <Link to={`/invoices/new?po=${po.id}`} className="btn-primary-sm">
              <Plus size={15} aria-hidden="true" /> Create Invoice
            </Link>
          )}
        </div>
      </div>

      {/* Balance Summary */}
      <div
        className="animate-in animate-in-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Total Amount', value: formatCurrency(po.totalAmount), color: 'var(--color-primary)' },
          { label: 'Invoiced', value: formatCurrency(po.invoicedAmount), color: 'var(--color-warning)' },
          { label: 'Remaining', value: formatCurrency(po.remainingAmount), color: 'var(--color-success)' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 600, color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Balance progress bar */}
      <div style={{ marginTop: 16 }}>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${po.totalAmount > 0 ? Math.min(100, (po.invoicedAmount / po.totalAmount) * 100) : 0}%`,
              background: po.invoicedAmount >= po.totalAmount ? 'var(--color-success)' : 'var(--color-warning)',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <span>{po.totalAmount > 0 ? Math.round((po.invoicedAmount / po.totalAmount) * 100) : 0}% invoiced</span>
          <span>{formatCurrency(po.remainingAmount)} remaining</span>
        </div>
      </div>

      {/* PO Details */}
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
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 600, marginBottom: 20 }}>
          PO Details
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {details.map((d) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 'var(--radius)',
                  background: 'var(--color-bg)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <d.icon size={16} color="var(--color-text-muted)" aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: '0.925rem', fontWeight: 500 }}>{d.value}</div>
              </div>
            </div>
          ))}
        </div>

        {po.description && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>Description</div>
            <p style={{ fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--color-text)' }}>{po.description}</p>
          </div>
        )}
      </div>

      {/* AI Summary (generative-AI data summarization) */}
      <section
        aria-labelledby="po-ai-summary-heading"
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
              id="po-ai-summary-heading"
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
              aria-controls="po-ai-summary-body"
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
          <div id="po-ai-summary-body">
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
                Use AI to summarize this purchase order&apos;s key details, supplier
                context, and status. Summaries are generated on demand.
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

      {/* Linked Invoices */}
      <div
        className="animate-in animate-in-3"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 600 }}>
            Linked Invoices
          </h2>
        </div>

        {invoicesLoading ? (
          <div style={{ padding: '32px 24px' }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div className="skeleton" style={{ width: '20%', height: 14 }} />
                <div className="skeleton" style={{ width: '15%', height: 14 }} />
                <div className="skeleton skeleton-badge" style={{ width: 70 }} />
                <div className="skeleton" style={{ width: '15%', height: 14 }} />
              </div>
            ))}
          </div>
        ) : linkedInvoices.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={36} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem' }}>
              No invoices submitted against this PO yet.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr style={{ background: 'var(--color-bg)', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 24px', fontWeight: 500 }}>Invoice #</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500 }}>Amount</th>
                  <th style={{ padding: '10px 16px', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '10px 24px', fontWeight: 500 }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {linkedInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="row-interactive"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td style={{ padding: '14px 24px', fontWeight: 500, fontSize: '0.9rem' }}>
                      <Link className="row-primary-link" to={`/invoices/${inv.id}`}>
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontFamily: 'var(--font-heading)', fontWeight: 500 }}>{formatCurrency(inv.amount)}</td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={inv.status} /></td>
                    <td style={{ padding: '14px 24px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{formatDate(inv.submissionDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
