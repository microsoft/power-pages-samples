import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function AuthButton() {
  const { isAuthenticated, isLoading, displayName, initials, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onClickAway(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [menuOpen])

  return (
    <>
      <style>{authButtonCSS}</style>
      {isLoading ? (
        <div className="auth-button auth-loading" aria-label="Loading sign-in status">
          <span className="auth-spinner" aria-hidden="true" />
        </div>
      ) : !isAuthenticated ? (
        <Link to="/login" className="auth-button auth-sign-in">
          Sign in
        </Link>
      ) : (
        <div className="auth-button auth-signed-in" ref={menuRef}>
          <button
            type="button"
            className="auth-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <span className="auth-avatar" aria-hidden="true">
              {initials || '·'}
            </span>
            <span className="auth-name">{displayName}</span>
            <svg
              className={`auth-caret ${menuOpen ? 'is-open' : ''}`}
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
            >
              <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {menuOpen && (
            <div role="menu" className="auth-menu">
              <div className="auth-menu-user">
                <span className="auth-menu-name">{displayName}</span>
              </div>
              <Link
                role="menuitem"
                to="/user-profile"
                className="auth-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                role="menuitem"
                type="button"
                className="auth-menu-item"
                onClick={() => logout()}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

const authButtonCSS = `
.auth-button {
  display: inline-flex;
  align-items: center;
  position: relative;
}

.auth-sign-in {
  padding: 9px 18px;
  border-radius: 999px;
  border: 1px solid var(--color-border-hot);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.25s var(--ease-out), color 0.25s var(--ease-out), background 0.25s var(--ease-out);
}
.auth-sign-in:hover {
  border-color: var(--color-primary);
  color: var(--color-secondary);
  background: rgba(201, 137, 61, 0.08);
}
.auth-sign-in:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.auth-loading {
  width: 36px;
  height: 36px;
  justify-content: center;
}
.auth-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--color-text-muted);
  border-right-color: transparent;
  border-radius: 50%;
  animation: auth-spin 0.7s linear infinite;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }

.auth-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  background: transparent;
  border: 1px solid var(--color-border-hot);
  border-radius: 999px;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.25s var(--ease-out), background 0.25s var(--ease-out);
}
.auth-trigger:hover {
  border-color: var(--color-primary);
  background: rgba(201, 137, 61, 0.08);
}
.auth-trigger:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.auth-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #1A1207;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.auth-name {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text);
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-caret {
  color: var(--color-text-muted);
  transition: transform 0.2s var(--ease-out);
}
.auth-caret.is-open { transform: rotate(180deg); }

.auth-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 200px;
  padding: 8px;
  background: rgba(20, 16, 14, 0.98);
  border: 1px solid var(--color-border-hot);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  z-index: 110;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.auth-menu-user {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}
.auth-menu-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.auth-menu-item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  text-align: left;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  cursor: pointer;
  text-decoration: none;
  box-sizing: border-box;
  transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out);
}
.auth-menu-item:hover {
  background: rgba(201, 137, 61, 0.1);
  color: var(--color-secondary);
}
.auth-menu-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

@media (max-width: 820px) {
  .auth-name { max-width: 100px; }
}
`
