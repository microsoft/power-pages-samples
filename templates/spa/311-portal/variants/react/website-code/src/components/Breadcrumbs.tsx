import { Link } from 'react-router-dom'

interface Crumb {
  label: string
  to?: string
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
      <ol style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        listStyle: 'none',
        padding: 0,
        margin: 0,
        fontSize: '0.8125rem',
        fontFamily: 'var(--font-body)',
        flexWrap: 'wrap',
      }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem' }}>/</span>}
            {item.to ? (
              <Link to={item.to} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                {item.label}
              </Link>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
