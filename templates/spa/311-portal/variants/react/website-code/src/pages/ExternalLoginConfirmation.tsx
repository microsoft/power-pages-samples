import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserCheck, Mail, ShieldAlert } from 'lucide-react'
import { useI18n } from '../i18n'
import {
  ExternalLoginCookieExpiredError,
  TermsRequiredError,
  confirmExternalLogin,
  fetchExternalLoginDetails,
  type ExternalLoginDetails,
} from '../services/authService'
import { useAuthForm } from '../shared/hooks/useAuthForm'
import { validateEmail } from '../shared/authValidation'
import { AuthAlert, AuthCard, AuthField } from '../components/AuthFormControls'
import './Auth.css'

/**
 * First-time external sign-in.
 *
 * When someone authenticates with Entra ID but has no Dataverse contact yet, the
 * server renders its own confirmation form at /Account/Login/ExternalLoginCallback.
 * The Code-Site-Shell-Header rewrite sends them here instead, and this page
 * re-reads the claims the server stashed in the short-lived __External cookie.
 *
 * That cookie only lives for five minutes, which is why the expired state is a
 * first-class branch rather than a generic error.
 */
export default function ExternalLoginConfirmation() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const [details, setDetails] = useState<ExternalLoginDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpired, setIsExpired] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useAuthForm({ email: '' }, { email: validateEmail })
  const { setValue } = form

  useEffect(() => {
    document.title = `${t('externalConfirm.title')} — Zava City Portal`
  }, [t])

  useEffect(() => {
    let cancelled = false

    fetchExternalLoginDetails()
      .then(loaded => {
        if (cancelled) return
        setDetails(loaded)
        setValue('email', loaded.email)
      })
      .catch(err => {
        if (cancelled) return
        if (err instanceof ExternalLoginCookieExpiredError) {
          setIsExpired(true)
        } else {
          form.setServerError(err instanceof Error ? err.message : t('signIn.errorGeneral'))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // Runs once on mount; form helpers are stable enough for this one-shot load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!details || isSubmitting || !form.validateAll()) return

    setIsSubmitting(true)
    try {
      await confirmExternalLogin({ ...details, email: form.values.email.trim() })
    } catch (err) {
      if (err instanceof TermsRequiredError) {
        navigate('/terms')
        return
      }
      if (err instanceof ExternalLoginCookieExpiredError) {
        setIsExpired(true)
        setIsSubmitting(false)
        return
      }
      form.setServerError(err instanceof Error ? err.message : t('signIn.errorGeneral'))
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <AuthCard icon={<UserCheck size={28} />} title={t('externalConfirm.title')}>
        <div className="auth-loading">
          <span className="auth-spinner" />
          <span>{t('externalConfirm.loading')}</span>
        </div>
      </AuthCard>
    )
  }

  if (isExpired || !details) {
    return (
      <AuthCard
        icon={<ShieldAlert size={28} />}
        title={t('externalConfirm.expiredTitle')}
        tone="danger"
        footer={
          <Link to="/login" className="signin-link">
            {t('forgotPassword.backToSignIn')}
          </Link>
        }
      >
        <div className="auth-confirmation">
          <p>{t('externalConfirm.expiredBody')}</p>
        </div>
        <Link to="/login" className="btn btn-primary signin-submit">
          {t('common.signIn')}
        </Link>
      </AuthCard>
    )
  }

  const fullName = [details.firstName, details.lastName].filter(Boolean).join(' ')

  return (
    <AuthCard
      icon={<UserCheck size={28} />}
      title={t('externalConfirm.title')}
      subtitle={t('externalConfirm.subtitle')}
      footer={
        <Link to="/login" className="signin-link">
          {t('forgotPassword.backToSignIn')}
        </Link>
      }
    >
      {form.serverError && <AuthAlert tone="error">{form.serverError}</AuthAlert>}
      {details.invitationCode && (
        <AuthAlert tone="info">
          {t('externalConfirm.invitationBanner', { code: details.invitationCode })}
        </AuthAlert>
      )}

      {fullName && (
        <div className="auth-readonly">
          <span className="auth-readonly-label">{t('externalConfirm.signedInAs')}</span>
          <span className="auth-readonly-value">{fullName}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="signin-form" noValidate>
        <AuthField
          id="external-email"
          label={t('externalConfirm.emailLabel')}
          type="email"
          value={form.values.email}
          onChange={v => form.setValue('email', v)}
          onBlur={() => form.handleBlur('email')}
          error={form.showError('email')}
          icon={<Mail size={18} />}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isSubmitting}
          hint={t('externalConfirm.emailHint')}
          autoFocus
        />

        <button type="submit" className="btn btn-primary signin-submit" disabled={isSubmitting}>
          {isSubmitting ? t('externalConfirm.submitting') : t('externalConfirm.submit')}
        </button>
      </form>
    </AuthCard>
  )
}
