import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Body1, Caption1, Caption1Strong, Link as FluentLink, makeStyles, shorthands, tokens } from '@fluentui/react-components'
import { CheckmarkCircle20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { AppLink, Button, PageHeader } from '../../components/ui'
import { Checkbox, FormField, TextInput, ValidationSummary, requiredFieldErrors, type FormError } from '../../components/forms'
import { ROLE_LABELS } from '../../lib/access'
import { fullName } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { redeemInvitation } from '../../services/authService'
import { AuthIntro, AuthSplit, authErrorMessages, errorForId, invitationCodeFrom, roleForPartnerRole } from './authShared'
import { KEEP_NOTICE } from '../../lib/notice'

const DEMO_CODE = 'NWP-3T8H-6R1Z'
const INVALID = 'This invitation code is invalid or has already been redeemed. Check the code in your invitation email.'

const useStyles = makeStyles({
  hint: {
    display: 'block',
    marginTop: tokens.spacingVerticalXXL,
    border: `${tokens.strokeWidthThin} dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground2,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL),
  },
  hintLabel: { color: tokens.colorNeutralForeground1 },
  code: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase200 },
  footer: { display: 'block', marginTop: tokens.spacingVerticalXXL, color: tokens.colorNeutralForeground1 },
  linkStrong: { fontWeight: tokens.fontWeightSemibold },
})

export default function RedeemInvitation() {
  const { db, mode, mutate, signInAs, notify } = useApp()
  const live = mode === 'live'
  const navigate = useNavigate()
  const styles = useStyles()
  const [params] = useSearchParams()
  const [code, setCode] = useState(() => invitationCodeFrom(params))
  const [existing, setExisting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<FormError[]>([])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const errs = requiredFieldErrors([['Invitation code', code, 'redeem-code']])
    setErrors(errs)
    if (errs.length) return
    const trimmed = code.trim()
    if (live) {
      setBusy(true)
      try {
        const { nextStep } = await redeemInvitation(trimmed, existing)
        navigate(`${nextStep === 'login' ? '/login' : '/registration'}?invitationCode=${encodeURIComponent(trimmed)}`)
      } catch (err) {
        setErrors(authErrorMessages(err).map(message => ({ id: 'redeem-code', message })))
        setBusy(false)
      }
      return
    }
    const normalized = trimmed.toUpperCase()
    const inv = db.invitations.find(i => i.code.toUpperCase() === normalized && i.status === 'Sent')
    const contact = inv && db.contacts.find(c => c.id === inv.contactId)
    if (!inv || !contact || !contact.active) {
      setErrors([{ id: 'redeem-code', message: INVALID }])
      return
    }
    if (existing) {
      navigate(`/login?invitationCode=${encodeURIComponent(trimmed)}`)
      return
    }
    const role = roleForPartnerRole(contact.partnerRole)
    mutate(d => {
      const target = d.invitations.find(i => i.id === inv.id)
      if (target) target.status = 'Redeemed'
    })
    signInAs(contact.id)
    notify(`Invitation redeemed. Welcome, ${fullName(contact)} — you’re signed in as ${ROLE_LABELS[role]}.`)
    navigate('/profile/', KEEP_NOTICE)
  }

  return (
    <Container>
      <PageHeader title="Redeem invitation" breadcrumbs={[{ label: 'Sign in', to: '/login' }, { label: 'Redeem invitation' }]} />
      <AuthSplit panelHeading="You have been invited to the partner portal.">
        <AuthIntro>Enter the invitation code from the email your Partner Admin sent you.</AuthIntro>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <ValidationSummary errors={errors} />
          <FormField id="redeem-code" label="Invitation code" required hint="For example, ABC-1234-XYZ9" error={errorForId(errors, 'redeem-code')}>
            <TextInput id="redeem-code" value={code} autoComplete="off" onChange={e => setCode(e.target.value)} className="font-mono" />
          </FormField>
          <Checkbox id="redeem-existing" label="Sign in with an existing account instead of registering" checked={existing} onChange={setExisting} />
          <Button type="submit" variant="primary" className="w-full" icon={<CheckmarkCircle20Regular />} pending={busy} pendingLabel="Checking invitation…">
            Redeem invitation
          </Button>
        </form>
        {!live && (
          <Caption1 as="p" className={styles.hint}>
            <Caption1Strong className={styles.hintLabel}>Prototype hint:</Caption1Strong> try the demo code{' '}
            <FluentLink as="button" type="button" inline className={styles.code} onClick={() => setCode(DEMO_CODE)}>
              {DEMO_CODE}
            </FluentLink>{' '}
            (invitation sent to Casey Nguyen).
          </Caption1>
        )}
        <Body1 as="p" className={styles.footer}>
          No invitation?{' '}
          <AppLink to="/registration" inline className={styles.linkStrong}>
            Create an account
          </AppLink>
        </Body1>
      </AuthSplit>
    </Container>
  )
}
