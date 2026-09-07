import { useState } from 'react'
// react-router-dom not needed — login is handled by form POST
import {
  FileText, Send, Clock, ArrowRight, Shield, Zap,
  CheckCircle2, BarChart3, Upload, Search, CreditCard, Users, Lock, Bell,
  LogIn,
} from 'lucide-react'
import powerPagesLogo from '../assets/PowerPages_scalable.svg'
import usePageTitle from '../hooks/usePageTitle'
import { login, localLogin } from '../services/authService'

const stats = [
  { value: '10,000+', label: 'Invoices processed', icon: FileText },
  { value: '3 days', label: 'Avg. payment time', icon: Clock },
  { value: '99.9%', label: 'Platform uptime', icon: Zap },
  { value: '500+', label: 'Active suppliers', icon: Users },
]

const steps = [
  {
    num: '01',
    icon: Upload,
    title: 'Submit',
    desc: 'Upload your invoice with PO reference and attachments in seconds.',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-light)',
  },
  {
    num: '02',
    icon: Search,
    title: 'Track',
    desc: 'Monitor real-time status from submission through review to approval.',
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-light)',
  },
  {
    num: '03',
    icon: CreditCard,
    title: 'Get Paid',
    desc: 'Receive payment faster with transparent processing and direct approvals.',
    color: 'var(--color-success)',
    bg: 'var(--color-success-light)',
  },
]

const capabilities = [
  { icon: Send, title: 'One-Click Submission', desc: 'Submit invoices against POs with drag-and-drop attachments.' },
  { icon: BarChart3, title: 'Live Dashboard', desc: 'See all invoices, amounts, and statuses at a glance.' },
  { icon: Bell, title: 'Instant Notifications', desc: 'Get notified the moment your invoice status changes.' },
  { icon: Clock, title: 'Full History', desc: 'Complete audit trail with timestamps for every status change.' },
  { icon: Shield, title: 'Secure & Compliant', desc: 'Enterprise-grade security for all your financial data.' },
  { icon: Lock, title: 'Role-Based Access', desc: 'Controlled permissions ensure the right people see the right data.' },
]

/** Sign-in card — always visible in the hero right panel */
function SignInCard() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) return
    setError(null)
    setIsSubmitting(true)
    try {
      const loginError = await localLogin(username, password, false, '/dashboard')
      if (loginError) {
        setError(loginError)
      }
    } catch {
      setError('Sign-in failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-body)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    transition: 'border-color 0.2s',
  }

  return (
    <div
      style={ {
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.12)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: 400,
      } }
    >
      {/* Card header */ }
      <div style={ { padding: '24px 28px 0' } }>
        <h2
          style={ {
            fontFamily: 'var(--font-heading)',
            fontSize: '1.15rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: 4,
          } }
        >
          Sign in
        </h2>
        <p style={ { fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 0 } }>
          Access your supplier portal
        </p>
      </div>

      {/* Local login form */ }
      <form onSubmit={ handleSubmit } style={ { padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 } }>
        { error && (
          <div
            role="alert"
            style={ {
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              background: 'var(--color-error-light, #fef2f2)',
              border: '1px solid var(--color-error, #d13438)',
              color: 'var(--color-error, #d13438)',
              fontSize: '0.82rem',
              lineHeight: 1.4,
            } }
          >
            { error }
          </div>
        ) }
        <div>
          <label htmlFor="login-username" style={ { display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: 5, color: 'var(--color-text)' } }>
            Email or username
          </label>
          <input
            id="login-username"
            type="text"
            value={ username }
            onChange={ (e) => { setUsername(e.target.value); setError(null) } }
            style={ inputStyle }
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" style={ { display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: 5, color: 'var(--color-text)' } }>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={ password }
            onChange={ (e) => { setPassword(e.target.value); setError(null) } }
            style={ inputStyle }
            autoComplete="current-password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={ isSubmitting }
          className="btn-primary"
          style={ { width: '100%', justifyContent: 'center', padding: '11px 16px', marginTop: 2 } }
        >
          { isSubmitting ? (
            <><span className="btn-spinner" aria-hidden="true" /> Signing in...</>
          ) : (
            <><LogIn size={ 16 } aria-hidden="true" /> Sign In</>
          ) }
        </button>
      </form>

      {/* Divider */ }
      <div style={ { padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12 } }>
        <div style={ { flex: 1, height: 1, background: 'var(--color-border)' } } />
        <span style={ { fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' } }>or</span>
        <div style={ { flex: 1, height: 1, background: 'var(--color-border)' } } />
      </div>

      {/* Entra ID login */ }
      <div style={ { padding: '16px 28px 24px' } }>
        <button
          onClick={ () => login('/dashboard') }
          type="button"
          style={ {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '11px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '0.88rem',
            fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          } }
          onMouseEnter={ (e) => { e.currentTarget.style.background = 'var(--color-bg)'; e.currentTarget.style.borderColor = 'var(--color-text-muted)' } }
          onMouseLeave={ (e) => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.borderColor = 'var(--color-border)' } }
        >
          {/* Microsoft logo */ }
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="7" height="7" fill="#F25022" />
            <rect x="8.5" y="0.5" width="7" height="7" fill="#7FBA00" />
            <rect x="0.5" y="8.5" width="7" height="7" fill="#00A4EF" />
            <rect x="8.5" y="8.5" width="7" height="7" fill="#FFB900" />
          </svg>
          Continue with Microsoft
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  usePageTitle('')
  return (
    <div style={ { minHeight: '100vh', display: 'flex', flexDirection: 'column' } }>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Public Header */ }
      <header
        className="landing-header"
        style={ {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-primary-dark)',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        } }
      >
        <div style={ { display: 'flex', alignItems: 'center', gap: 10 } }>
          <div
            style={ {
              width: 34,
              height: 34,
              borderRadius: 'var(--radius)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            } }
          >
            <FileText size={ 18 } color="var(--color-primary)" aria-hidden="true" />
          </div>
          <span
            style={ {
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '1rem',
              color: '#fff',
            } }
          >
            Supplier Invoice Portal
          </span>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
      {/* Hero — split layout */ }
      <section
        className="landing-hero"
        style={ {
          background: 'var(--color-primary-dark)',
          position: 'relative',
          overflow: 'hidden',
        } }
      >
        <div
          className="landing-hero-inner"
          style={ {
            position: 'relative',
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 48,
            flexWrap: 'wrap',
          } }
        >
          {/* Left — text */ }
          <div className="animate-in" style={ { flex: '1 1 400px', minWidth: 0 } }>
            <div
              style={ {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 9999,
                background: '#3E694A',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 500,
                marginBottom: 20,
              } }
            >
              <Zap size={ 13 } aria-hidden="true" /> Streamlined for suppliers
            </div>
            <h1
              className="landing-hero-title"
              style={ {
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                color: '#fff',
                lineHeight: 1.15,
                marginBottom: 16,
              } }
            >
              Submit invoices. Track payments. Get paid faster.
            </h1>
            <p
              style={ {
                fontSize: '1.1rem',
                color: '#fff',
                maxWidth: 480,
                lineHeight: 1.6,
                marginBottom: 28,
              } }
            >
              One portal to manage your entire invoicing lifecycle — from submission through approval to payment.
            </p>
            <div style={ { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' } }>
              <button
                onClick={ () => document.getElementById('login-username')?.focus() }
                className="btn-hero"
                style={ { border: 'none', cursor: 'pointer' } }
              >
                Get Started <ArrowRight size={ 18 } aria-hidden="true" />
              </button>
              <span style={ { fontSize: '0.82rem', color: '#fff' } }>Sign in to start managing invoices</span>
            </div>
          </div>

          {/* Right — sign in card */ }
          <div
            id="signin-card"
            className="animate-in animate-in-3 landing-hero-visual"
            style={ {
              flex: '0 1 400px',
              display: 'flex',
              justifyContent: 'center',
            } }
          >
            <SignInCard />
          </div>
        </div>
      </section>

      {/* Stats bar */ }
      <section
        style={ {
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        } }
      >
        <div
          className="landing-stats"
          style={ {
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 0,
          } }
        >
          { stats.map((s, i) => (
            <div
              key={ s.label }
              className={ `animate-in animate-in-${i + 1}` }
              style={ {
                padding: '24px 20px',
                textAlign: 'center',
                borderRight: i < stats.length - 1 ? '1px solid var(--color-border)' : 'none',
              } }
            >
              <s.icon size={ 18 } color="var(--color-primary)" aria-hidden="true" style={ { marginBottom: 6 } } />
              <div style={ { fontSize: '1.35rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--color-text)' } }>
                { s.value }
              </div>
              <div style={ { fontSize: '0.78rem', color: 'var(--color-text-muted)' } }>{ s.label }</div>
            </div>
          )) }
        </div>
      </section>

      {/* How it works */ }
      <section className="landing-section" style={ { maxWidth: 1100, margin: '0 auto', width: '100%' } }>
        <div className="animate-in" style={ { textAlign: 'center', marginBottom: 40 } }>
          <h2 style={ { fontSize: '1.6rem', fontFamily: 'var(--font-heading)', marginBottom: 8 } }>
            How it works
          </h2>
          <p style={ { color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: 500, margin: '0 auto' } }>
            Three simple steps from invoice submission to payment.
          </p>
        </div>
        <div
          className="landing-steps"
          style={ {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          } }
        >
          { steps.map((s, i) => (
            <div
              key={ s.title }
              className={ `animate-in animate-in-${i + 2}` }
              style={ {
                position: 'relative',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px 24px',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
              } }
            >
              <div style={ { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } }>
                <div
                  style={ {
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius)',
                    background: s.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  } }
                >
                  <s.icon size={ 20 } color={ s.color } aria-hidden="true" />
                </div>
                <span style={ { fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' } }>
                  STEP { s.num }
                </span>
              </div>
              <h3 style={ { fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 } }>
                { s.title }
              </h3>
              <p style={ { fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 } }>
                { s.desc }
              </p>
              {/* Connector arrow */ }
              { i < steps.length - 1 && (
                <div
                  className="step-connector"
                  aria-hidden="true"
                  style={ {
                    position: 'absolute',
                    right: -16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-border)',
                    zIndex: 1,
                  } }
                >
                  <ArrowRight size={ 20 } />
                </div>
              ) }
            </div>
          )) }
        </div>
      </section>

      {/* Capabilities grid */ }
      <section
        style={ {
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        } }
      >
        <div className="landing-section" style={ { maxWidth: 1100, margin: '0 auto', width: '100%' } }>
          <div className="animate-in" style={ { textAlign: 'center', marginBottom: 36 } }>
            <h2 style={ { fontSize: '1.6rem', fontFamily: 'var(--font-heading)', marginBottom: 8 } }>
              Everything you need
            </h2>
            <p style={ { color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: 480, margin: '0 auto' } }>
              Built for suppliers who want visibility and speed.
            </p>
          </div>
          <div
            style={ {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 16,
            } }
          >
            { capabilities.map((c) => (
              <div
                key={ c.title }
                style={ {
                  display: 'flex',
                  gap: 14,
                  padding: '20px',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                } }
              >
                <div
                  style={ {
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius)',
                    background: 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  } }
                >
                  <c.icon size={ 18 } color="var(--color-primary)" aria-hidden="true" />
                </div>
                <div>
                  <h3 style={ { fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 } }>
                    { c.title }
                  </h3>
                  <p
                    style={ {
                      position: 'relative',
                      zIndex: 1,
                      background: '#fff',
                      fontSize: '0.84rem',
                      color: '#556B58',
                      lineHeight: 1.45,
                    } }
                  >
                    { c.desc }
                  </p>
                </div>
              </div>
            )) }
          </div>
        </div>
      </section>

      {/* CTA banner */ }
      <section
        className="landing-section"
        style={ {
          textAlign: 'center',
          maxWidth: 700,
          margin: '0 auto',
          width: '100%',
        } }
      >
        <div className="animate-in">
          <CheckCircle2 size={ 32 } color="var(--color-primary)" aria-hidden="true" style={ { marginBottom: 12 } } />
          <h2 style={ { fontSize: '1.5rem', fontFamily: 'var(--font-heading)', marginBottom: 10 } }>
            Ready to streamline your invoicing?
          </h2>
          <p style={ { color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: 24, maxWidth: 440, margin: '0 auto 24px' } }>
            Join hundreds of suppliers already using the portal to submit, track, and get paid faster.
          </p>
          <button
            onClick={ () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => document.getElementById('login-username')?.focus(), 500) } }
            className="btn-hero"
            style={ { boxShadow: 'var(--shadow-md)', border: 'none', cursor: 'pointer' } }
          >
            Sign In to Your Portal <ArrowRight size={ 18 } aria-hidden="true" />
          </button>
        </div>
      </section>
      </main>

      {/* Footer */ }
      <footer
        className="landing-footer"
        style={ {
          marginTop: 'auto',
          fontSize: '0.825rem',
          color: 'var(--color-text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          borderTop: '1px solid var(--color-border)',
        } }
      >
        <span>&copy; { new Date().getFullYear() } Contoso Supplies Ltd. All rights reserved.</span>
        <div style={ { display: 'flex', gap: 20 } }>
          { ['Help', 'Privacy', 'Terms'].map((label) => (
            <span key={ label } style={ { color: 'var(--color-text-muted)', fontSize: '0.85rem' } }>{ label }</span>
          )) }
        </div>
      </footer>

      {/* Powered by badge — bottom right, hidden on mobile */ }
      <aside
        aria-label="Platform information"
        className="powered-badge"
        style={ {
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 9999,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          fontSize: '0.7rem',
          color: 'var(--color-text-muted)',
          zIndex: 20,
          whiteSpace: 'nowrap',
        } }
      >
        <img src={ powerPagesLogo } width="14" height="14" alt="" aria-hidden="true" />
        Built with <span style={ { fontWeight: 600, color: 'var(--color-text)' } }>Microsoft Power Pages</span>
      </aside>
    </div>
  )
}
