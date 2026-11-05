import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Key20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { Alert, Button, ButtonLink, PageHeader } from '../../components/ui'
import { FormField, ValidationSummary, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { useApp } from '../../store/AppStore'
import { resetPassword } from '../../services/authService'
import { AuthIntro, AuthSplit, PASSWORD_HINT, PASSWORD_MISMATCH, PasswordInput, authErrorMessages, errorForId, newPasswordProblem } from './authShared'

/**
 * /reset-password: the emailed reset link (/Account/Login/ResetPassword?UserId=…&Code=…) is redirected here
 * by the Code-Site-Shell-Header web template, keeping the query string.
 */
export default function ResetPassword() {
  const { mode } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const userId = params.get('UserId') ?? params.get('userId') ?? ''
  const code = params.get('Code') ?? params.get('code') ?? ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState<FormError[]>([])
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const errs = fieldErrors({
      'reset-password': !form.password ? requiredMessage('New password') : newPasswordProblem(form.password),
      'reset-confirm': !form.confirm ? 'Confirm your new password' : form.password !== form.confirm && PASSWORD_MISMATCH,
    })
    setErrors(errs)
    if (errs.length) return
    if (mode === 'live') {
      setBusy(true)
      try {
        await resetPassword(userId, code, form.password, form.confirm)
      } catch (err) {
        setErrors(authErrorMessages(err))
        setBusy(false)
        return
      }
    }
    navigate('/login?message=password_reset_success')
  }

  return (
    <Container>
      <PageHeader title="Choose a new password" breadcrumbs={[{ label: 'Sign in', to: '/login' }, { label: 'Reset password' }]} />
      <AuthSplit panelHeading="Get back into your partner portal.">
        {!userId || !code ? (
          <div className="space-y-6">
            <Alert tone="warning" title="This reset link isn’t valid">
              The link is incomplete or has expired. Request a new password reset email.
            </Alert>
            <ButtonLink to="/forgot-password" variant="primary">
              Request a new link
            </ButtonLink>
          </div>
        ) : (
          <>
            <AuthIntro>Enter a new password for your partner portal account.</AuthIntro>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <ValidationSummary errors={errors} />
              <FormField id="reset-password" label="New password" required hint={PASSWORD_HINT} error={errorForId(errors, 'reset-password')}>
                <PasswordInput id="reset-password" autoComplete="new-password" value={form.password} onChange={set('password')} />
              </FormField>
              <FormField id="reset-confirm" label="Confirm new password" required error={errorForId(errors, 'reset-confirm')}>
                <PasswordInput id="reset-confirm" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
              </FormField>
              <Button type="submit" variant="primary" className="w-full" icon={<Key20Regular />} pending={busy} pendingLabel="Saving…">
                Reset password
              </Button>
            </form>
          </>
        )}
      </AuthSplit>
    </Container>
  )
}
