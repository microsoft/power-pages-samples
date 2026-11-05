import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Body1,
  Caption1,
  Radio,
  RadioGroup,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { ArrowEnter20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { Alert, AppLink, Button, PageHeader } from '../../components/ui'
import { Checkbox, FormField, TextInput, ValidationSummary, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { ROLE_LABELS } from '../../lib/access'
import { fullName } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import {
  LOCAL_PROVIDER,
  getAuthError,
  getAuthNotice,
  getSessionExpiredMessage,
  loginWithProvider,
  type AuthProviderConfig,
} from '../../services/authService'
import {
  AuthIntro,
  AuthSplit,
  EMAIL_FORMAT,
  EmailDivider,
  ExternalProviderButtons,
  PERSONAS,
  PasswordInput,
  authErrorMessages,
  errorForId,
  invitationCodeFrom,
  isEmailLike,
  safeReturnUrl,
  type SignedInRole,
} from './authShared'
import { KEEP_NOTICE } from '../../lib/notice'

const useStyles = makeStyles({
  links: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, marginTop: tokens.spacingVerticalXXL },
  linkLine: { display: 'block', margin: 0, fontSize: tokens.fontSizeBase400, lineHeight: tokens.lineHeightBase400, color: tokens.colorNeutralForeground1 },
  linkStrong: { fontWeight: tokens.fontWeightSemibold },
  persona: {
    marginTop: tokens.spacingVerticalXXL,
    border: `${tokens.strokeWidthThin} dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  personaHeader: { margin: 0 },
  personaButton: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground1, height: 'auto', minHeight: '44px', ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM) },
  personaCurrent: { display: 'block', fontWeight: tokens.fontWeightRegular, color: tokens.colorNeutralForeground2 },
  personaPanel: { ...shorthands.margin(0), ...shorthands.padding(0, tokens.spacingHorizontalM, tokens.spacingVerticalM) },
  personaHint: { display: 'block', margin: 0, marginBottom: tokens.spacingVerticalS, color: tokens.colorNeutralForeground2 },
  radioLabel: { color: tokens.colorNeutralForeground1 },
})

/**
 * /login. On Power Pages: Microsoft Entra ID first, then the local email form (vertical-stack layout).
 * Mock mode (dev server, e2e): both sign the chosen prototype persona in.
 */
export default function SignIn() {
  const { db, session, mode, setRole, notify } = useApp()
  const live = mode === 'live'
  const navigate = useNavigate()
  const { search } = useLocation()
  const styles = useStyles()
  const [params] = useSearchParams()
  const returnUrl = safeReturnUrl(params.get('ReturnUrl') ?? params.get('returnUrl'))
  const invitationCode = invitationCodeFrom(params)
  const emailFor = (role: SignedInRole) => db.contacts.find(c => c.id === PERSONAS.find(p => p.role === role)?.contactId)?.email ?? ''

  const [persona, setPersona] = useState<SignedInRole>('partner-admin')
  const [email, setEmail] = useState(() => (live ? '' : emailFor('partner-admin')))
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<FormError[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const current = PERSONAS.find(p => p.role === persona)!
  const notice = getAuthNotice(search)
  const expired = getSessionExpiredMessage(search)
  const serverError = getAuthError(search)

  const choosePersona = (role: SignedInRole) => {
    setPersona(role)
    setEmail(emailFor(role))
  }

  const signInMock = (via: 'local' | 'entra') => {
    setRole(persona)
    notify(`Signed in as ${current.name} (${current.label})${via === 'entra' ? ' with Microsoft Entra ID' : ''}.`)
    navigate(returnUrl, KEEP_NOTICE)
  }

  const signInExternal = async (provider: AuthProviderConfig) => {
    if (busy) return
    if (!live) return signInMock('entra')
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
      'signin-email': !email.trim() ? requiredMessage('Email') : !isEmailLike(email) && EMAIL_FORMAT,
      'signin-password': !password && requiredMessage('Password'),
    })
    setErrors(errs)
    if (errs.length) return
    if (!live || !LOCAL_PROVIDER) return signInMock('local')
    setBusy(LOCAL_PROVIDER.id)
    try {
      await loginWithProvider(LOCAL_PROVIDER, {
        returnUrl,
        invitationCode: invitationCode || undefined,
        credentials: { credential: email.trim(), password, rememberMe: remember },
      })
    } catch (err) {
      setErrors(authErrorMessages(err))
      setBusy(null)
    }
  }

  return (
    <Container>
      <PageHeader title="Sign in" breadcrumbs={[{ label: 'Sign in' }]} />
      {session.role !== 'anonymous' && (
        <div className="mb-6">
          <Alert tone="success" title="You’re already signed in">
            You’re signed in as {fullName(session.contact)} ({ROLE_LABELS[session.role]}).{' '}
            <AppLink to="/profile/" inline className={styles.linkStrong}>
              Go to your profile
            </AppLink>
            {live ? '.' : ' or choose another persona below to switch.'}
          </Alert>
        </div>
      )}
      <AuthSplit>
        <div className="space-y-3 mb-6 empty:hidden">
          {notice && <Alert tone="success">{notice}</Alert>}
          {expired && <Alert tone="warning">{expired}</Alert>}
          {serverError && <Alert tone="error">{serverError}</Alert>}
          {invitationCode && (
            <Alert tone="info" title="Redeeming an invitation">
              Sign in to redeem invitation {invitationCode}. It’s linked to your account after you sign in.
            </Alert>
          )}
        </div>
        <AuthIntro>Use your Microsoft Entra ID work account, or the email and password for your partner portal account.</AuthIntro>
        <ExternalProviderButtons verb="Sign in" busyId={busy} disabled={!!busy} onSelect={signInExternal} />
        <EmailDivider>or sign in with email</EmailDivider>
        <form onSubmit={onSubmit} noValidate>
          <ValidationSummary errors={errors} />
          <div className="space-y-4">
            <FormField id="signin-email" label="Email" required error={errorForId(errors, 'signin-email')}>
              <TextInput id="signin-email" type="email" value={email} autoComplete="username" onChange={e => setEmail(e.target.value)} />
            </FormField>
            <FormField
              id="signin-password"
              label="Password"
              required
              hint={live ? undefined : 'Any password works in this prototype.'}
              error={errorForId(errors, 'signin-password')}
            >
              <PasswordInput id="signin-password" value={password} autoComplete="current-password" onChange={e => setPassword(e.target.value)} />
            </FormField>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Checkbox id="signin-remember" label={live ? 'Remember me' : 'Remember me (prototype only)'} checked={remember} onChange={setRemember} />
              <AppLink to="/forgot-password">Forgot your password?</AppLink>
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              icon={<ArrowEnter20Regular />}
              pending={!!busy && busy === LOCAL_PROVIDER?.id}
              pendingLabel="Signing in…"
              disabledFocusable={!!busy && busy !== LOCAL_PROVIDER?.id}
            >
              Sign in
            </Button>
          </div>
        </form>
        <div className={styles.links}>
          <Body1 as="p" className={styles.linkLine}>
            New to the portal?{' '}
            <AppLink to={invitationCode ? `/registration?invitationCode=${encodeURIComponent(invitationCode)}` : '/registration'} inline className={styles.linkStrong}>
              Create an account
            </AppLink>
          </Body1>
          <Body1 as="p" className={styles.linkLine}>
            Have an invitation code?{' '}
            <AppLink to="/redeem-invitation" inline className={styles.linkStrong}>
              Redeem invitation
            </AppLink>
          </Body1>
        </div>
        {!live && (
          <Accordion collapsible defaultOpenItems={session.role !== 'anonymous' ? ['persona'] : []} className={styles.persona}>
            <AccordionItem value="persona">
              <AccordionHeader as="h2" className={styles.personaHeader} button={{ className: styles.personaButton }} expandIconPosition="end">
                <span>
                  Prototype: choose a persona
                  <Caption1 className={styles.personaCurrent}>
                    Signing in as {current.label} – {current.name}
                  </Caption1>
                </span>
              </AccordionHeader>
              <AccordionPanel className={styles.personaPanel}>
                <Caption1 as="p" id="persona-hint" className={styles.personaHint}>
                  Signing in switches the portal to the selected persona. Choose one, then select Sign in.
                </Caption1>
                <RadioGroup aria-label="Demo persona" aria-describedby="persona-hint" value={persona} onChange={(_, data) => choosePersona(data.value as SignedInRole)}>
                  {PERSONAS.map(p => (
                    <Radio
                      key={p.role}
                      id={`persona-${p.role}`}
                      value={p.role}
                      label={{
                        className: styles.radioLabel,
                        children: (
                          <>
                            <Text as="strong" weight="semibold">
                              {p.label}
                            </Text>{' '}
                            – {p.name}
                          </>
                        ),
                      }}
                    />
                  ))}
                </RadioGroup>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}
      </AuthSplit>
    </Container>
  )
}
