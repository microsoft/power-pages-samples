import { useState, type FormEvent } from 'react'

type InquiryType = 'Catering' | 'Franchise' | 'Feedback' | 'General'

const inquiryTypes: InquiryType[] = ['General', 'Catering', 'Franchise', 'Feedback']

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const name = (data.get('name') as string)?.trim()
    const email = (data.get('email') as string)?.trim()
    const message = (data.get('message') as string)?.trim()
    const nextErrors: typeof errors = {}
    if (!name) nextErrors.name = 'Please tell us your name.'
    if (!email) nextErrors.email = 'We need an email to write back.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'That email does not look quite right.'
    if (!message) nextErrors.message = 'Add a short message so we know how to help.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) {
      setSubmitted(true)
      form.reset()
    }
  }

  if (submitted) {
    return (
      <>
        <style>{contactFormCSS}</style>
        <div className="contact-success" role="status">
          <span className="contact-success-mark" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 16.5 L14 20.5 L22 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h3>Thank you — we have your note.</h3>
          <p>
            A real human, almost always within a business day, will write back from <span className="display-italic">hello@smokingburgers.example</span>.
            For urgent catering &amp; events, please also ring the Brooklyn flagship.
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => setSubmitted(false)}>
            Send another message
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{contactFormCSS}</style>
      <form className="contact-form" noValidate onSubmit={handleSubmit} aria-label="Contact Smoking Burgers">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="contact-name">Your name</label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'err-name' : undefined}
            />
            {errors.name && <span className="field-error" id="err-name" role="alert">{errors.name}</span>}
          </div>

          <div className="field">
            <label htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'err-email' : undefined}
            />
            {errors.email && <span className="field-error" id="err-email" role="alert">{errors.email}</span>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="contact-type">Inquiry type</label>
          <select id="contact-type" name="inquiryType" defaultValue="General">
            {inquiryTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            aria-required="true"
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'err-message' : undefined}
          />
          {errors.message && <span className="field-error" id="err-message" role="alert">{errors.message}</span>}
        </div>

        <button type="submit" className="btn btn-primary contact-submit">Send the note</button>
      </form>
    </>
  )
}

const contactFormCSS = `
.contact-form { display: flex; flex-direction: column; gap: 22px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.field { display: flex; flex-direction: column; }
.field-error {
  margin-top: 8px;
  color: #F2A085;
  font-size: 13px;
  letter-spacing: 0.02em;
}
.contact-submit { align-self: flex-start; margin-top: 8px; }

.contact-success {
  background: linear-gradient(180deg, var(--color-surface), var(--color-surface-2));
  border: 1px solid var(--color-border-hot);
  border-radius: var(--radius-xl);
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.contact-success-mark {
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(201, 137, 61, 0.1);
  border: 1px solid var(--color-border-hot);
}
.contact-success h3 {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}
.contact-success p {
  color: var(--color-text-muted);
  max-width: 52ch;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
}
.contact-success .btn { margin-top: 8px; }

@media (max-width: 580px) {
  .form-grid { grid-template-columns: 1fr; }
}
`
