import { type ReactNode, useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

const publicRoutes = ['/']

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const isPublic = publicRoutes.includes(pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const isInitialRender = useRef(true)

  useEffect(() => {
    setSidebarOpen(false)
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    requestAnimationFrame(() => document.getElementById('main-content')?.focus())
  }, [pathname])

  useEffect(() => {
    if (!sidebarOpen) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setSidebarOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  useEffect(() => {
    const main = document.getElementById('main-content')
    if (!main) return
    main.inert = sidebarOpen
    return () => {
      main.inert = false
    }
  }, [sidebarOpen])

  function closeSidebar() {
    setSidebarOpen(false)
    requestAnimationFrame(() => menuButtonRef.current?.focus())
  }

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Skip to content — accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(42, 31, 22, 0.5)',
            zIndex: 40,
          }}
          className="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        id="sidebar-navigation"
        className={`sidebar-container ${sidebarOpen ? 'sidebar-open' : ''}`}
      >
        <Sidebar onClose={closeSidebar} autoFocusClose={sidebarOpen} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Mobile header - only hamburger menu */}
        <div className="mobile-topbar">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-navigation"
            className="mobile-menu-btn btn-ghost"
            style={{ color: 'var(--color-text)' }}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="main-content"
          style={{
            flex: 1,
            overflow: 'auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
