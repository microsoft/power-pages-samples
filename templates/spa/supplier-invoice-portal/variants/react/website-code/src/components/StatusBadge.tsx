import { memo } from 'react'

const statusStyles: Record<string, { bg: string; color: string }> = {
  // Invoice statuses
  Draft: { bg: 'var(--color-bg)', color: 'var(--color-text-muted)' },
  Submitted: { bg: 'var(--color-info-light)', color: 'var(--color-status-info-text)' },
  'Under Review': { bg: 'var(--color-warning-light)', color: 'var(--color-status-warning-text)' },
  'Needs Revision': { bg: 'var(--color-revision-light)', color: 'var(--color-revision)' },
  Approved: { bg: 'var(--color-success-light)', color: 'var(--color-status-success-text)' },
  Rejected: { bg: 'var(--color-error-light)', color: 'var(--color-status-error-text)' },
  Paid: { bg: 'var(--color-accent-light)', color: 'var(--color-status-accent-text)' },
  // PO statuses
  Issued: { bg: 'var(--color-info-light)', color: 'var(--color-status-issued-text)' },
  'Partially Invoiced': { bg: 'var(--color-warning-light)', color: 'var(--color-status-warning-text)' },
  'Fully Invoiced': { bg: 'var(--color-success-light)', color: 'var(--color-status-success-text)' },
  Closed: { bg: 'var(--color-bg)', color: 'var(--color-text-muted)' },
  Cancelled: { bg: 'var(--color-error-light)', color: 'var(--color-status-error-text)' },
}

const defaultStyle = { bg: 'var(--color-bg)', color: 'var(--color-text-muted)' }

export default memo(function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] || defaultStyle
  return (
    <span
      className={status === 'Needs Revision' ? 'badge-pulse' : undefined}
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        lineHeight: 1.5,
        background: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  )
})
