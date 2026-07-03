import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { site } from '../data/site'
import { AuthButton } from './AuthButton'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style>{navbarCSS}</style>
      <header className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="navbar-inner container">
          <NavLink to="/" className="brand" aria-label={`${site.name} — Home`} onClick={() => setOpen(false)}>
            <span className="brand-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" focusable="false">
                <path d="M4 16 C4 11 8 8 14 8 C20 8 24 11 24 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M3.5 17.5 H24.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M5 21 C8 19.5 12 19.5 14 21 C16 22.5 20 22.5 23 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M9 6 C9 4.5 10 3.5 10 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M14 6 C14 4.5 15 3.5 15 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M19 6 C19 4.5 20 3.5 20 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="brand-text">
              <span className="brand-line-1">Smoking</span>
              <span className="brand-line-2">Burgers</span>
            </span>
          </NavLink>

          <button
            type="button"
            className={`menu-toggle ${open ? 'is-open' : ''}`}
            aria-expanded={open}
            aria-controls="primary-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(o => !o)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          <nav id="primary-nav" className={`primary-nav ${open ? 'is-open' : ''}`} aria-label="Primary">
            <ul>
              {site.nav.map(item => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li className="nav-auth">
                <AuthButton />
              </li>
            </ul>
          </nav>
        </div>
      </header>
    </>
  )
}

const navbarCSS = `
.navbar {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100;
  background: linear-gradient(180deg, rgba(14, 11, 10, 0.72) 0%, rgba(14, 11, 10, 0.0) 100%);
  backdrop-filter: blur(0px);
  transition: background 0.4s var(--ease-out), backdrop-filter 0.4s var(--ease-out), border-color 0.4s var(--ease-out);
  border-bottom: 1px solid transparent;
}
.navbar.is-scrolled {
  background: rgba(14, 11, 10, 0.85);
  backdrop-filter: blur(14px);
  border-bottom-color: var(--color-border);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: 18px;
  padding-bottom: 18px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--color-secondary);
  text-decoration: none;
}
.brand:hover { color: var(--color-primary); }
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px; height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(201, 137, 61, 0.18), rgba(168, 52, 28, 0.12));
  border: 1px solid var(--color-border-hot);
  color: var(--color-secondary);
}
.brand-text {
  display: flex; flex-direction: column;
  font-family: var(--font-display);
  line-height: 1;
}
.brand-line-1 {
  font-size: 11px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--color-text-muted);
  font-family: var(--font-body);
}
.brand-line-2 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.01em;
  margin-top: 4px;
  color: var(--color-text);
}

.primary-nav ul {
  display: flex; align-items: center; gap: 36px;
  list-style: none; padding: 0; margin: 0;
}
.nav-auth {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
}
.nav-link {
  position: relative;
  font-family: var(--font-body);
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 6px 0;
  transition: color 0.25s var(--ease-out);
}
.nav-link::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -2px;
  height: 1px;
  background: var(--color-primary);
  transform: scaleX(0); transform-origin: left;
  transition: transform 0.4s var(--ease-cinematic);
}
.nav-link:hover { color: var(--color-text); }
.nav-link:hover::after { transform: scaleX(1); }
.nav-link.is-active { color: var(--color-secondary); }
.nav-link.is-active::after { transform: scaleX(1); }

.menu-toggle {
  display: none;
  background: transparent;
  border: 1px solid var(--color-border-hot);
  border-radius: 10px;
  width: 44px; height: 44px;
  padding: 0;
  align-items: center; justify-content: center;
  flex-direction: column; gap: 5px;
}
.menu-toggle span {
  display: block;
  width: 20px; height: 1.5px;
  background: var(--color-text);
  transition: transform 0.3s var(--ease-cinematic), opacity 0.2s ease;
}
.menu-toggle.is-open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.menu-toggle.is-open span:nth-child(2) { opacity: 0; }
.menu-toggle.is-open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

@media (max-width: 820px) {
  .menu-toggle { display: inline-flex; }
  .primary-nav {
    position: fixed;
    inset: 76px 0 auto 0;
    background: rgba(14, 11, 10, 0.96);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    transform: translateY(-12px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s var(--ease-out), transform 0.3s var(--ease-cinematic);
  }
  .primary-nav.is-open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  .primary-nav ul {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 16px 24px 24px;
  }
  .primary-nav .nav-link {
    display: block;
    padding: 16px 4px;
    border-bottom: 1px solid var(--color-border);
    font-size: 16px;
  }
  .primary-nav li:last-child .nav-link { border-bottom: none; }
  .nav-auth {
    margin-left: 0;
    padding: 16px 4px;
    border-top: 1px solid var(--color-border);
  }
}
`
