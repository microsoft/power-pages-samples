/** Skeleton loading placeholders — shimmer rectangles that mimic page layout. */

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: borderRadius ?? undefined,
        ...style,
      }}
    />
  )
}

/** Grid of card placeholders (Services, Knowledge) */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="page">
      <div className="container">
        <h1 className="sr-only">Loading content</h1>
        {/* Header area */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Skeleton width={240} height={32} style={{ margin: '0 auto 12px' }} borderRadius={8} />
          <Skeleton width={320} height={16} style={{ margin: '0 auto' }} borderRadius={6} />
        </div>
        {/* Card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Skeleton width={40} height={40} borderRadius={10} />
                <Skeleton width="60%" height={18} />
              </div>
              <Skeleton width="90%" height={12} style={{ marginBottom: 8 }} />
              <Skeleton width="70%" height={12} style={{ marginBottom: 16 }} />
              <Skeleton width={80} height={24} borderRadius={100} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Detail page placeholder (ServiceDetail, ArticleDetail, CreateRequest) */
export function SkeletonDetail() {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="sr-only">Loading content</h1>
        {/* Breadcrumb bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <Skeleton width={60} height={14} />
          <Skeleton width={80} height={14} />
          <Skeleton width={120} height={14} />
        </div>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Skeleton width={56} height={56} borderRadius={14} />
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height={28} style={{ marginBottom: 8 }} />
            <Skeleton width={100} height={22} borderRadius={100} />
          </div>
        </div>
        {/* Content card */}
        <div className="skeleton-card">
          <Skeleton width="100%" height={16} style={{ marginBottom: 12 }} />
          <Skeleton width="95%" height={16} style={{ marginBottom: 12 }} />
          <Skeleton width="80%" height={16} style={{ marginBottom: 24 }} />
          <Skeleton width="60%" height={16} style={{ marginBottom: 12 }} />
          <Skeleton width="90%" height={16} style={{ marginBottom: 12 }} />
          <Skeleton width="40%" height={16} />
        </div>
      </div>
    </div>
  )
}

/** Admin table placeholder */
export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Skeleton width={200} height={28} style={{ marginBottom: 8 }} />
            <Skeleton width={260} height={14} />
          </div>
          <Skeleton width={100} height={36} borderRadius={10} />
        </div>
        {/* Status bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width={90} height={48} borderRadius={10} />
          ))}
        </div>
        {/* Table */}
        <div className="skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'flex', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface-alt)' }}>
            <Skeleton width={60} height={14} />
            <Skeleton width={120} height={14} style={{ flex: 1 }} />
            <Skeleton width={70} height={14} />
            <Skeleton width={60} height={14} />
            <Skeleton width={50} height={14} />
            <Skeleton width={90} height={14} />
            <Skeleton width={70} height={14} />
            <Skeleton width={50} height={14} />
          </div>
          {/* Data rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 20px', alignItems: 'center', borderBottom: i < rows - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
              <Skeleton width={60} height={12} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Skeleton width={24} height={24} borderRadius={6} />
                <Skeleton width="70%" height={12} />
              </div>
              <Skeleton width={70} height={22} borderRadius={100} />
              <Skeleton width={55} height={22} borderRadius={100} />
              <Skeleton width={60} height={12} />
              <Skeleton width={90} height={12} />
              <Skeleton width={60} height={12} />
              <Skeleton width={50} height={28} borderRadius={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Request map page placeholder */
export function SkeletonMap() {
  return (
    <div className="page">
      <div className="container">
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <Skeleton width={280} height={32} style={{ marginBottom: 8 }} />
          <Skeleton width={400} height={14} />
        </div>
        {/* Map rectangle */}
        <Skeleton width="100%" height={420} borderRadius={14} style={{ marginBottom: 24 }} />
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Skeleton width={70} height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={44} borderRadius={10} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Skeleton width={50} height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={44} borderRadius={10} />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <Skeleton width={60} height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={44} borderRadius={10} />
          </div>
        </div>
        {/* Result cards */}
        <Skeleton width={140} height={14} style={{ marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Skeleton width={24} height={24} borderRadius={6} />
                <Skeleton width={70} height={22} borderRadius={100} />
              </div>
              <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
              <Skeleton width="90%" height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
