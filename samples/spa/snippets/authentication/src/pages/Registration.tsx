import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AUTH_PROVIDERS,
  EXTERNAL_PROVIDERS,
  LOCAL_PROVIDER,
  register,
  loginWithProvider,
  fetchInvitationDetails,
  TermsRequiredError,
  getAuthError,
} from '../services/authService'
import { useAuth } from '../hooks/useAuth'
import { site } from '../data/site'

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const hasLower = (v: string) => /[a-z]/.test(v)
const hasUpper = (v: string) => /[A-Z]/.test(v)
const hasDigit = (v: string) => /[0-9]/.test(v)
const hasSpecial = (v: string) => /[^A-Za-z0-9]/.test(v)

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required'
  if (!isEmail(v.trim())) return 'Enter a valid email address'
  return ''
}

function validatePassword(v: string) {
  if (!v) return 'Password is required'
  if (v.length < 8) return 'Password must be at least 8 characters'
  const categories = [hasLower(v), hasUpper(v), hasDigit(v), hasSpecial(v)].filter(Boolean).length
  if (categories < 3) return 'Use at least 3 of: lowercase, uppercase, digit, special character'
  return ''
}

function validateConfirm(password: string, confirm: string) {
  if (!confirm) return 'Please confirm your password'
  if (confirm !== password) return 'Passwords do not match'
  return ''
}

const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

export default function Registration() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const invitationCode = useMemo(
    () =>
      new URLSearchParams(window.location.search).get('invitationCode') ||
      new URLSearchParams(window.location.search).get('invitation') ||
      undefined,
    [],
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [externalSubmittingId, setExternalSubmittingId] = useState<string | undefined>()
  const [serverError, setServerError] = useState<string | undefined>(() => getAuthError())

  const showError = (field: string) => (touched[field] ? errors[field] : '')

  useEffect(() => {
    document.title = `Create account — ${site.name}`
  }, [])

  useEffect(() => {
    if (isAuthenticated && !isDev) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (!invitationCode) return
    fetchInvitationDetails(invitationCode)
      .then(details => {
        if (details.email) setEmail(details.email)
      })
      .catch(() => {
        /* silent — user can enter email manually */
      })
  }, [invitationCode])

  function handleChange(field: 'email' | 'password' | 'confirm', value: string) {
    if (field === 'email') setEmail(value)
    if (field === 'password') setPassword(value)
    if (field === 'confirm') setConfirm(value)
    if (serverError) setServerError(undefined)
    if (touched[field]) {
      let err = ''
      if (field === 'email') err = validateEmail(value)
      if (field === 'password') err = validatePassword(value)
      if (field === 'confirm') err = validateConfirm(password, value)
      setErrors(prev => {
        const next = { ...prev }
        if (err) next[field] = err
        else delete next[field]
        if (field === 'password' && touched.confirm) {
          const ce = validateConfirm(value, confirm)
          if (ce) next.confirm = ce
          else delete next.confirm
        }
        return next
      })
    }
  }

  function handleBlur(field: 'email' | 'password' | 'confirm') {
    setTouched(prev => ({ ...prev, [field]: true }))
    let err = ''
    if (field === 'email') err = validateEmail(email)
    if (field === 'password') err = validatePassword(password)
    if (field === 'confirm') err = validateConfirm(password, confirm)
    setErrors(prev => {
      const next = { ...prev }
      if (err) next[field] = err
      else delete next[field]
      return next
    })
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!LOCAL_PROVIDER) return
    setTouched({ email: true, password: true, confirm: true })
    const ev = validateEmail(email)
    const pv = validatePassword(password)
    const cv = validateConfirm(password, confirm)
    const newErrors: Record<string, string> = {}
    if (ev) newErrors.email = ev
    if (pv) newErrors.password = pv
    if (cv) newErrors.confirm = cv
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsSubmitting(true)
    setServerError(undefined)
    register(
      { email: email.trim(), password, confirmPassword: confirm },
      '/',
      invitationCode,
    ).catch(err => {
      if (err instanceof TermsRequiredError) {
        navigate('/terms')
        return
      }
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
      setIsSubmitting(false)
    })
  }

  function handleExternalSignUp(providerId: string) {
    const provider = AUTH_PROVIDERS.find(p => p.id === providerId)
    if (!provider) return
    setServerError(undefined)
    setExternalSubmittingId(providerId)
    loginWithProvider(provider, { returnUrl: '/', invitationCode }).catch(err => {
      if (err instanceof TermsRequiredError) {
        navigate('/terms')
        return
      }
      setServerError(err instanceof Error ? err.message : 'Sign-up failed. Please try again.')
      setExternalSubmittingId(undefined)
    })
  }

  const anySubmitting = isSubmitting || !!externalSubmittingId

  return (
    <>
      <style>{registrationCSS}</style>
      <div className="auth-page">
        <div className="auth-card surface">
          <header className="auth-card-head">
            <span className="eyebrow">Join us</span>
            <h1 className="auth-title">Create your {site.name} account</h1>
            <p className="auth-lede">
              {invitationCode
                ? 'Complete sign-up to redeem your invitation.'
                : 'Sign up to track orders, save favorites, and get exclusive offers.'}
            </p>
          </header>

          {invitationCode && (
            <div className="auth-banner auth-banner-info" role="status">
              You're redeeming invitation <strong>{invitationCode}</strong>.
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
                  onClick={() => handleExternalSignUp(p.id)}
                >
                  {externalSubmittingId === p.id
                    ? 'Redirecting…'
                    : `Sign up with ${p.displayName.replace(/^Sign in with /i, '').replace(/ sign in$/i, '')}`}
                </button>
              ))}
            </div>
          )}

          {LOCAL_PROVIDER && EXTERNAL_PROVIDERS.length > 0 && (
            <div className="auth-divider" role="separator" aria-label="or sign up with email">
              <span>or sign up with email</span>
            </div>
          )}

          {LOCAL_PROVIDER && (
            <form className="auth-form" noValidate onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  className={`auth-input${showError('email') ? ' has-error' : ''}`}
                  value={email}
                  disabled={anySubmitting}
                  onChange={e => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
                {showError('email') && (
                  <span className="auth-field-error" role="alert">{errors.email}</span>
                )}
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  className={`auth-input${showError('password') ? ' has-error' : ''}`}
                  value={password}
                  disabled={anySubmitting}
                  onChange={e => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                />
                {showError('password') ? (
                  <span className="auth-field-error" role="alert">{errors.password}</span>
                ) : (
                  <span className="auth-help">
                    At least 8 characters, including 3 of: lowercase, uppercase, digit, special character.
                  </span>
                )}
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-confirm">Confirm password</label>
                <input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  className={`auth-input${showError('confirm') ? ' has-error' : ''}`}
                  value={confirm}
                  disabled={anySubmitting}
                  onChange={e => handleChange('confirm', e.target.value)}
                  onBlur={() => handleBlur('confirm')}
                />
                {showError('confirm') && (
                  <span className="auth-field-error" role="alert">{errors.confirm}</span>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={anySubmitting}
              >
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </button>
              <p className="auth-footer-link">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </form>
          )}

          <p className="auth-footnote">
            By creating an account you agree to our{' '}
            <Link to="/terms">terms and conditions</Link>.
          </p>
        </div>
      </div>
    </>
  )
}

const registrationCSS = `
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

.auth-card-head { display: flex; flex-direction: column; gap: var(--space-3); }
.auth-title { font-size: clamp(28px, 4vw, 40px); }
.auth-lede { color: var(--color-text-muted); font-size: 16px; }

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

.auth-providers { display: flex; flex-wrap: wrap; gap: 12px; }
.auth-provider-btn {
  flex: 1 1 220px;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.auth-provider-btn:disabled { opacity: 0.6; cursor: progress; transform: none; }

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

.auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
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
.auth-input.has-error { border-color: rgba(168, 52, 28, 0.7); }
.auth-input:disabled { opacity: 0.6; }

.auth-field-error { font-size: 13px; color: #f3c2b6; }
.auth-help { font-size: 12px; color: var(--color-text-subtle); }

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
.auth-footer-link a { color: var(--color-secondary); text-decoration: none; }
.auth-footer-link a:hover { text-decoration: underline; }

.auth-footnote {
  color: var(--color-text-subtle);
  font-size: 13px;
  text-align: center;
}
`
