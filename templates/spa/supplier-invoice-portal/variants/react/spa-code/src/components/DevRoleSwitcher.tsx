import { getDevRole, setDevRole } from '../services/authService'
import type { DevRole } from '../services/authService'

const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

export default function DevRoleSwitcher() {
  if (!isDev) return null

  const current = getDevRole()

  function switchRole(role: DevRole) {
    if (role === current) return
    setDevRole(role)
    window.location.reload()
  }

  return (
    <div
      className="dev-role-switcher"
      role="region"
      aria-label="Development user role"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 9999,
        display: 'flex',
        gap: 0,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: 'var(--font-heading)',
      }}
    >
      <button
        type="button"
        aria-pressed={current === 'supplier'}
        onClick={() => switchRole('supplier')}
        style={{
          padding: '6px 14px',
          background: current === 'supplier' ? 'var(--color-primary)' : 'var(--color-sidebar)',
          color: current === 'supplier' ? '#fff' : 'var(--color-sidebar-text)',
          border: 'none',
          cursor: current === 'supplier' ? 'default' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        Supplier
      </button>
      <button
        type="button"
        aria-pressed={current === 'reviewer'}
        onClick={() => switchRole('reviewer')}
        style={{
          padding: '6px 14px',
          background: current === 'reviewer' ? 'var(--color-status-accent-text)' : 'var(--color-sidebar)',
          color: current === 'reviewer' ? '#fff' : 'var(--color-sidebar-text)',
          border: 'none',
          cursor: current === 'reviewer' ? 'default' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        Reviewer
      </button>
    </div>
  )
}
