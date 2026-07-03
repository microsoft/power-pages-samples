import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { redeemInvitation } from '../services/authService'
import { site } from '../data/site'

function validateCode(v: string) {
  if (!v || !v.trim()) return 'Invitation code is required'
  return ''
}

export default function RedeemInvitation() {
  const navigate = useNavigate()

  const initialCode = (() => {
    const params = new URLSearchParams(window.location.search)
    return (
      params.get('invitation') ||
      params.get('InvitationCode') ||
      params.get('invitationCode') ||
      params.get('code') ||
      ''
    )
  })()

  const [code, setCode] = useState(initialCode)
  const [redeemByLogin, setRedeemByLogin] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = `Redeem invitation — ${site.name}`
  }, [])

  function handleChange(value: string) {
    setCode(value)
    if (serverError) setServerError(undefined)
    if (touched) setError(validateCode(value))
  }

  function handleBlur() {
    setTouched(true)
    setError(validateCode(code))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched(true)
    const err = validateCode(code)
    setError(err)
    if (err) return

    setIsSubmitting(true)
    setServerError(undefined)
    redeemInvitation(code.trim(), redeemByLogin)
      .then(result => {
        const target = result.nextStep === 'register' ? '/registration' : '/login'
        navigate(`${target}?invitationCode=${encodeURIComponent(code.trim())}`)
      })
      .catch(err => {
        setServerError(err instanceof Error ? err.message : 'Unable to verify invitation.')
        setIsSubmitting(false)
      })
  }

  return (
    <>
      <style>{redeemCSS}</style>
      <div className="auth-page">
        <div className="auth-card surface">
          <header className="auth-card-head">
            <span className="eyebrow">You're invited</span>
            <h1 className="auth-title">Redeem your invitation</h1>
            <p className="auth-lede">
              Enter the invitation code from your email to continue.
            </p>
          </header>

          {serverError && (
            <div className="auth-banner auth-banner-error" role="alert">{serverError}</div>
          )}

          <form className="auth-form" noValidate onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="inv-code">Invitation code</label>
              <input
                id="inv-code"
                type="text"
                autoComplete="off"
                className={`auth-input${touched && error ? ' has-error' : ''}`}
                value={code}
                disabled={isSubmitting}
                onChange={e => handleChange(e.target.value)}
                onBlur={handleBlur}
              />
              {touched && error && (
                <span className="auth-field-error" role="alert">{error}</span>
              )}
            </div>
            <label className="auth-check">
              <input
                type="checkbox"
                checked={redeemByLogin}
                disabled={isSubmitting}
                onChange={e => setRedeemByLogin(e.target.checked)}
              />
              <span>Sign in with an existing account instead of registering</span>
            </label>
            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying…' : 'Continue'}
            </button>
            <p className="auth-footer-link">
              <Link to="/login">Back to sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </>
  )
}

const redeemCSS = `
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
.auth-lede { color: var(--color-text-muted); font-size: 16px; }

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

.auth-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: pointer;
}
.auth-check input { accent-color: var(--color-primary); }

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
