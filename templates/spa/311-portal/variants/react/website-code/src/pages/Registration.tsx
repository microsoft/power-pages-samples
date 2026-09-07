import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '../shared/hooks/useAuth'
import { useI18n } from '../i18n'
import {
  EXTERNAL_PROVIDERS,
  LOCAL_PROVIDER,
  TermsRequiredError,
  fetchInvitationDetails,
  getAuthError,
  loginWithProvider,
  register,
} from '../services/authService'
import { useAuthForm } from '../shared/hooks/useAuthForm'
import {
  passwordStrength,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from '../shared/authValidation'
import {
  AuthAlert,
  AuthCard,
  AuthDivider,
  AuthField,
  AuthPasswordField,
  PasswordStrengthMeter,
} from '../components/AuthFormControls'
import { MicrosoftMark } from '../components/MicrosoftMark'
import './Auth.css'

// In dev the mock user always reads as authenticated, which would bounce us off
// this page before the form could ever be exercised locally.
const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const loginByEmail = LOCAL_PROVIDER?.loginByEmail ?? true

export default function Registration() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // New accounts land on the profile page so they can fill in the details the
  // sign-up form deliberately doesn't ask for. The server honours this through
  // the whole flow, including the identity-provider round trip.
  const returnUrl = searchParams.get('returnUrl') || '/user-profile'
  // Invitation links use either casing depending on which server page emitted them.
  const invitationCode =
    searchParams.get('invitationCode') || searchParams.get('InvitationCode') || ''

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [externalSubmittingId, setExternalSubmittingId] = useState('')

  const form = useAuthForm(
    { email: '', username: '', password: '', confirmPassword: '' },
    {
      email: validateEmail,
      // Only collected when the site identifies users by username; otherwise the
      // email address doubles as the sign-in identifier.
      username: loginByEmail ? undefined : value => (value.trim() ? undefined : 'Choose a username.'),
      password: validatePassword,
      confirmPassword: validateConfirmPassword('password'),
    }
  )

  const { setValue } = form

  useEffect(() => {
    document.title = `${t('register.title')} — Zava City Portal`
  }, [t])

  useEffect(() => {
    if (isAuthenticated && !isDev) navigate(returnUrl, { replace: true })
  }, [isAuthenticated, navigate, returnUrl])

  // Pre-fill the address the invitation was issued to, mirroring what the
  // server-rendered registration page does.
  useEffect(() => {
    if (!invitationCode) return
    let cancelled = false
    fetchInvitationDetails(invitationCode)
      .then(details => {
        if (!cancelled && details.email) setValue('email', details.email)
      })
      .catch(() => {
        // Best effort — the user can still type the address in by hand.
      })
    return () => {
      cancelled = true
    }
  }, [invitationCode, setValue])

  const busy = isSubmitting || !!externalSubmittingId
  const strength = passwordStrength(form.values.password)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !form.validateAll()) return

    setIsSubmitting(true)
    try {
      await register(
        {
          email: form.values.email.trim(),
          username: loginByEmail ? undefined : form.values.username.trim(),
          password: form.values.password,
          confirmPassword: form.values.confirmPassword,
        },
        returnUrl,
        invitationCode || undefined
      )
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

  if (isAuthenticated && !isDev) return null

  const banner = form.serverError || getAuthError()

  return (
    <AuthCard
      icon={<UserPlus size={28} />}
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      footer={
        <>
          <span className="signin-footer-note">{t('register.haveAccount')}</span>
          <Link to="/login" className="signin-link">
            {t('register.signIn')}
          </Link>
        </>
      }
    >
      {banner && <AuthAlert tone="error">{banner}</AuthAlert>}
      {invitationCode && (
        <AuthAlert tone="info">{t('register.invitationBanner', { code: invitationCode })}</AuthAlert>
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
          {externalSubmittingId === provider.id ? t('signIn.signingIn') : t('register.microsoft')}
        </button>
      ))}

      {LOCAL_PROVIDER && EXTERNAL_PROVIDERS.length > 0 && (
        <AuthDivider label={t('register.orEmail')} />
      )}

      {LOCAL_PROVIDER && (
        <form onSubmit={handleSubmit} className="signin-form" noValidate>
          {!loginByEmail && (
            <AuthField
              id="register-username"
              label={t('register.usernameLabel')}
              value={form.values.username}
              onChange={v => form.setValue('username', v)}
              onBlur={() => form.handleBlur('username')}
              error={form.showError('username')}
              icon={<User size={18} />}
              autoComplete="username"
              disabled={busy}
              autoFocus
            />
          )}

          <AuthField
            id="register-email"
            label={t('register.emailLabel')}
            type="email"
            value={form.values.email}
            onChange={v => form.setValue('email', v)}
            onBlur={() => form.handleBlur('email')}
            error={form.showError('email')}
            icon={<Mail size={18} />}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={busy}
            autoFocus={loginByEmail}
          />

          <div>
            <AuthPasswordField
              id="register-password"
              label={t('register.passwordLabel')}
              value={form.values.password}
              onChange={v => form.setValue('password', v)}
              onBlur={() => form.handleBlur('password')}
              error={form.showError('password')}
              icon={<Lock size={18} />}
              autoComplete="new-password"
              disabled={busy}
              hint={t('register.passwordHint')}
              showLabel={t('signIn.showPassword')}
              hideLabel={t('signIn.hidePassword')}
            />
            <PasswordStrengthMeter score={strength.score} label={strength.label} />
          </div>

          <AuthPasswordField
            id="register-confirm-password"
            label={t('register.confirmPasswordLabel')}
            value={form.values.confirmPassword}
            onChange={v => form.setValue('confirmPassword', v)}
            onBlur={() => form.handleBlur('confirmPassword')}
            error={form.showError('confirmPassword')}
            icon={<Lock size={18} />}
            autoComplete="new-password"
            disabled={busy}
            showLabel={t('signIn.showPassword')}
            hideLabel={t('signIn.hidePassword')}
          />

          <button type="submit" className="btn btn-primary signin-submit" disabled={busy}>
            {isSubmitting ? t('register.submitting') : t('register.submit')}
          </button>

          <p className="auth-field-hint" style={{ textAlign: 'center' }}>
            {t('register.emailConfirmationNote')}
          </p>
        </form>
      )}
    </AuthCard>
  )
}
