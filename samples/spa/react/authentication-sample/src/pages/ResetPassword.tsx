import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../services/authService'
import { site } from '../data/site'

const hasLower = (v: string) => /[a-z]/.test(v)
const hasUpper = (v: string) => /[A-Z]/.test(v)
const hasDigit = (v: string) => /[0-9]/.test(v)
const hasSpecial = (v: string) => /[^A-Za-z0-9]/.test(v)

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

export default function ResetPassword() {
  const { userId, code } = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      userId: params.get('UserId') || params.get('userId') || '',
      code: params.get('Code') || params.get('code') || '',
    }
  }, [])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [serverError, setServerError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = `Reset password — ${site.name}`
  }, [])

  const showError = (field: string) => (touched[field] ? errors[field] : '')

  const invalidLink = !userId || !code

  function handleChange(field: 'password' | 'confirm', value: string) {
    if (field === 'password') setPassword(value)
    if (field === 'confirm') setConfirm(value)
    if (serverError) setServerError(undefined)
    if (touched[field]) {
      const err = field === 'password' ? validatePassword(value) : validateConfirm(password, value)
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

  function handleBlur(field: 'password' | 'confirm') {
    setTouched(prev => ({ ...prev, [field]: true }))
    const err = field === 'password' ? validatePassword(password) : validateConfirm(password, confirm)
    setErrors(prev => {
      const next = { ...prev }
      if (err) next[field] = err
      else delete next[field]
      return next
    })
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ password: true, confirm: true })
    const pv = validatePassword(password)
    const cv = validateConfirm(password, confirm)
    const newErrors: Record<string, string> = {}
    if (pv) newErrors.password = pv
    if (cv) newErrors.confirm = cv
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsSubmitting(true)
    setServerError(undefined)
    resetPassword(userId, code, password, confirm).catch(err => {
      setServerError(err instanceof Error ? err.message : 'Password reset failed. The link may have expired.')
      setIsSubmitting(false)
    })
  }

  return (
    <>
      <style>{resetCSS}</style>
      <div className="auth-page">
        <div className="auth-card surface">
          <header className="auth-card-head">
            <span className="eyebrow">Reset password</span>
            <h1 className="auth-title">Choose a new password</h1>
          </header>

          {invalidLink ? (
            <div className="auth-banner auth-banner-error" role="alert">
              <p style={{ margin: 0 }}>
                This reset link is invalid or has expired.
              </p>
              <p style={{ margin: '8px 0 0' }}>
                <Link to="/forgot-password" className="auth-link">Request a new reset link</Link>
              </p>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="auth-banner auth-banner-error" role="alert">{serverError}</div>
              )}
              <form className="auth-form" noValidate onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="rp-password">New password</label>
                  <input
                    id="rp-password"
                    type="password"
                    autoComplete="new-password"
                    className={`auth-input${showError('password') ? ' has-error' : ''}`}
                    value={password}
                    disabled={isSubmitting}
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
                  <label className="auth-label" htmlFor="rp-confirm">Confirm new password</label>
                  <input
                    id="rp-confirm"
                    type="password"
                    autoComplete="new-password"
                    className={`auth-input${showError('confirm') ? ' has-error' : ''}`}
                    value={confirm}
                    disabled={isSubmitting}
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Resetting…' : 'Reset password'}
                </button>
                <p className="auth-footer-link">
                  <Link to="/login">Back to sign in</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const resetCSS = `
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}
.auth-card {
  width: 100%;
  max-width: 480px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}
.auth-card-head { display: flex; flex-direction: column; gap: var(--space-3); }
.auth-title { font-size: clamp(28px, 4vw, 40px); }

.auth-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
}
.auth-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}

.auth-form { display: flex; flex-direction: column; gap: var(--space-4); }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-label {
  font-size: 12px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
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

.auth-link {
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
.auth-footer-link a { color: var(--color-secondary); text-decoration: none; }
.auth-footer-link a:hover { text-decoration: underline; }
`
