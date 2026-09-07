import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Page Not Found')
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <FileQuestion
        size={56}
        color="var(--color-text-muted)"
        aria-hidden="true"
        style={{ marginBottom: 16 }}
      />
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.75rem',
          marginBottom: 8,
        }}
      >
        Page Not Found
      </h1>
      <p
        style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.95rem',
          marginBottom: 24,
        }}
      >
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>
        Go to Dashboard
      </Link>
    </div>
  )
}
