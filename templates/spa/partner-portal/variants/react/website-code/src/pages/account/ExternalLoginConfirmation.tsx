import { useEffect, useState, type FormEvent } from 'react'
import { PersonAdd20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { Alert, Button, ButtonLink, PageHeader } from '../../components/ui'
import { FormField, ReadOnlyField, TextInput, ValidationSummary, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { useApp } from '../../store/AppStore'
import { PageSkeleton } from '../../components/skeletons'
import { ExternalLoginCookieExpiredError, confirmExternalLogin, fetchExternalLoginDetails, type ExternalLoginDetails } from '../../services/authService'
import { AuthIntro, AuthSplit, EMAIL_FORMAT, authErrorMessages, errorForId, isEmailLike } from './authShared'

type State = { kind: 'loading' } | { kind: 'expired' } | { kind: 'error'; message: string } | { kind: 'ready'; details: ExternalLoginDetails }

/**
 * /external-login-confirmation: first Microsoft Entra ID sign-in without a matching contact. The server renders
 * this step at /Account/Login/ExternalLoginCallback; the Code-Site-Shell-Header template sends it here, the page
 * reads the claims the server pre-filled and posts the confirmation back (keeps the user in the SPA).
 */
export default function ExternalLoginConfirmation() {
  const { mode } = useApp()
  const live = mode === 'live'
  const [state, setState] = useState<State>(() => (live ? { kind: 'loading' } : { kind: 'expired' }))
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormError[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!live) return
    const controller = new AbortController()
    fetchExternalLoginDetails(controller.signal)
      .then(details => {
        if (controller.signal.aborted) return
        setState({ kind: 'ready', details })
        setEmail(details.email)
      })
      .catch(e => {
        if (controller.signal.aborted) return
        setState(e instanceof ExternalLoginCookieExpiredError ? { kind: 'expired' } : { kind: 'error', message: authErrorMessages(e)[0] })
      })
    return () => controller.abort()
  }, [live])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || state.kind !== 'ready') return
    const errs = fieldErrors({ 'ext-email': !email.trim() ? requiredMessage('Email') : !isEmailLike(email) && EMAIL_FORMAT })
    setErrors(errs)
    if (errs.length) return
    setBusy(true)
    try {
      await confirmExternalLogin({ ...state.details, email: email.trim() })
    } catch (err) {
      if (err instanceof ExternalLoginCookieExpiredError) setState({ kind: 'expired' })
      else setErrors(authErrorMessages(err))
      setBusy(false)
    }
  }

  if (state.kind === 'loading') return <PageSkeleton variant="auth" />

  const name = state.kind === 'ready' ? [state.details.firstName, state.details.lastName].filter(Boolean).join(' ') : ''

  return (
    <Container>
      <PageHeader title="Finish creating your account" breadcrumbs={[{ label: 'Sign in', to: '/login' }, { label: 'Finish creating your account' }]} />
      <AuthSplit>
        {state.kind === 'ready' ? (
          <>
            {state.details.invitationCode && (
              <div className="mb-6">
                <Alert tone="info">Your invitation {state.details.invitationCode} is linked to this account when you continue.</Alert>
              </div>
            )}
            <AuthIntro>You signed in with Microsoft Entra ID for the first time. Confirm the email for your partner portal account.</AuthIntro>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <ValidationSummary errors={errors} />
              {name && <ReadOnlyField label="Name" value={name} />}
              <FormField id="ext-email" label="Email" required error={errorForId(errors, 'ext-email')}>
                <TextInput id="ext-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
              </FormField>
              <Button type="submit" variant="primary" className="w-full" icon={<PersonAdd20Regular />} pending={busy} pendingLabel="Creating account…">
                Create my account
              </Button>
            </form>
          </>
        ) : (
          <div className="space-y-6">
            <Alert tone="warning" title={state.kind === 'expired' ? 'Your sign-in session expired' : 'We couldn’t continue your sign-in'}>
              {state.kind === 'expired' ? 'Finishing your account must happen within a few minutes of signing in. Sign in again to continue.' : state.message}
            </Alert>
            <ButtonLink to="/login" variant="primary">
              Back to sign in
            </ButtonLink>
          </div>
        )}
      </AuthSplit>
    </Container>
  )
}
