import { useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import { useSessionKeepAlive } from '../hooks/useSessionKeepAlive'

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const handleSessionExpired = useCallback(() => {
    navigate('/login?sessionExpired=true')
  }, [navigate])
  useSessionKeepAlive({ onSessionExpired: handleSessionExpired })

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <style>{layoutCSS}</style>
      <Navbar />
      <main id="main" className="site-main">
        {children}
      </main>
      <Footer />
    </>
  )
}

const layoutCSS = `
.skip-link {
  position: absolute;
  left: 16px;
  top: -100px;
  z-index: 200;
  background: var(--color-primary);
  color: #1A1207;
  padding: 12px 18px;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.06em;
  transition: top 0.2s ease;
}
.skip-link:focus {
  top: 16px;
  outline: 2px solid var(--color-secondary);
  outline-offset: 3px;
}
.site-main { min-height: 60vh; }
`
