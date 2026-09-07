import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { LogIn, Mail, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../shared/hooks/useAuth'
import { useI18n } from '../i18n'
import {
  EXTERNAL_PROVIDERS,
  LOCAL_PROVIDER,
  TermsRequiredError,
  getAuthError,
  getAuthSuccess,
  getSessionExpiredMessage,
  loginWithProvider,
} from '../services/authService'
import { useAuthForm } from '../shared/hooks/useAuthForm'
import { validateEmail, validateRequiredPassword } from '../shared/authValidation'
import {
  AuthAlert,
  AuthCard,
  AuthDivider,
  AuthField,
  AuthPasswordField,
} from '../components/AuthFormControls'
import { MicrosoftMark } from '../components/MicrosoftMark'
import './Auth.css'

export default function Login() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const returnUrl = searchParams.get('returnUrl') || '/'
  // Invitation links use either casing depending on which server page emitted them.
  const invitationCode = searchParams.get('invitationCode') || searchParams.get('InvitationCode') || ''

  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [externalSubmittingId, setExternalSubmittingId] = useState('')

  // Banners driven by query params the server (or another SPA page) set on us.
  const urlError = getAuthError()
  const urlSuccess = getAuthSuccess()
  const sessionExpired = getSessionExpiredMessage()

  const form = useAuthForm(
    { credential: '', password: '' },
    { credential: validateEmail, password: validateRequiredPassword }
  )

  useEffect(() => {
    // signIn.title already reads "Sign in to Zava City Portal", so use the short
    // action label here to avoid repeating the site name in the tab.
    document.title = `${t('common.signIn')} — Zava City Portal`
  }, [t])

  useEffect(() => {
    if (isAuthenticated) navigate(returnUrl, { replace: true })
  }, [isAuthenticated, returnUrl, navigate])

  const busy = isSubmitting || !!externalSubmittingId

  const handleLocalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!LOCAL_PROVIDER || busy) return
    if (!form.validateAll()) return

    setIsSubmitting(true)
    try {
      await loginWithProvider(LOCAL_PROVIDER, {
        returnUrl,
        invitationCode: invitationCode || undefined,
        credentials: {
          credential: form.values.credential.trim(),
          password: form.values.password,
          rememberMe,
        },
      })
    } catch (err) {
      if (err instanceof TermsRequiredError) {
        navigate('/terms')
        return
      }
      form.setServerError(err instanceof Error ? err.message : t('signIn.errorGeneral'))
      setIsSubmitting(false)
    }
  }

  const handleExternal = async (providerId: string) => {
    const provider = EXTERNAL_PROVIDERS.find(p => p.id === providerId)
    if (!provider || busy) return

    setExternalSubmittingId(providerId)
    try {
      await loginWithProvider(provider, {
        returnUrl,
        invitationCode: invitationCode || undefined,
      })
    } catch (err) {
      form.setServerError(err instanceof Error ? err.message : t('signIn.errorGeneral'))
      setExternalSubmittingId('')
    }
  }

  if (isAuthenticated) return null

  const banner = form.serverError || urlError || sessionExpired

  return (
    <AuthCard
      icon={<LogIn size={28} />}
      title={t('signIn.title')}
      subtitle={t('signIn.subtitle')}
      footer={
        <>
          <Link to="/forgot-password" className="signin-link">
            {t('signIn.forgotPassword')}
          </Link>
          <span className="signin-footer-sep">&middot;</span>
          <Link to="/registration" className="signin-link">
            {t('signIn.createAccount')}
          </Link>
        </>
      }
      after={
        <>
          <div className="signin-trust animate-in animate-in-2">
            <ShieldCheck size={16} />
            <span>{t('signIn.trustBadge')}</span>
          </div>
          <div className="signin-back animate-in animate-in-3">
            <Link to="/">{t('common.backToHome')}</Link>
          </div>
        </>
      }
    >
      {banner && <AuthAlert tone="error">{banner}</AuthAlert>}
      {!banner && urlSuccess && <AuthAlert tone="success">{urlSuccess}</AuthAlert>}
      {invitationCode && (
        <AuthAlert tone="info">{t('signIn.invitationBanner', { code: invitationCode })}</AuthAlert>
      )}

      {EXTERNAL_PROVIDERS.map(provider => (
        <button
          key={provider.id}
          type="button"
          className="signin-entra-btn"
          onClick={() => handleExternal(provider.id)}
          disabled={busy}
        >
          <MicrosoftMark />
          {externalSubmittingId === provider.id ? t('signIn.signingIn') : t('signIn.microsoft')}
        </button>
      ))}

      {LOCAL_PROVIDER && EXTERNAL_PROVIDERS.length > 0 && (
        <AuthDivider label={t('signIn.orEmail')} />
      )}

      {LOCAL_PROVIDER && (
        <form onSubmit={handleLocalSubmit} className="signin-form" noValidate>
          <AuthField
            id="login-credential"
            label={t('signIn.emailLabel')}
            type={LOCAL_PROVIDER.loginByEmail ? 'email' : 'text'}
            value={form.values.credential}
            onChange={v => form.setValue('credential', v)}
            onBlur={() => form.handleBlur('credential')}
            error={form.showError('credential')}
            icon={<Mail size={18} />}
            placeholder="you@example.com"
            autoComplete={LOCAL_PROVIDER.loginByEmail ? 'email' : 'username'}
            disabled={busy}
            autoFocus
          />

          <AuthPasswordField
            id="login-password"
            label={t('signIn.passwordLabel')}
            value={form.values.password}
            onChange={v => form.setValue('password', v)}
            onBlur={() => form.handleBlur('password')}
            error={form.showError('password')}
            icon={<Lock size={18} />}
            placeholder={t('signIn.passwordPlaceholder')}
            autoComplete="current-password"
            disabled={busy}
            showLabel={t('signIn.showPassword')}
            hideLabel={t('signIn.hidePassword')}
          />

          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              disabled={busy}
            />
            <span>{t('signIn.rememberMe')}</span>
          </label>

          <button type="submit" className="btn btn-primary signin-submit" disabled={busy}>
            {isSubmitting ? t('signIn.signingIn') : t('common.signIn')}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
