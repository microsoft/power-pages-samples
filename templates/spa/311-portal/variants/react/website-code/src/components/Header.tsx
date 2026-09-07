import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogIn, LogOut, UserCog, ChevronDown } from 'lucide-react'
import { useAuth } from '../shared/hooks/useAuth'
import { useI18n } from '../i18n'
import ZavaLogo from './ZavaLogo'
import LanguageSwitcher from './LanguageSwitcher'
import './Header.css'
import './HeaderAuth.css'

const navLinkKeys = [
  { to: '/', labelKey: 'nav.home', exact: true },
  { to: '/services', labelKey: 'nav.services' },
  { to: '/track', labelKey: 'nav.trackRequest' },
  { to: '/requests/map', labelKey: 'nav.exploreMap' },
  { to: '/knowledge', labelKey: 'nav.knowledgeBase' },
  { to: '/contact', labelKey: 'nav.contact' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const { isAuthenticated, user, signIn, signOut } = useAuth()
  const { t } = useI18n()

  // Close the account menu on an outside click or Escape, the two dismissals
  // users expect from a dropdown.
  useEffect(() => {
    if (!userMenuOpen) return

    const onPointerDown = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false)
        userMenuButtonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [userMenuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        mobileMenuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  // Any navigation should dismiss both menus.
  useEffect(() => {
    setUserMenuOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  const isActive = (link: typeof navLinkKeys[0]) =>
    link.exact ? location.pathname === link.to : location.pathname.startsWith(link.to)

  return (
    <header className="site-header">
      <div className="header-topbar">
        <div className="header-container">
          <span className="header-topbar-text">{t('header.topbarText')}</span>
          <div className="header-auth">
            {isAuthenticated && user ? (
              <div className="header-user-menu" ref={userMenuRef}>
                <button
                  ref={userMenuButtonRef}
                  type="button"
                  className="header-user-trigger"
                  onClick={() => setUserMenuOpen(open => !open)}
                  aria-expanded={userMenuOpen}
                  aria-controls="header-user-dropdown"
                >
                  <span className="header-user-avatar">{user.initials}</span>
                  <span className="header-user-name">{user.displayName}</span>
                  <ChevronDown size={13} className={userMenuOpen ? 'is-open' : ''} />
                </button>

                {userMenuOpen && (
                  <div id="header-user-dropdown" className="header-user-dropdown">
                    <Link
                      to="/user-profile"
                      className="header-user-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserCog size={15} />
                      {t('userProfile.menuItem')}
                    </Link>
                    <button
                      type="button"
                      className="header-user-item"
                      onClick={signOut}
                    >
                      <LogOut size={15} />
                      {t('common.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" className="header-signin-link" onClick={() => signIn()}>
                <LogIn size={13} />
                {t('common.signIn')}
              </button>
            )}
            <span className="header-auth-divider" />
            <LanguageSwitcher />
            <span className="header-auth-divider" />
            <Link to="/admin" className="header-topbar-link">{t('nav.admin')}</Link>
          </div>
        </div>
      </div>
      <nav className="header-nav" aria-label="Main navigation">
        <div className="header-container">
          <Link to="/" className="header-logo" aria-label={t('header.logoAria')}>
            <ZavaLogo size={32} />
            <div className="header-logo-wordmark">
              <span className="header-logo-text">ZAVA</span>
              <span className="header-logo-311">311</span>
            </div>
          </Link>

          <div className="header-desktop-nav">
            {navLinkKeys.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`header-nav-link ${isActive(link) ? 'active' : ''}`}
                aria-current={isActive(link) ? 'page' : undefined}
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <Link to="/services" className="btn btn-accent btn-sm">
              {t('nav.reportIssue')}
            </Link>
          </div>

          <button
            ref={mobileMenuButtonRef}
            type="button"
            className="header-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="header-mobile-menu"
            aria-label={t('header.toggleMenu')}
          >
            <span className={`header-menu-line ${menuOpen ? 'open-1' : ''}`} />
            <span className={`header-menu-line ${menuOpen ? 'open-2' : ''}`} />
            <span className={`header-menu-line ${menuOpen ? 'open-3' : ''}`} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <nav id="header-mobile-menu" className="header-mobile-menu" aria-label="Mobile navigation">
          {navLinkKeys.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`header-mobile-link ${isActive(link) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(link) ? 'page' : undefined}
            >
              {t(link.labelKey)}
            </Link>
          ))}
          <Link
            to="/services"
            className="btn btn-accent header-mobile-cta"
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.reportIssue')}
          </Link>
          <div className="header-mobile-auth">
            {isAuthenticated && user ? (
              <>
                <div className="header-mobile-user">
                  <span className="header-user-avatar">{user.initials}</span>
                  <span className="header-mobile-user-name">{user.displayName}</span>
                </div>
                <Link
                  to="/user-profile"
                  className="header-mobile-profile"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserCog size={16} />
                  {t('userProfile.menuItem')}
                </Link>
                <button type="button" className="header-mobile-signout" onClick={signOut}>
                  <LogOut size={16} />
                  {t('common.signOut')}
                </button>
              </>
            ) : (
              <button type="button" className="header-mobile-signin" onClick={() => signIn()}>
                <LogIn size={16} />
                {t('common.signIn')}
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
