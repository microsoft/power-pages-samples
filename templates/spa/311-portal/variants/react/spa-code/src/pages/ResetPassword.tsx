import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, ShieldAlert, KeyRound } from 'lucide-react'
import { useI18n } from '../i18n'
import { resetPassword } from '../services/authService'
import { useAuthForm } from '../shared/hooks/useAuthForm'
import {
  passwordStrength,
  validateConfirmPassword,
  validatePassword,
} from '../shared/authValidation'
import {
  AuthAlert,
  AuthCard,
  AuthPasswordField,
  PasswordStrengthMeter,
} from '../components/AuthFormControls'
import './Auth.css'

/**
 * Users land here from the link in the password-reset email.
 *
 * That link actually points at the server page /Account/Login/ResetPassword;
 * the Code-Site-Shell-Header web template rewrites it to this route, preserving
 * the UserId and Code query parameters the server needs back on submit.
 */
export default function ResetPassword() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // The server emits these capitalised; accept either in case a mail client or
  // proxy normalises the query string.
  const userId = searchParams.get('UserId') || searchParams.get('userId') || ''
  const code = searchParams.get('Code') || searchParams.get('code') || ''

  const form = useAuthForm(
    { password: '', confirmPassword: '' },
    {
      password: validatePassword,
      confirmPassword: validateConfirmPassword('password'),
    }
  )

  useEffect(() => {
    document.title = `${t('resetPassword.title')} — Zava City Portal`
  }, [t])

  const strength = passwordStrength(form.values.password)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting || !form.validateAll()) return

    setIsSubmitting(true)
    try {
      await resetPassword(userId, code, form.values.password, form.values.confirmPassword)
    } catch (err) {
      form.setServerError(err instanceof Error ? err.message : t('signIn.errorGeneral'))
      setIsSubmitting(false)
    }
  }

  if (!userId || !code) {
    return (
      <AuthCard
        icon={<ShieldAlert size={28} />}
        title={t('resetPassword.invalidTitle')}
        tone="danger"
        footer={
          <Link to="/login" className="signin-link">
            {t('forgotPassword.backToSignIn')}
          </Link>
        }
      >
        <div className="auth-confirmation">
          <p>{t('resetPassword.invalidBody')}</p>
        </div>
        <Link to="/forgot-password" className="btn btn-primary signin-submit">
          {t('resetPassword.requestNew')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      icon={<KeyRound size={28} />}
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle')}
      footer={
        <Link to="/login" className="signin-link">
          {t('forgotPassword.backToSignIn')}
        </Link>
      }
    >
      {form.serverError && <AuthAlert tone="error">{form.serverError}</AuthAlert>}

      <form onSubmit={handleSubmit} className="signin-form" noValidate>
        <div>
          <AuthPasswordField
            id="reset-password"
            label={t('resetPassword.passwordLabel')}
            value={form.values.password}
            onChange={v => form.setValue('password', v)}
            onBlur={() => form.handleBlur('password')}
            error={form.showError('password')}
            icon={<Lock size={18} />}
            autoComplete="new-password"
            disabled={isSubmitting}
            hint={t('register.passwordHint')}
            showLabel={t('signIn.showPassword')}
            hideLabel={t('signIn.hidePassword')}
            autoFocus
          />
          <PasswordStrengthMeter score={strength.score} label={strength.label} />
        </div>

        <AuthPasswordField
          id="reset-confirm-password"
          label={t('resetPassword.confirmPasswordLabel')}
          value={form.values.confirmPassword}
          onChange={v => form.setValue('confirmPassword', v)}
          onBlur={() => form.handleBlur('confirmPassword')}
          error={form.showError('confirmPassword')}
          icon={<Lock size={18} />}
          autoComplete="new-password"
          disabled={isSubmitting}
          showLabel={t('signIn.showPassword')}
          hideLabel={t('signIn.hidePassword')}
        />

        <button type="submit" className="btn btn-primary signin-submit" disabled={isSubmitting}>
          {isSubmitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
        </button>
      </form>
    </AuthCard>
  )
}
