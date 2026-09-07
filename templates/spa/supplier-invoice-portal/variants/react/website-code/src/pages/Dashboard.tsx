import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Clock, CheckCircle, DollarSign, Plus, AlertTriangle, XCircle, ClipboardCheck } from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle'
import { useCountUp } from '../hooks/useCountUp'
import { useAuth } from '../hooks/useAuth'
import { useAuthorization } from '../hooks/useAuthorization'
import { useDashboardMetrics, useRecentInvoices, formatCurrency, formatDate } from '../data/invoiceProvider'
import StatusBadge from '../components/StatusBadge'

function AnimatedValue({ value }: { value: string | number }) {
  const numericValue = typeof value === 'number' ? value : 0
  const animated = useCountUp(numericValue)
  if (typeof value === 'string') return <span className="count-up">{value}</span>
  return <span className="count-up">{animated}</span>
}

export default function Dashboard() {
  usePageTitle('Dashboard')
  const { displayName } = useAuth()
  const { isReviewer } = useAuthorization()
  const { metrics: m, isLoading: metricsLoading } = useDashboardMetrics(isReviewer)
  const { invoices: recentInvoices, isLoading: invoicesLoading } = useRecentInvoices(5, isReviewer)

  const metrics = useMemo(() => {
    if (isReviewer) {
      return [
        {
          label: 'Awaiting Review',
          value: m.pendingReview,
          icon: Clock,
          color: 'var(--color-warning)',
          bg: 'var(--color-warning-light)',
          filterPath: '/review',
        },
        {
          label: 'Under Review',
          value: m.total - m.pendingReview - m.totalProcessed,
          icon: ClipboardCheck,
          color: 'var(--color-info)',
          bg: 'var(--color-info-light)',
          filterPath: '/invoices?status=Under+Review',
        },
        {
          label: 'Approved',
          value: m.approved,
          icon: CheckCircle,
          color: 'var(--color-success)',
          bg: 'var(--color-success-light)',
          filterPath: '/invoices?status=Approved',
        },
        {
          label: 'Rejected',
          value: m.rejected,
          icon: XCircle,
          color: 'var(--color-error)',
          bg: 'var(--color-error-light)',
          filterPath: '/invoices?status=Rejected',
        },
        {
          label: 'Total Processed',
          value: m.totalProcessed,
          icon: FileText,
          color: 'var(--color-primary)',
          bg: 'var(--color-primary-light)',
          filterPath: '/invoices',
        },
      ]
    }
    return [
      {
        label: 'Total Invoices',
        value: m.total,
        icon: FileText,
        color: 'var(--color-primary)',
        bg: 'var(--color-primary-light)',
        filterPath: '/invoices',
      },
      {
        label: 'Needs Revision',
        value: m.needsRevision,
        icon: AlertTriangle,
        color: 'var(--color-revision)',
        bg: 'var(--color-revision-light)',
        filterPath: '/invoices?status=Needs+Revision',
      },
      {
        label: 'Pending Review',
        value: m.pendingReview,
        icon: Clock,
        color: 'var(--color-warning)',
        bg: 'var(--color-warning-light)',
        filterPath: '/invoices?status=Under+Review',
      },
      {
        label: 'Approved',
        value: m.approved,
        icon: CheckCircle,
        color: 'var(--color-success)',
        bg: 'var(--color-success-light)',
        filterPath: '/invoices?status=Approved',
      },
      {
        label: 'Total Paid',
        value: formatCurrency(m.totalPaid),
        icon: DollarSign,
        color: 'var(--color-info)',
        bg: 'var(--color-info-light)',
        filterPath: '/invoices?status=Paid',
      },
    ]
  }, [m, isReviewer])

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Welcome Banner */}
      <div
        className="animate-in"
        style={{
          background: isReviewer
            ? 'linear-gradient(135deg, #1A2B1E, var(--color-primary), var(--color-secondary))'
            : 'linear-gradient(135deg, #1A2B1E, #1E3E2B, var(--color-primary))',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -40,
            right: -20,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(90,124,94,0.25), transparent 70%)',
          }}
        />
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.6rem',
            fontWeight: 600,
            color: '#fff',
            marginBottom: 6,
            position: 'relative',
          }}
        >
          Welcome back, {displayName}
        </h1>
        <p
          style={{
            fontSize: '0.925rem',
            color: 'rgba(255,255,255,0.7)',
            position: 'relative',
          }}
        >
          {isReviewer ? "Here\u2019s your review queue" : "Here\u2019s your invoice summary"}
        </p>
      </div>

      {/* Onboarding card for first-time users */}
      {!metricsLoading && m.total === 0 && (
        <div className="onboarding-card animate-in animate-in-1" style={{ marginBottom: 28 }}>
          <FileText size={40} color="var(--color-primary)" aria-hidden="true" style={{ marginBottom: 12 }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8 }}>Get started with your first invoice</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            {isReviewer
              ? 'Create a purchase order to get started. Suppliers will submit invoices against your POs.'
              : 'Submit your first invoice to get started. Select a purchase order and fill in the details.'}
          </p>
          <Link to={isReviewer ? '/purchase-orders/new' : '/invoices/new'} className="btn-primary">
            {isReviewer ? 'Create Purchase Order' : 'Submit Invoice'}
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      {metricsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '22px 24px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius)' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton" style={{ width: '40%', height: 24 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        {metrics.map((m, i) => (
          <Link
            key={m.label}
            to={m.filterPath}
            className={`animate-in animate-in-${i + 1} card-interactive`}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px 24px',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius)',
                background: m.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <m.icon size={20} color={m.color} aria-hidden="true" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  marginBottom: 2,
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                }}
              >
                <AnimatedValue value={m.value} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}

      {/* Recent Invoices */}
      <div
        className="animate-in animate-in-5"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.05rem',
                fontWeight: 600,
              }}
            >
              {isReviewer ? 'Invoices Awaiting Review' : 'Recent Invoices'}
            </h2>
            <Link
              to={isReviewer ? '/review' : '/invoices'}
              style={{
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'var(--color-primary)',
                textDecoration: 'none',
              }}
            >
              View All &rarr;
            </Link>
          </div>
          {!isReviewer && (
            <Link to="/invoices/new" className="btn-primary-sm">
              <Plus size={15} aria-hidden="true" /> Submit New Invoice
            </Link>
          )}
        </div>

        {invoicesLoading ? (
          <div style={{ padding: '32px 24px' }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div className="skeleton" style={{ width: '20%', height: 14 }} />
                <div className="skeleton" style={{ width: '15%', height: 14 }} />
                <div className="skeleton" style={{ width: '12%', height: 14 }} />
                <div className="skeleton skeleton-badge" style={{ width: 70 }} />
                <div className="skeleton" style={{ width: '15%', height: 14 }} />
              </div>
            ))}
          </div>
        ) : recentInvoices.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={40} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', marginBottom: 16 }}>
              {isReviewer ? 'No invoices awaiting review.' : 'No invoices yet. Submit your first invoice to get started.'}
            </p>
            {!isReviewer && (
              <Link to="/invoices/new" className="btn-primary-sm">
                <Plus size={15} aria-hidden="true" /> Submit Invoice
              </Link>
            )}
          </div>
        ) : (
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
                <th style={{ padding: '10px 24px', fontWeight: 500 }}>Invoice #</th>
                {isReviewer && <th style={{ padding: '10px 16px', fontWeight: 500 }}>Supplier</th>}
                <th style={{ padding: '10px 16px', fontWeight: 500 }}>PO #</th>
                <th style={{ padding: '10px 16px', fontWeight: 500 }}>Amount</th>
                <th style={{ padding: '10px 16px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '10px 24px', fontWeight: 500 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
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
                  {isReviewer && (
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      {inv.company}
                    </td>
                  )}
                  <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    {inv.poNumber}
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
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  )
}
