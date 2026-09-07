import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ClipboardCheck, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react'
import { useInvoiceList, formatCurrency, formatDate } from '../data/invoiceProvider'
import StatusBadge from '../components/StatusBadge'
import usePageTitle from '../hooks/usePageTitle'
import { useReviewQueueSummary } from '../hooks/useReviewQueueSummary'

type SortKey = 'invoiceNumber' | 'amount' | 'status' | 'submissionDate'
type SortDir = 'asc' | 'desc'

export default function ReviewQueue() {
  usePageTitle('Review Queue')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Submitted' | 'Under Review'>('All')
  const [sortKey, setSortKey] = useState<SortKey>('submissionDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [isSummaryOpen, setIsSummaryOpen] = useState(true)

  const {
    summary: aiSummary,
    recommendations: aiRecommendations,
    isLoading: isSummaryLoading,
    error: summaryError,
    errorCode: summaryErrorCode,
    summarize: generateSummary,
    refineWithRecommendation,
  } = useReviewQueueSummary()

  const filterStatus = statusFilter === 'All' ? undefined : statusFilter

  // Fetch submitted + under review invoices
  const { invoices: allInvoices, isLoading, error, refetch } = useInvoiceList({
    status: filterStatus,
    search: search.trim() || undefined,
    sortKey,
    sortDir,
    pageSize: 50,
  })

  // If no specific filter, show only Submitted + Under Review
  const filtered = statusFilter === 'All'
    ? allInvoices.filter(i => i.status === 'Submitted' || i.status === 'Under Review')
    : allInvoices

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function handleSortKeyDown(e: React.KeyboardEvent, key: SortKey) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(key)
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.35, marginLeft: 4 }} aria-hidden="true" />
    if (sortDir === 'asc') return <ArrowUp size={12} style={{ marginLeft: 4 }} aria-hidden="true" />
    return <ArrowDown size={12} style={{ marginLeft: 4 }} aria-hidden="true" />
  }

  function ariaSortValue(key: SortKey): 'ascending' | 'descending' | undefined {
    if (sortKey !== key) return undefined
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontWeight: 500,
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>/</span>
        <span style={{ color: 'var(--color-text)' }}>Review Queue</span>
      </nav>
      <div
        className="animate-in"
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Review Queue
          </h1>
          <p style={{ fontSize: '0.925rem', color: 'var(--color-text-muted)' }}>
            Invoices awaiting your review.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="animate-in animate-in-2"
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Filter
            size={15}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <label htmlFor="queue-status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="queue-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Submitted' | 'Under Review')}
            style={{
              paddingLeft: 34,
              paddingRight: 14,
              height: 40,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: '0.875rem',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Queue</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
          </select>
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <Search
            size={15}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <label htmlFor="search-queue" className="sr-only">
            Search invoices
          </label>
          <input
            id="search-queue"
            type="search"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 36,
              height: 40,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </div>

      {/* AI Summary (generative-AI list summarization over the review queue) */}
      <section
        aria-labelledby="review-queue-ai-summary-heading"
        className="animate-in animate-in-2"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          marginBottom: 24,
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
              id="review-queue-ai-summary-heading"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.05rem',
                fontWeight: 600,
                margin: 0,
              }}
            >
              Queue AI Summary
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              aria-controls="review-queue-ai-summary-body"
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
          <div id="review-queue-ai-summary-body">
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
                Analyzing the review queue...
              </div>
            )}

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
                  ) : summaryErrorCode === '90041005' ? (
                    <div style={{ lineHeight: 1.5 }}>
                      No invoices in the review queue right now — nothing to summarize.
                    </div>
                  ) : (
                    <div style={{ lineHeight: 1.5 }}>{summaryError}</div>
                  )}
                  {summaryErrorCode !== '90041001' &&
                    summaryErrorCode !== '90041003' &&
                    summaryErrorCode !== '90041005' && (
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
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    {aiRecommendations.map((rec, i) => (
                      <button
                        key={`${rec.Config}-${i}`}
                        type="button"
                        onClick={() => refineWithRecommendation(rec)}
                        className="btn-outline-sm"
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      >
                        {rec.Text}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    marginTop: 12,
                    fontStyle: 'italic',
                  }}
                >
                  AI-generated content may be incorrect.
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Table */}
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
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr
                style={{
                  background: 'var(--color-bg)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  textAlign: 'left',
                }}
              >
                <th className="th-sortable" style={{ ...thStyle, paddingLeft: 24 }} onClick={() => handleSort('invoiceNumber')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('invoiceNumber')} onKeyDown={(e) => handleSortKeyDown(e, 'invoiceNumber')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Invoice #<SortIcon col="invoiceNumber" /></span>
                </th>
                <th style={thStyle}>Supplier</th>
                <th className="th-sortable" style={thStyle} onClick={() => handleSort('amount')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('amount')} onKeyDown={(e) => handleSortKeyDown(e, 'amount')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Amount<SortIcon col="amount" /></span>
                </th>
                <th className="th-sortable" style={thStyle} onClick={() => handleSort('status')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('status')} onKeyDown={(e) => handleSortKeyDown(e, 'status')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Status<SortIcon col="status" /></span>
                </th>
                <th className="th-sortable" style={{ ...thStyle, paddingRight: 24 }} onClick={() => handleSort('submissionDate')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('submissionDate')} onKeyDown={(e) => handleSortKeyDown(e, 'submissionDate')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Submitted<SortIcon col="submissionDate" /></span>
                </th>
              </tr>
            </thead>
            <tbody className={isLoading ? 'table-loading' : ''}>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map(n => (
                    <tr key={n} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '14px 24px' }}><div className="skeleton" style={{ width: '80%', height: 14 }} /></td>
                      <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ width: '70%', height: 14 }} /></td>
                      <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ width: '50%', height: 14 }} /></td>
                      <td style={{ padding: '14px 16px' }}><div className="skeleton skeleton-badge" /></td>
                      <td style={{ padding: '14px 24px' }}><div className="skeleton" style={{ width: '60%', height: 14 }} /></td>
                    </tr>
                  ))}
                </>
              ) : error ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <AlertTriangle size={40} color="var(--color-error)" aria-hidden="true" style={{ marginBottom: 12 }} />
                    <p style={{ color: 'var(--color-text)', fontSize: '0.95rem', fontWeight: 500, marginBottom: 8 }}>
                      Something went wrong
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
                      We couldn&apos;t load the data. Check your connection and try again.
                    </p>
                    <button onClick={() => refetch()} className="btn-primary-sm">
                      Try Again
                    </button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '48px 24px',
                      textAlign: 'center',
                    }}
                  >
                    <ClipboardCheck size={36} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem' }}>
                      No invoices awaiting review. You&apos;re all caught up!
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="row-interactive"
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 24px',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                      }}
                    >
                      <Link className="row-primary-link" to={`/invoices/${inv.id}`}>
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      {inv.company}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 500,
                      }}
                    >
                      {formatCurrency(inv.amount)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td
                      style={{
                        padding: '14px 24px',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {formatDate(inv.submissionDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '12px 24px',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} in queue
        </div>
      </div>
    </div>
  )
}
