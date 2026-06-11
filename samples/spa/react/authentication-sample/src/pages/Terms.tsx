import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { acceptTerms } from '../services/authService'
import { site } from '../data/site'

const TERMS_HEADING = 'Terms and Conditions'
const TERMS_CONTENT = `
  <p>By using this site, you agree to the following terms of service.</p>
  <h3>1. Acceptance of Terms</h3>
  <p>By accessing and using this site, you accept and agree to be bound by these terms.</p>
  <h3>2. Privacy &amp; Data</h3>
  <p>We collect and process your personal data in accordance with our privacy policy.</p>
  <h3>3. Account Responsibility</h3>
  <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
  <h3>4. Changes to Terms</h3>
  <p>We reserve the right to update these terms at any time.</p>
`
const TERMS_AGREEMENT_TEXT = 'I agree to these terms and conditions.'
const TERMS_BUTTON_TEXT = 'Confirm'

export default function Terms() {
  const [accepted, setAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | undefined>()

  useEffect(() => {
    document.title = `${TERMS_HEADING} — ${site.name}`
  }, [])

  function handleConfirm() {
    if (!accepted || isSubmitting) return
    setIsSubmitting(true)
    setServerError(undefined)
    acceptTerms('/').catch(err => {
      setServerError(
        err instanceof Error ? err.message : 'Failed to accept terms. Please try again.',
      )
      setIsSubmitting(false)
    })
  }

  return (
    <>
      <style>{termsCSS}</style>
      <div className="terms-page">
        <div className="terms-card surface">
          <header className="terms-head">
            <span className="eyebrow">Almost there</span>
            <h1 className="terms-title">{TERMS_HEADING}</h1>
          </header>

          {serverError && (
            <div className="terms-banner" role="alert">
              {serverError}
            </div>
          )}

          <div className="terms-body" dangerouslySetInnerHTML={{ __html: TERMS_CONTENT }} />

          <label className="terms-agree">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
            />
            <span>{TERMS_AGREEMENT_TEXT}</span>
          </label>

          <div className="terms-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!accepted || isSubmitting}
            >
              {isSubmitting ? 'Confirming…' : TERMS_BUTTON_TEXT}
            </button>
            <Link to="/login" className="terms-back">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

const termsCSS = `
.terms-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(96px, 14vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}
.terms-card {
  width: 100%;
  max-width: 720px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}
.terms-head { display: flex; flex-direction: column; gap: var(--space-3); }
.terms-title { font-size: clamp(28px, 4vw, 40px); }
.terms-banner {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: rgba(168, 52, 28, 0.12);
  border: 1px solid rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
  font-size: 14px;
}
.terms-body {
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.7;
  background: rgba(0,0,0,0.18);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  max-height: 360px;
  overflow-y: auto;
}
.terms-body h3 {
  font-size: 18px;
  margin-top: 18px;
  margin-bottom: 6px;
  color: var(--color-text);
}
.terms-body p { margin-bottom: 10px; }
.terms-agree {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  margin: 0;
}
.terms-agree input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  flex-shrink: 0;
}
.terms-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.terms-back {
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
`
