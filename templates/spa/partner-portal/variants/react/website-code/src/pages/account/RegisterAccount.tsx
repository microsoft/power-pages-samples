import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { makeStyles, tokens } from '@fluentui/react-components'
import { PersonAdd20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { Alert, AppLink, PageHeader, Button } from '../../components/ui'
import { FormField, TextInput, ValidationSummary, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { ROLE_LABELS } from '../../lib/access'
import { fullName } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { fetchInvitationDetails, loginWithProvider, register, type AuthProviderConfig } from '../../services/authService'
import {
  AuthIntro,
  AuthSplit,
  EMAIL_FORMAT,
  EmailDivider,
  ExternalProviderButtons,
  PASSWORD_HINT,
  PASSWORD_MISMATCH,
  PasswordInput,
  authErrorMessages,
  errorForId,
  invitationCodeFrom,
  isEmailLike,
  newPasswordProblem,
  roleForPartnerRole,
} from './authShared'
import { KEEP_NOTICE } from '../../lib/notice'

const useStyles = makeStyles({
  linkStrong: { fontWeight: tokens.fontWeightSemibold },
})

/** After self-registration, prospective partners continue to the partner application. */
const APPLY_URL = '/profile/register-to-be-a-partner/'

/**
 * /registration: open self-registration, or completing an invitation (`?invitationCode=`), with Microsoft
 * Entra ID or a local email + password account. Mock mode creates the prototype's non-partner session.
 */
export default function RegisterAccount() {
  const { db, mode, mutate, setRole, signInAs, notify } = useApp()
  const live = mode === 'live'
  const navigate = useNavigate()
  const styles = useStyles()
  const [params] = useSearchParams()
  const invitationCode = invitationCodeFrom(params)
  const returnUrl = invitationCode ? '/' : APPLY_URL
  const mockInvitation =
    !live && invitationCode ? db.invitations.find(i => i.code.toUpperCase() === invitationCode.toUpperCase() && i.status === 'Sent') : undefined
  const mockInvitee = mockInvitation && db.contacts.find(c => c.id === mockInvitation.contactId && c.active)

  const [form, setForm] = useState({ email: mockInvitee?.email ?? '', password: '', confirm: '' })
  const [errors, setErrors] = useState<FormError[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Pre-fill the invited email from the server registration page (editable, as on the server form).
  useEffect(() => {
    if (!live || !invitationCode) return
    const controller = new AbortController()
    fetchInvitationDetails(invitationCode, controller.signal)
      .then(d => {
        if (!controller.signal.aborted && d.email) setForm(f => (f.email ? f : { ...f, email: d.email }))
      })
      .catch(error => {
        if (!controller.signal.aborted) console.warn('Invitation prefill failed:', error)
      })
    return () => controller.abort()
  }, [live, invitationCode])

  const completeMock = () => {
    if (mockInvitation && mockInvitee) {
      mutate(d => {
        const target = d.invitations.find(i => i.id === mockInvitation.id)
        if (target) target.status = 'Redeemed'
      })
      signInAs(mockInvitee.id)
      notify(`Account created. Welcome, ${fullName(mockInvitee)} — you’re signed in as ${ROLE_LABELS[roleForPartnerRole(mockInvitee.partnerRole)]}.`)
      navigate('/profile/', KEEP_NOTICE)
      return
    }
    setRole('non-partner')
    notify('Your account has been created. Complete the partner application to join the program.')
    navigate(APPLY_URL, KEEP_NOTICE)
  }

  const signUpExternal = async (provider: AuthProviderConfig) => {
    if (busy) return
    if (!live) return completeMock()
    setErrors([])
    setBusy(provider.id)
    try {
      await loginWithProvider(provider, { returnUrl, invitationCode: invitationCode || undefined })
    } catch (e) {
      setErrors(authErrorMessages(e))
      setBusy(null)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const errs = fieldErrors({
      'reg-email': !form.email.trim() ? requiredMessage('Email') : !isEmailLike(form.email) && EMAIL_FORMAT,
      'reg-password': !form.password ? requiredMessage('Password') : newPasswordProblem(form.password),
      'reg-confirm': !form.confirm ? 'Confirm your password' : form.password && form.password !== form.confirm && PASSWORD_MISMATCH,
    })
    setErrors(errs)
    if (errs.length) return
    if (!live) return completeMock()
    setBusy('local')
    try {
      await register({ email: form.email.trim(), password: form.password, confirmPassword: form.confirm }, returnUrl, invitationCode || undefined)
    } catch (err) {
      setErrors(authErrorMessages(err))
      setBusy(null)
    }
  }

  return (
    <Container>
      <PageHeader title="Create an account" breadcrumbs={[{ label: 'Sign in', to: '/login' }, { label: 'Create an account' }]} />
      <AuthSplit panelHeading="Join the Zava partner community.">
        {invitationCode && (
          <div className="mb-6">
            <Alert tone="info" title="Completing your invitation">
              Create your account to accept invitation {invitationCode}.
            </Alert>
          </div>
        )}
        <AuthIntro>
          {invitationCode
            ? 'Use your Microsoft Entra ID work account, or set a password for the invited email.'
            : 'Create an account, then submit your partner application.'}{' '}
          Already have an account?{' '}
          <AppLink to={invitationCode ? `/login?invitationCode=${encodeURIComponent(invitationCode)}` : '/login'} inline className={styles.linkStrong}>
            Sign in
          </AppLink>
        </AuthIntro>
        <ExternalProviderButtons verb="Sign up" busyId={busy} disabled={!!busy} onSelect={signUpExternal} />
        <EmailDivider>or sign up with email</EmailDivider>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <ValidationSummary errors={errors} />
          <FormField id="reg-email" label="Email" required hint="You sign in with this email." error={errorForId(errors, 'reg-email')}>
            <TextInput id="reg-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          </FormField>
          <FormField id="reg-password" label="Password" required hint={PASSWORD_HINT} error={errorForId(errors, 'reg-password')}>
            <PasswordInput id="reg-password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          </FormField>
          <FormField id="reg-confirm" label="Confirm password" required error={errorForId(errors, 'reg-confirm')}>
            <PasswordInput id="reg-confirm" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </FormField>
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            icon={<PersonAdd20Regular />}
            pending={busy === 'local'}
            pendingLabel="Creating account…"
            disabledFocusable={!!busy && busy !== 'local'}
          >
            Create account
          </Button>
        </form>
      </AuthSplit>
    </Container>
  )
}
