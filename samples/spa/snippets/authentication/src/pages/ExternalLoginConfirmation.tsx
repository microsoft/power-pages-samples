import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchExternalLoginDetails,
  confirmExternalLogin,
  ExternalLoginCookieExpiredError,
  TermsRequiredError,
  type ExternalLoginDetails,
} from '../services/authService'
import { site } from '../data/site'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ExternalLoginConfirmation() {
  const navigate = useNavigate()
  const [details, setDetails] = useState<ExternalLoginDetails | null>(null)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cookieExpired, setCookieExpired] = useState(false)
  const [emailError, setEmailError] = useState<string | undefined>()
  const [emailTouched, setEmailTouched] = useState(false)
  const [serverError, setServerError] = useState<string | undefined>()

  useEffect(() => {
    document.title = `Complete sign-up — ${site.name}`
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchExternalLoginDetails()
      .then(d => {
        if (cancelled) return
        setDetails(d)
        setEmail(d.email)
        setIsLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        if (err instanceof ExternalLoginCookieExpiredError) {
          setCookieExpired(true)
        } else {
          setServerError(
            err instanceof Error
              ? err.message
              : 'Could not load sign-up details. Please try again.',
          )
        }
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function validateEmail(value: string): string | undefined {
    if (!value.trim()) return 'Email is required.'
    if (!EMAIL_REGEX.test(value.trim())) return 'Enter a valid email address.'
    return undefined
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    if (emailTouched) {
      setEmailError(validateEmail(value))
    }
    if (serverError) setServerError(undefined)
  }

  function handleEmailBlur() {
    setEmailTouched(true)
    setEmailError(validateEmail(email))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!details) return
    setEmailTouched(true)
    const err = validateEmail(email)
    setEmailError(err)
    if (err) return
    setIsSubmitting(true)
    setServerError(undefined)
    confirmExternalLogin({ ...details, email: email.trim() }).catch(error => {
      if (error instanceof TermsRequiredError) {
        navigate('/terms')
        return
      }
      if (error instanceof ExternalLoginCookieExpiredError) {
        setCookieExpired(true)
        setIsSubmitting(false)
        return
      }
      setServerError(
        error instanceof Error
          ? error.message
          : 'Unable to complete sign-up. Please try again.',
      )
      setIsSubmitting(false)
    })
  }

  return (
    <>
      <style>{confirmCSS}</style>
      <div className="conf-page">
        <div className="conf-card surface">
          {cookieExpired ? (
            <ExpiredView />
          ) : isLoading ? (
            <LoadingView />
          ) : !details ? (
            <ErrorView message={serverError} />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <header className="conf-head">
                <span className="eyebrow">One last step</span>
                <h1 className="conf-title">Complete your sign-up</h1>
                <p className="conf-lede">
                  We just need to confirm a few details before creating your account.
                </p>
              </header>

              {details.invitationCode && (
                <div className="conf-banner conf-banner-info" role="status">
                  Redeeming invitation <strong>{details.invitationCode}</strong>
                </div>
              )}
              {serverError && (
                <div className="conf-banner conf-banner-error" role="alert">
                  {serverError}
                </div>
              )}

              {(details.firstName || details.lastName) && (
                <div className="conf-field-readonly">
                  <label>Name</label>
                  <p>{`${details.firstName} ${details.lastName}`.trim()}</p>
                </div>
              )}

              <div className="conf-field">
                <label htmlFor="conf-email">Email</label>
                <input
                  id="conf-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  onBlur={handleEmailBlur}
                  aria-invalid={!!(emailTouched && emailError)}
                  aria-describedby={emailTouched && emailError ? 'conf-email-error' : undefined}
                />
                {emailTouched && emailError && (
                  <p id="conf-email-error" className="conf-field-error">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="conf-actions">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account…' : 'Create my account'}
                </button>
                <Link to="/login" className="conf-back">
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

function LoadingView() {
  return (
    <div className="conf-status">
      <span className="auth-spinner" aria-hidden="true" />
      <p>Loading your details…</p>
    </div>
  )
}

function ExpiredView() {
  return (
    <div className="conf-status">
      <h1 className="conf-title">Sign-in session expired</h1>
      <p>The sign-in session expired before you could finish. Please try again.</p>
      <Link to="/login" className="btn btn-primary">
        Back to sign in
      </Link>
    </div>
  )
}

function ErrorView({ message }: { message?: string }) {
  return (
    <div className="conf-status">
      <h1 className="conf-title">Something went wrong</h1>
      <p>{message ?? 'Unable to complete sign-up.'}</p>
      <Link to="/login" className="btn btn-primary">
        Back to sign in
      </Link>
    </div>
  )
}

const confirmCSS = `
.conf-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(96px, 14vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}
.conf-card {
  width: 100%;
  max-width: 560px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}
.conf-head { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-4); }
.conf-title { font-size: clamp(26px, 4vw, 36px); }
.conf-lede { color: var(--color-text-muted); }
.conf-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  border: 1px solid;
  margin-bottom: var(--space-3);
}
.conf-banner-info {
  background: rgba(232, 184, 108, 0.08);
  border-color: rgba(232, 184, 108, 0.35);
  color: var(--color-secondary);
}
.conf-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}
.conf-field-readonly {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--space-4);
}
.conf-field-readonly p {
  font-size: 16px;
  color: var(--color-text);
  margin: 0;
}
.conf-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--space-5);
}
.conf-field-error {
  font-size: 13px;
  color: #f3c2b6;
  margin: 4px 0 0;
}
.conf-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.conf-back {
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.conf-status {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-4) 0;
}
.conf-status .auth-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-text-muted);
  border-right-color: transparent;
  border-radius: 50%;
  animation: auth-spin 0.7s linear infinite;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }
`
