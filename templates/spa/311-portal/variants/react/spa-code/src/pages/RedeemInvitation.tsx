import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { useI18n } from '../i18n'
import { redeemInvitation } from '../services/authService'
import { useAuthForm } from '../shared/hooks/useAuthForm'
import { validateInvitationCode } from '../shared/authValidation'
import { AuthAlert, AuthCard, AuthField } from '../components/AuthFormControls'
import './Auth.css'

/**
 * Landing page for invitation emails.
 *
 * Two routes lead here, both via the Code-Site-Shell-Header rewrite:
 *  - the invitation email link, /Account/Login/RedeemInvitation?invitation=CODE
 *  - the server bouncing an external sign-in that found no contact and no
 *    invitation context, which lands on /Register
 *
 * The second case arrives with no code in the URL, hence the editable input.
 */
export default function RedeemInvitation() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('ReturnUrl') || '/'
  // Emails have used both `invitation` and `invitationCode` over the years.
  const initialCode =
    searchParams.get('invitation') ||
    searchParams.get('invitationCode') ||
    searchParams.get('InvitationCode') ||
    ''

  const [redeemByLogin, setRedeemByLogin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useAuthForm({ code: initialCode }, { code: validateInvitationCode })

  useEffect(() => {
    document.title = `${t('redeemInvitation.title')} — Zava City Portal`
  }, [t])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting || !form.validateAll()) return

    const code = form.values.code.trim()
    setIsSubmitting(true)
    try {
      const { nextStep } = await redeemInvitation(code, redeemByLogin, returnUrl)
      const target = nextStep === 'login' ? '/login' : '/registration'
      navigate(`${target}?invitationCode=${encodeURIComponent(code)}`)
    } catch (err) {
      form.setServerError(err instanceof Error ? err.message : t('signIn.errorGeneral'))
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      icon={<Ticket size={28} />}
      title={t('redeemInvitation.title')}
      subtitle={t('redeemInvitation.subtitle')}
      footer={
        <Link to="/login" className="signin-link">
          {t('forgotPassword.backToSignIn')}
        </Link>
      }
    >
      {form.serverError && <AuthAlert tone="error">{form.serverError}</AuthAlert>}

      <form onSubmit={handleSubmit} className="signin-form" noValidate>
        <AuthField
          id="invitation-code"
          label={t('redeemInvitation.codeLabel')}
          value={form.values.code}
          onChange={v => form.setValue('code', v)}
          onBlur={() => form.handleBlur('code')}
          error={form.showError('code')}
          icon={<Ticket size={18} />}
          placeholder={t('redeemInvitation.codePlaceholder')}
          autoComplete="off"
          disabled={isSubmitting}
          autoFocus={!initialCode}
        />

        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={redeemByLogin}
            onChange={e => setRedeemByLogin(e.target.checked)}
            disabled={isSubmitting}
          />
          <span>{t('redeemInvitation.redeemByLogin')}</span>
        </label>

        <button type="submit" className="btn btn-primary signin-submit" disabled={isSubmitting}>
          {isSubmitting ? t('redeemInvitation.submitting') : t('redeemInvitation.submit')}
        </button>
      </form>
    </AuthCard>
  )
}
