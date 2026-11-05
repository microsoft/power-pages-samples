import { useState, type FormEvent } from 'react'
import { Body1, makeStyles, tokens } from '@fluentui/react-components'
import { ArrowLeft20Regular, Send20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { Alert, AppLink, Button, ButtonLink, PageHeader } from '../../components/ui'
import { FormField, TextInput, ValidationSummary, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { useApp } from '../../store/AppStore'
import { forgotPassword } from '../../services/authService'
import { AuthIntro, AuthSplit, EMAIL_FORMAT, authErrorMessages, errorForId, isEmailLike } from './authShared'

const useStyles = makeStyles({
  footer: { display: 'block', marginTop: tokens.spacingVerticalXXL, color: tokens.colorNeutralForeground1 },
  linkStrong: { fontWeight: tokens.fontWeightSemibold },
})

export default function ForgotPassword() {
  const styles = useStyles()
  const { mode } = useApp()
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormError[]>([])
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const errs = fieldErrors({ 'forgot-email': !email.trim() ? requiredMessage('Email') : !isEmailLike(email) && EMAIL_FORMAT })
    setErrors(errs)
    if (errs.length) return
    if (mode === 'live') {
      setBusy(true)
      try {
        await forgotPassword(email.trim())
      } catch (err) {
        setErrors(authErrorMessages(err))
        setBusy(false)
        return
      }
      setBusy(false)
    }
    setSentTo(email.trim())
  }

  return (
    <Container>
      <PageHeader title="Reset your password" breadcrumbs={[{ label: 'Sign in', to: '/login' }, { label: 'Forgot password' }]} />
      <AuthSplit panelHeading="Get back into your partner portal.">
        {sentTo ? (
          <div className="space-y-6">
            <Alert tone="success" title="Check your email">
              If an account exists for {sentTo}, we’ve sent a link to reset your password.
            </Alert>
            <ButtonLink to="/login" variant="primary" icon={<ArrowLeft20Regular />}>
              Back to sign in
            </ButtonLink>
          </div>
        ) : (
          <>
            <AuthIntro>Enter the email address on your account and we’ll send you a link to reset your password.</AuthIntro>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <ValidationSummary errors={errors} />
              <FormField id="forgot-email" label="Email" required error={errorForId(errors, 'forgot-email')}>
                <TextInput id="forgot-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
              </FormField>
              <Button type="submit" variant="primary" className="w-full" icon={<Send20Regular />} pending={busy} pendingLabel="Sending…">
                Send reset link
              </Button>
            </form>
            <Body1 as="p" className={styles.footer}>
              Remembered it?{' '}
              <AppLink to="/login" inline className={styles.linkStrong}>
                Back to sign in
              </AppLink>
            </Body1>
          </>
        )}
      </AuthSplit>
    </Container>
  )
}
