import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../services/authService'
import { site } from '../data/site'

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required'
  if (!isEmail(v.trim())) return 'Enter a valid email address'
  return ''
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<string | undefined>()
  const [emailSent, setEmailSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = `Reset password — ${site.name}`
  }, [])

  function handleChange(value: string) {
    setEmail(value)
    if (serverError) setServerError(undefined)
    if (touched) setError(validateEmail(value))
  }

  function handleBlur() {
    setTouched(true)
    setError(validateEmail(email))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched(true)
    const err = validateEmail(email)
    setError(err)
    if (err) return

    setIsSubmitting(true)
    setServerError(undefined)
    forgotPassword(email.trim())
      .then(() => {
        setEmailSent(true)
        setIsSubmitting(false)
      })
      .catch(e => {
        setServerError(e instanceof Error ? e.message : 'Could not send the reset email. Please try again.')
        setIsSubmitting(false)
      })
  }

  return (
    <>
      <style>{forgotCSS}</style>
      <div className="auth-page">
        <div className="auth-card surface">
          <header className="auth-card-head">
            <span className="eyebrow">Forgot password</span>
            <h1 className="auth-title">Reset your password</h1>
            <p className="auth-lede">
              Enter the email address on your account and we'll send you a link to reset your password.
            </p>
          </header>

          {emailSent ? (
            <div className="auth-success" role="status">
              <span className="auth-success-check" aria-hidden="true">✓</span>
              <p>
                We've sent a password reset link to <strong>{email}</strong>.
                Please check your inbox and follow the instructions. The link expires after a short time.
              </p>
              <Link to="/login" className="btn btn-primary auth-submit">Back to sign in</Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="auth-banner auth-banner-error" role="alert">
                  {serverError}
                </div>
              )}
              <form className="auth-form" noValidate onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="fp-email">Email</label>
                  <input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    className={`auth-input${touched && error ? ' has-error' : ''}`}
                    value={email}
                    disabled={isSubmitting}
                    onChange={e => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />
                  {touched && error && (
                    <span className="auth-field-error" role="alert">{error}</span>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn-primary auth-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending…' : 'Send reset link'}
                </button>
                <p className="auth-footer-link">
                  Remembered it? <Link to="/login">Back to sign in</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const forgotCSS = `
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

.auth-submit {
  align-self: stretch;
  justify-content: center;
  padding: 12px 18px;
  text-decoration: none;
}
.auth-submit:disabled { opacity: 0.6; cursor: progress; }

.auth-footer-link {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}
.auth-footer-link a { color: var(--color-secondary); text-decoration: none; }
.auth-footer-link a:hover { text-decoration: underline; }

.auth-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}
.auth-success-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(46, 125, 50, 0.18);
  color: #6dd26d;
  font-size: 24px;
  font-weight: 700;
}
.auth-success p {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.6;
}
`
