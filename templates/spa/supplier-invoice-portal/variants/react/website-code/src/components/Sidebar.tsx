import { useState, useRef, useEffect, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FilePlus, FileText, X, LogOut, User, ChevronUp, LogIn, ClipboardCheck, ShoppingCart } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAuthorization } from '../hooks/useAuthorization'
import { getInvoiceCountByStatus } from '../services/invoiceService'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end: boolean; badgeKey?: string }

const supplierNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: false },
  { to: '/invoices/new', label: 'Submit Invoice', icon: FilePlus, end: false },
  { to: '/invoices', label: 'My Invoices', icon: FileText, end: true, badgeKey: 'needsRevision' },
  { to: '/purchase-orders', label: 'My POs', icon: ShoppingCart, end: true },
]

const reviewerNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: false },
  { to: '/review', label: 'Review Queue', icon: ClipboardCheck, end: false, badgeKey: 'awaitingReview' },
  { to: '/invoices', label: 'All Invoices', icon: FileText, end: true },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, end: true },
  // { to: '/reviewer-help', label: 'Policy Search', icon: Sparkles, end: false },
]

export default function Sidebar({
  onClose,
  autoFocusClose = false,
}: {
  onClose?: () => void
  autoFocusClose?: boolean
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, displayName, initials, login, logout } = useAuth()
  const { isReviewer } = useAuthorization()
  const navItems = useMemo(() => isReviewer ? reviewerNavItems : supplierNavItems, [isReviewer])

  // Fetch badge counts
  const [badges, setBadges] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    getInvoiceCountByStatus().then((counts) => {
      if (cancelled) return
      const awaitingReview = counts
        .filter((c) => c.status === 'Submitted' || c.status === 'Under Review')
        .reduce((sum, c) => sum + c.count, 0)
      const needsRevision = counts
        .filter((c) => c.status === 'Needs Revision')
        .reduce((sum, c) => sum + c.count, 0)
      setBadges({ awaitingReview, needsRevision })
    }).catch(() => { /* silent — badges are non-critical */ })
    return () => { cancelled = true }
  }, [isAuthenticated])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function focusMenuItem(position: 'first' | 'last') {
    requestAnimationFrame(() => {
      const items = userMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
      if (!items?.length) return
      items[position === 'first' ? 0 : items.length - 1].focus()
    })
  }

  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      userMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    )
    if (!items.length) return
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)

    if (e.key === 'Escape') {
      e.preventDefault()
      setUserMenuOpen(false)
      userMenuTriggerRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(currentIndex + 1) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(currentIndex - 1 + items.length) % items.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1].focus()
    }
  }

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        background: 'var(--color-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0 0',
        flexShrink: 0,
      }}
    >
      {/* Logo / branding */}
      <div
        style={{
          padding: '0 20px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={16} color="#fff" aria-hidden="true" />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '0.95rem',
              color: '#fff',
            }}
          >
            Invoice Portal
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            autoFocus={autoFocusClose}
            onClick={onClose}
            aria-label="Close navigation"
            className="sidebar-close-btn"
            style={{
              background: 'transparent',
              color: 'var(--color-sidebar-text)',
              padding: 4,
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" style={{ flex: 1, padding: '8px 12px' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `sidebar-nav-link${isActive ? ' sidebar-nav-link--active' : ''}`
                }
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#fff' : 'var(--color-sidebar-text)',
                  background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                  textDecoration: 'none',
                })}
              >
                <item.icon size={18} aria-hidden="true" />
                {item.label}
                {item.badgeKey && badges[item.badgeKey] > 0 && (
                  <span className="nav-badge" aria-label={`${badges[item.badgeKey]} items`}>
                    {badges[item.badgeKey]}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section: notifications + user menu */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '12px',
        }}
      >
        {isLoading ? null : !isAuthenticated ? (
          /* Sign In button for unauthenticated users */
          <button
            onClick={() => login()}
            className="sidebar-nav-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: '#fff',
              background: 'var(--color-sidebar-active)',
              width: '100%',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <LogIn size={18} aria-hidden="true" />
            Sign In
          </button>
        ) : (
          <>
            {/* User menu */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                ref={userMenuTriggerRef}
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-controls="sidebar-user-menu"
                aria-label="User menu"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    setUserMenuOpen(true)
                    focusMenuItem(e.key === 'ArrowDown' ? 'first' : 'last')
                  }
                }}
                className="sidebar-user-trigger"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius)',
                  background: userMenuOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-heading)',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {displayName}
                  </div>
                  {isReviewer && (
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: 1,
                      }}
                    >
                      Reviewer
                    </div>
                  )}
                </div>
                <ChevronUp
                  size={14}
                  aria-hidden="true"
                  style={{
                    color: 'var(--color-sidebar-text)',
                    flexShrink: 0,
                    transform: userMenuOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {userMenuOpen && (
                <div
                  id="sidebar-user-menu"
                  role="menu"
                  onKeyDown={handleMenuKeyDown}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: '100%',
                    marginBottom: 4,
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--color-border)',
                    padding: 6,
                    zIndex: 50,
                    animation: 'scaleIn 0.15s ease-out',
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); navigate('/profile') }}
                    className="menu-item"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <User size={15} aria-hidden="true" /> Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); logout() }}
                    className="menu-item menu-item--danger"
                  >
                    <LogOut size={15} aria-hidden="true" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
