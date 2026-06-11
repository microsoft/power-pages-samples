import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AUTH_PROVIDERS,
  EXTERNAL_PROVIDERS,
  LOCAL_PROVIDER,
  loginWithProvider,
  getAuthError,
  getSessionExpiredMessage,
  TermsRequiredError,
} from '../services/authService'
import { site } from '../data/site'

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required'
  if (!isEmail(v.trim())) return 'Enter a valid email address'
  return ''
}
function validatePassword(v: string) {
  if (!v) return 'Password is required'
  return ''
}

export default function Login() {
  const navigate = useNavigate()

  const invitationCode = useMemo(
    () => new URLSearchParams(window.location.search).get('invitationCode') || undefined,
    [],
  )
  const passwordResetSuccess = useMemo(
    () => new URLSearchParams(window.location.search).get('message') === 'password_reset_success',
    [],
  )

  const [externalSubmittingId, setExternalSubmittingId] = useState<string | undefined>()
  const [serverError, setServerError] = useState<string | undefined>(() =>
    passwordResetSuccess ? undefined : getAuthError(),
  )
  const [infoMessage, setInfoMessage] = useState<string | undefined>(() => {
    if (passwordResetSuccess) {
      return 'Your password has been reset. Please sign in with your new password.'
    }
    if (invitationCode) {
      return `Sign in to redeem invitation ${invitationCode}. It will be linked to your account after you sign in.`
    }
    return getSessionExpiredMessage()
  })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false)

  const showError = (field: string) => (touched[field] ? errors[field] : '')

  useEffect(() => {
    document.title = `Sign in — ${site.name}`
  }, [])

  function handleExternalSignIn(providerId: string) {
    const provider = AUTH_PROVIDERS.find(p => p.id === providerId)
    if (!provider) return
    setServerError(undefined)
    setInfoMessage(undefined)
    setExternalSubmittingId(providerId)
    loginWithProvider(provider, { returnUrl: '/', invitationCode }).catch(err => {
      if (err instanceof TermsRequiredError) {
        navigate('/terms')
        return
      }
      setServerError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      setExternalSubmittingId(undefined)
    })
  }

  function handleLocalChange(field: 'email' | 'password', value: string) {
    if (field === 'email') setEmail(value)
    if (field === 'password') setPassword(value)
    if (serverError) setServerError(undefined)
    if (touched[field]) {
      const err = field === 'email' ? validateEmail(value) : validatePassword(value)
      setErrors(prev => {
        const next = { ...prev }
        if (err) next[field] = err
        else delete next[field]
        return next
      })
    }
  }

  function handleLocalBlur(field: 'email' | 'password') {
    setTouched(prev => ({ ...prev, [field]: true }))
    const value = field === 'email' ? email : password
    const err = field === 'email' ? validateEmail(value) : validatePassword(value)
    setErrors(prev => {
      const next = { ...prev }
      if (err) next[field] = err
      else delete next[field]
      return next
    })
  }

  function handleLocalSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!LOCAL_PROVIDER) return
    setTouched({ email: true, password: true })
    const newErrors: Record<string, string> = {}
    const ev = validateEmail(email)
    const pv = validatePassword(password)
    if (ev) newErrors.email = ev
    if (pv) newErrors.password = pv
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsSubmittingLocal(true)
    setServerError(undefined)
    setInfoMessage(undefined)
    loginWithProvider(LOCAL_PROVIDER, {
      returnUrl: '/',
      invitationCode,
      credentials: { credential: email.trim(), password, rememberMe },
    }).catch(err => {
      if (err instanceof TermsRequiredError) {
        navigate('/terms')
        return
      }
      setServerError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      setIsSubmittingLocal(false)
    })
  }

  const anySubmitting = isSubmittingLocal || !!externalSubmittingId

  return (
    <>
      <style>{loginCSS}</style>
      <div className="auth-page">
        <div className="auth-card surface">
          <header className="auth-card-head">
            <span className="eyebrow">Welcome back</span>
            <h1 className="auth-title">Sign in to {site.name}</h1>
            <p className="auth-lede">Choose how you'd like to sign in.</p>
          </header>

          {infoMessage && (
            <div className="auth-banner auth-banner-info" role="status">
              {infoMessage}
            </div>
          )}
          {serverError && (
            <div className="auth-banner auth-banner-error" role="alert">
              {serverError}
            </div>
          )}

          {EXTERNAL_PROVIDERS.length > 0 && (
            <div className="auth-providers">
              {EXTERNAL_PROVIDERS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="btn btn-ghost auth-provider-btn"
                  disabled={anySubmitting}
                  onClick={() => handleExternalSignIn(p.id)}
                >
                  {externalSubmittingId === p.id ? 'Redirecting…' : p.displayName}
                </button>
              ))}
            </div>
          )}

          {LOCAL_PROVIDER && EXTERNAL_PROVIDERS.length > 0 && (
            <div className="auth-divider" role="separator" aria-label="or sign in with email">
              <span>or sign in with email</span>
            </div>
          )}

          {LOCAL_PROVIDER && (
            <form className="auth-form" noValidate onSubmit={handleLocalSubmit}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className={`auth-input${showError('email') ? ' has-error' : ''}`}
                  value={email}
                  disabled={anySubmitting}
                  onChange={e => handleLocalChange('email', e.target.value)}
                  onBlur={() => handleLocalBlur('email')}
                />
                {showError('email') && (
                  <span className="auth-field-error" role="alert">{errors.email}</span>
                )}
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  className={`auth-input${showError('password') ? ' has-error' : ''}`}
                  value={password}
                  disabled={anySubmitting}
                  onChange={e => handleLocalChange('password', e.target.value)}
                  onBlur={() => handleLocalBlur('password')}
                />
                {showError('password') && (
                  <span className="auth-field-error" role="alert">{errors.password}</span>
                )}
              </div>
              <div className="auth-row">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    disabled={anySubmitting}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
              </div>
              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={anySubmitting}
              >
                {isSubmittingLocal ? 'Signing in…' : 'Sign in'}
              </button>
              <p className="auth-footer-link">
                Don't have an account?{' '}
                <Link to={invitationCode ? `/registration?invitationCode=${encodeURIComponent(invitationCode)}` : '/registration'}>
                  Create one
                </Link>
              </p>
              <p className="auth-footer-link">
                Have an invitation code?{' '}
                <Link to="/redeem-invitation">Redeem it</Link>
              </p>
            </form>
          )}

          <p className="auth-footnote">
            By signing in you agree to our{' '}
            <Link to="/terms">terms and conditions</Link>.
          </p>
        </div>
      </div>
    </>
  )
}

const loginCSS = `
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}

.auth-card {
  width: 100%;
  max-width: 560px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}

.auth-card-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.auth-title {
  font-size: clamp(28px, 4vw, 40px);
}

.auth-lede {
  color: var(--color-text-muted);
  font-size: 16px;
}

.auth-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
}
.auth-banner-info {
  background: rgba(232, 184, 108, 0.08);
  border-color: rgba(232, 184, 108, 0.35);
  color: var(--color-secondary);
}
.auth-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}

.auth-providers {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.auth-provider-btn {
  flex: 1 1 220px;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.auth-provider-btn:disabled {
  opacity: 0.6;
  cursor: progress;
  transform: none;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-subtle);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.auth-divider::before, .auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.auth-input {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: rgba(20, 16, 14, 0.5);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
  transition: border-color 0.2s var(--ease-out), background 0.2s var(--ease-out);
}
.auth-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(20, 16, 14, 0.7);
}
.auth-input.has-error {
  border-color: rgba(168, 52, 28, 0.7);
}
.auth-input:disabled { opacity: 0.6; }

.auth-field-error {
  font-size: 13px;
  color: #f3c2b6;
}

.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.auth-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: pointer;
}
.auth-check input { accent-color: var(--color-primary); }

.auth-link {
  font-size: 13px;
  color: var(--color-secondary);
  text-decoration: none;
}
.auth-link:hover { text-decoration: underline; }

.auth-submit {
  align-self: stretch;
  justify-content: center;
  padding: 12px 18px;
}
.auth-submit:disabled { opacity: 0.6; cursor: progress; }

.auth-footer-link {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}
.auth-footer-link a {
  color: var(--color-secondary);
  text-decoration: none;
}
.auth-footer-link a:hover { text-decoration: underline; }

.auth-footnote {
  color: var(--color-text-subtle);
  font-size: 13px;
  text-align: center;
}
`
