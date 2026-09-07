import { type ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import PowerPagesBadge from './PowerPagesBadge'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header />
      <main id="main-content" tabIndex={-1} style={{ flex: 1 }}>{children}</main>
      <Footer />
      <PowerPagesBadge />
    </div>
  )
}
