/**
 * Skeleton loader that matches the InvoiceDetail page layout.
 * Shown while the API request is in flight.
 */
export default function InvoiceDetailSkeleton() {
  return (
    <div style={{ maxWidth: 800 }} aria-busy="true" aria-label="Loading invoice details">
      {/* Breadcrumb skeleton */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 70, height: 14 }} />
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <div className="skeleton" style={{ width: 80, height: 14 }} />
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <div className="skeleton" style={{ width: 100, height: 14 }} />
      </div>

      {/* Title + badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div className="skeleton skeleton-title" style={{ width: 200 }} />
        <div className="skeleton skeleton-badge" />
      </div>

      {/* Status stepper skeleton */}
      <div className="skeleton-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 5 ? 1 : '0 0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
                <div className="skeleton skeleton-dot" />
                <div className="skeleton skeleton-text" style={{ width: 50, marginTop: 8, marginBottom: 0 }} />
              </div>
              {n < 5 && <div className="skeleton skeleton-line" style={{ marginTop: 0, minWidth: 20 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Details card skeleton */}
      <div className="skeleton-card">
        <div className="skeleton skeleton-text-lg" style={{ width: 130 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 16 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} style={{ display: 'flex', gap: 10 }}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--radius)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                <div className="skeleton skeleton-text" style={{ width: '70%' }} />
              </div>
            </div>
          ))}
        </div>
        {/* Description placeholder */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
          <div className="skeleton skeleton-text" style={{ width: '30%' }} />
          <div className="skeleton skeleton-text" style={{ width: '100%' }} />
          <div className="skeleton skeleton-text" style={{ width: '85%' }} />
        </div>
      </div>

      {/* Attachments card skeleton */}
      <div className="skeleton-card">
        <div className="skeleton skeleton-text-lg" style={{ width: 170 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {[1, 2].map((n) => (
            <div
              key={n}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div className="skeleton" style={{ width: 15, height: 15 }} />
              <div className="skeleton skeleton-text" style={{ flex: 1, marginBottom: 0 }} />
              <div className="skeleton" style={{ width: 40, height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
