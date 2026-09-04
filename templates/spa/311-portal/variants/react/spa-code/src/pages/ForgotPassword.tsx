import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, MailCheck } from 'lucide-react'
import { useI18n } from '../i18n'
import { forgotPassword } from '../services/authService'
import { useAuthForm } from '../shared/hooks/useAuthForm'
import { validateEmail } from '../shared/authValidation'
import { AuthAlert, AuthCard, AuthField } from '../components/AuthFormControls'
import './Auth.css'

export default function ForgotPassword() {
  const { t } = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const form = useAuthForm({ email: '' }, { email: validateEmail })

  useEffect(() => {
    document.title = `${t('forgotPassword.title')} — Zava City Portal`
  }, [t])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting || !form.validateAll()) return

    const email = form.values.email.trim()
    setIsSubmitting(true)
    try {
      await forgotPassword(email)
      // The server never reveals whether the address exists, so success here
      // only means the request was accepted.
      setSentTo(email)
    } catch (err) {
      form.setServerError(err instanceof Error ? err.message : t('signIn.errorGeneral'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <AuthCard
        icon={<MailCheck size={28} />}
        title={t('forgotPassword.sentTitle')}
        tone="success"
        footer={
          <Link to="/login" className="signin-link">
            {t('forgotPassword.backToSignIn')}
          </Link>
        }
      >
        <div className="auth-confirmation">
          <p>{t('forgotPassword.sentBody', { email: sentTo })}</p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      icon={<KeyRound size={28} />}
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
      footer={
        <Link to="/login" className="signin-link">
          {t('forgotPassword.backToSignIn')}
        </Link>
      }
    >
      {form.serverError && <AuthAlert tone="error">{form.serverError}</AuthAlert>}

      <form onSubmit={handleSubmit} className="signin-form" noValidate>
        <AuthField
          id="forgot-email"
          label={t('forgotPassword.emailLabel')}
          type="email"
          value={form.values.email}
          onChange={v => form.setValue('email', v)}
          onBlur={() => form.handleBlur('email')}
          error={form.showError('email')}
          icon={<Mail size={18} />}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isSubmitting}
          autoFocus
        />

        <button type="submit" className="btn btn-primary signin-submit" disabled={isSubmitting}>
          {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
        </button>
      </form>
    </AuthCard>
  )
}
