import { useState, type FormEvent } from 'react'
import {
  Body1Strong,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
} from '@fluentui/react-components'
import { Building20Regular, Delete20Regular, Key20Regular, Password20Regular, PlugConnected20Regular, Save20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { Alert, Button, ButtonLink, PageHeader, Panel, StatusBadge } from '../../components/ui'
import { FormField, PHONE_HINT, TextInput, ValidationSummary, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { useApp } from '../../store/AppStore'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { EMAIL_FORMAT, HAS_LOCAL_PASSWORD, PASSWORD_HINT, PASSWORD_MISMATCH, PasswordInput, SecurityNav, isEmailLike, newPasswordProblem , errorForId } from './authShared'

const useStyles = makeStyles({
  actionsCell: { textAlign: 'end', width: '140px' },
  actionsHeader: { width: '140px' },
})

type Mode = 'set-password' | 'change-password' | 'change-email' | 'change-phone' | 'change-login'

const TITLES: Record<Mode, { title: string; description: string }> = {
  'set-password': { title: 'Set password', description: 'Create a local account password so you can sign in without an external provider.' },
  'change-password': { title: 'Change password', description: 'Update the password for your local account.' },
  'change-email': { title: 'Change email', description: 'Update the email address used for sign-in and notifications.' },
  'change-phone': { title: 'Change phone number', description: 'Update the phone number associated with your account.' },
  'change-login': { title: 'External sign-in providers', description: 'Connect or remove the identity providers you use to sign in.' },
}

const SUBMIT: Record<Exclude<Mode, 'change-login'>, string> = {
  'set-password': 'Set password',
  'change-password': 'Update password',
  'change-email': 'Update email',
  'change-phone': 'Update phone number',
}

const SAVED: Record<Exclude<Mode, 'change-login'>, string> = {
  'set-password': 'Your password has been set.',
  'change-password': 'Your password has been updated.',
  'change-email': 'Your email has been updated.',
  'change-phone': 'Your phone number has been updated.',
}

export default function ManageSecurity({ mode }: { mode: 'set-password' | 'change-password' | 'change-email' | 'change-phone' | 'change-login' }) {
  const { title, description } = TITLES[mode]
  return (
    <Container>
      <PageHeader title={title} description={description} breadcrumbs={[{ label: 'Profile', to: '/profile/' }, { label: title }]} />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <SecurityNav />
        {mode === 'change-login' ? (
          <ExternalLogins />
        ) : mode === 'set-password' && HAS_LOCAL_PASSWORD ? (
          <Panel className="max-w-3xl">
            <div className="space-y-4">
              <Alert tone="info" title="You already have a password">
                Your account already signs in with a local password. To choose a new one, change your password instead.
              </Alert>
              <ButtonLink to="/Account/Manage/ChangePassword" icon={<Password20Regular />}>
                Change password
              </ButtonLink>
            </div>
          </Panel>
        ) : (
          <SecurityForm key={mode} mode={mode} />
        )}
      </div>
    </Container>
  )
}

function SecurityForm({ mode }: { mode: Exclude<Mode, 'change-login'> }) {
  const { session, mutate } = useApp()
  const contact = session.contact
  const [v, setV] = useState({
    username: contact?.email ?? '',
    current: '',
    password: '',
    confirm: '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
  })
  const [errors, setErrors] = useState<FormError[]>([])
  const [saved, setSaved] = useState(false)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV(s => ({ ...s, [k]: e.target.value }))

  const validate = (): FormError[] => {
    const newPassword = {
      'sec-new': !v.password ? requiredMessage('New password') : newPasswordProblem(v.password),
      'sec-confirm': !v.confirm ? 'Confirm your new password' : v.password && v.password !== v.confirm && PASSWORD_MISMATCH,
    }
    if (mode === 'set-password') return fieldErrors({ 'sec-username': !v.username.trim() && requiredMessage('Username'), ...newPassword })
    if (mode === 'change-password') return fieldErrors({ 'sec-current': !v.current && requiredMessage('Current password'), ...newPassword })
    if (mode === 'change-email') return fieldErrors({ 'sec-email': !v.email.trim() ? requiredMessage('Email') : !isEmailLike(v.email) && EMAIL_FORMAT })
    return fieldErrors({ 'sec-phone': !v.phone.trim() && requiredMessage('Phone number') })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    setSaved(errs.length === 0)
    if (errs.length) return
    if (contact && (mode === 'change-email' || mode === 'change-phone')) {
      mutate(d => {
        const c = d.contacts.find(x => x.id === contact.id)
        if (!c) return
        if (mode === 'change-email') c.email = v.email.trim()
        else c.phone = v.phone.trim()
      })
    }
    setV(s => ({ ...s, current: '', password: '', confirm: '' }))
  }

  const input = (id: string, label: string, key: keyof typeof v, type = 'text', extra: { autoComplete?: string; hint?: string } = {}) => {
    const { hint, ...inputProps } = extra
    return (
      <FormField id={id} label={label} required hint={hint} error={errorForId(errors, id)}>
        {type === 'password' ? (
          <PasswordInput id={id} value={v[key]} onChange={set(key)} {...inputProps} />
        ) : (
          <TextInput id={id} type={type} value={v[key]} onChange={set(key)} {...inputProps} />
        )}
      </FormField>
    )
  }

  return (
    <Panel className="max-w-3xl">
      <form onSubmit={onSubmit} noValidate className="max-w-[40rem] space-y-4">
        <ValidationSummary errors={errors} />
        {saved && <Alert tone="success">{SAVED[mode]}</Alert>}
        {mode === 'set-password' && (
          <>
            {input('sec-username', 'Username', 'username', 'text', { autoComplete: 'username' })}
            {input('sec-new', 'New password', 'password', 'password', { autoComplete: 'new-password', hint: PASSWORD_HINT })}
            {input('sec-confirm', 'Confirm new password', 'confirm', 'password', { autoComplete: 'new-password' })}
          </>
        )}
        {mode === 'change-password' && (
          <>
            {input('sec-current', 'Current password', 'current', 'password', { autoComplete: 'current-password' })}
            {input('sec-new', 'New password', 'password', 'password', { autoComplete: 'new-password', hint: PASSWORD_HINT })}
            {input('sec-confirm', 'Confirm new password', 'confirm', 'password', { autoComplete: 'new-password' })}
          </>
        )}
        {mode === 'change-email' && input('sec-email', 'Email', 'email', 'email', { autoComplete: 'email' })}
        {mode === 'change-phone' && input('sec-phone', 'Phone number', 'phone', 'tel', { autoComplete: 'tel', hint: PHONE_HINT })}
        <Button type="submit" variant="primary" icon={<Save20Regular />}>
          {SUBMIT[mode]}
        </Button>
      </form>
    </Panel>
  )
}

function ExternalLogins() {
  const styles = useStyles()
  const changed = useInlineFeedback()
  const [providers, setProviders] = useState([
    { id: 'entra', name: 'Microsoft Entra ID', connected: true },
    { id: 'local', name: 'Local account', connected: false },
  ])
  const toggle = (id: string) => {
    const p = providers.find(x => x.id === id)!
    setProviders(list => list.map(x => (x.id === id ? { ...x, connected: !x.connected } : x)))
    changed.show(p.connected ? `${p.name} has been removed from your account.` : `${p.name} has been connected to your account.`)
  }
  return (
    <>
    <Panel bodyClassName="p-0" className="max-w-3xl">
      <Table>
        <caption className="sr-only">Sign-in providers connected to your account</caption>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Provider</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className={styles.actionsHeader}>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map(p => (
            <TableRow key={p.id}>
              <TableCell>
                <TableCellLayout media={p.id === 'entra' ? <Building20Regular /> : <Key20Regular />}>
                  <Body1Strong>{p.name}</Body1Strong>
                </TableCellLayout>
              </TableCell>
              <TableCell>
                <StatusBadge status={p.connected ? 'Connected' : 'Not connected'} tone={p.connected ? 'green' : 'slate'} />
              </TableCell>
              <TableCell className={styles.actionsCell}>
                <Button
                  size="sm"
                  variant={p.connected ? 'danger' : 'primary'}
                  icon={p.connected ? <Delete20Regular /> : <PlugConnected20Regular />}
                  onClick={() => toggle(p.id)}
                  aria-label={`${p.connected ? 'Remove' : 'Connect'} ${p.name}`}
                >
                  {p.connected ? 'Remove' : 'Connect'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
    <InlineFeedback feedback={changed.feedback} className="mt-3" />
    </>
  )
}
