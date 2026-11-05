import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button as FluentButton, Caption1, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, makeStyles, tokens } from '@fluentui/react-components'
import {
  CheckmarkCircle20Regular,
  Edit20Regular,
  MoreHorizontal20Regular,
  PersonAdd20Regular,
  Prohibited20Regular,
  Save20Regular,
  Send20Regular,
  ShieldPerson20Regular,
} from '@fluentui/react-icons'
import type { Contact, PartnerContactRole } from '../../data/types'
import { Container } from '../../components/Layout'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import { FormPanel } from '../../components/FormPanel'
import { AppLink, Button, PageHeader, RoleText, StatusBadge } from '../../components/ui'
import { partnerContacts } from '../../lib/access'
import { fullName } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { PageSkeleton } from '../../components/skeletons'
import * as actions from '../../services/actions'
import { loadPartnerTeam } from '../../services/loaders'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { useRoutePreload } from '../../hooks/useRoutePreload'
import { CreatePartnerContactModal, LoadError, PartnerRoleRadios, editContactPath, latestInvitation, useContactActivation, useInvitation } from './partnerAdmin'

const useStyles = makeStyles({
  muted: { color: tokens.colorNeutralForeground2 },
  nameCell: { display: 'flex', flexDirection: 'column' },
  invitationCell: { display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, marginTop: '-6px', marginBottom: '-6px' },
  menuTrigger: { minWidth: '40px', minHeight: '40px' },
  note: { display: 'block', marginTop: tokens.spacingVerticalM, color: tokens.colorNeutralForeground2 },
})

export default function ManageAccess() {
  const styles = useStyles()
  const { db, session, mode, perform, notify } = useApp()
  const navigate = useNavigate()
  const preload = useRoutePreload()
  const load = useLiveLoad('team', asLoad(signal => loadPartnerTeam(undefined, signal)))
  const rows = partnerContacts(db, session)
  const invitation = useInvitation(load.reload)
  const activation = useContactActivation(load.reload)
  const [creating, setCreating] = useState(false)
  const [roleFor, setRoleFor] = useState<Contact | null>(null)
  const [roleValue, setRoleValue] = useState('')

  const saveRole = async () => {
    if (!roleFor) return
    const role = (roleValue || undefined) as PartnerContactRole | undefined
    const ok = await perform({
      mock: d => {
        const c = d.contacts.find(x => x.id === roleFor.id)
        if (c) c.partnerRole = role
      },
      live: () => actions.setPartnerRole(roleFor.id, role),
      refresh: load.reload,
    })
    if (!ok) return
    notify(`${fullName(roleFor)}'s role has been updated.`)
    setRoleFor(null)
  }

  const isSelf = (c: Contact) => c.id === session.contact?.id

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: c => fullName(c),
      render: c => (
        <span className={styles.nameCell}>
          <AppLink to={editContactPath(c.id)}>{fullName(c)}</AppLink>
          {isSelf(c) && <Caption1 className={styles.muted}>You</Caption1>}
        </span>
      ),
    },
    { key: 'email', header: 'Email', sortValue: c => c.email ?? '', render: c => c.email ?? '—' },
    { key: 'title', header: 'Job title', sortValue: c => c.jobTitle ?? '', render: c => c.jobTitle ?? '—' },
    {
      key: 'role',
      header: 'Partner role',
      sortValue: c => c.partnerRole ?? '',
      render: c => (c.partnerRole ? <RoleText role={c.partnerRole} /> : 'No partner role'),
    },
    { key: 'status', header: 'Status', sortValue: c => (c.active ? 'Active' : 'Inactive'), render: c => <StatusBadge status={c.active ? 'Active' : 'Inactive'} /> },
    createdOnColumn<Contact>(),
    {
      key: 'invitation',
      header: 'Invitation',
      sortValue: c => latestInvitation(db.invitations, c.id)?.status ?? '',
      render: c => {
        const inv = latestInvitation(db.invitations, c.id)
        const name = fullName(c)
        const badge = inv ? <StatusBadge status={inv.status === 'Redeemed' ? 'Accepted' : inv.status} /> : null
        if (!c.active || inv?.status === 'Redeemed') return badge ?? '—'
        if (!c.email)
          return (
            <span className={styles.invitationCell}>
              {badge}
              <AppLink to={editContactPath(c.id)} aria-label={`Add an email address for ${name} to invite them`}>
                Add email to invite
              </AppLink>
            </span>
          )
        const resend = inv?.status === 'Sent'
        return (
          <span className={styles.invitationCell}>
            {badge}
            <Button
              variant="ghost"
              icon={<Send20Regular />}
              aria-label={resend ? `Resend invitation to ${name}` : `Invite ${name}`}
              pending={invitation.sendingId === c.id}
              pendingLabel="Sending…"
              onClick={() => void invitation.send(c)}
            >
              {resend ? 'Resend' : 'Invite'}
            </Button>
          </span>
        )
      },
    },
  ]

  if (mode === 'live' && load.status === 'loading') return <PageSkeleton variant="list" />
  if (mode === 'live' && load.status === 'error') {
    return (
      <Container>
        <PageHeader title="Manage access" breadcrumbs={[{ label: 'Profile', to: '/profile/' }, { label: 'Manage access' }]} />
        <LoadError load={load} />
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader
        title="Manage access"
        description="Invite colleagues, choose their partner role and control who can sign in to the portal for your organization."
        breadcrumbs={[{ label: 'Profile', to: '/profile/' }, { label: 'Manage access' }]}
        actions={
          <Button variant="primary" icon={<PersonAdd20Regular />} onClick={() => setCreating(true)}>
            Create partner contact
          </Button>
        }
      />
      <DataTable
        caption="Partner contacts and their portal access"
        columns={columns}
        rows={rows}
        rowKey={c => c.id}
        initialSort={{ key: 'name', dir: 'asc' }}
        actions={c => {
          const name = fullName(c)
          return (
            <Menu positioning="below-end">
              <MenuTrigger disableButtonEnhancement>
                <FluentButton appearance="subtle" className={styles.menuTrigger} icon={<MoreHorizontal20Regular />} aria-label={`More actions for ${name}`} />
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem {...preload(editContactPath(c.id))} icon={<Edit20Regular />} onClick={() => navigate(editContactPath(c.id))}>
                    Edit contact
                  </MenuItem>
                  <MenuItem
                    icon={<ShieldPerson20Regular />}
                    onClick={() => {
                      setRoleValue(c.partnerRole ?? '')
                      setRoleFor(c)
                    }}
                  >
                    Change role
                  </MenuItem>
                  {!isSelf(c) && (
                    <MenuItem icon={c.active ? <Prohibited20Regular /> : <CheckmarkCircle20Regular />} onClick={() => activation.request(c)}>
                      {c.active ? 'Deactivate contact' : 'Activate contact'}
                    </MenuItem>
                  )}
                </MenuList>
              </MenuPopover>
            </Menu>
          )
        }}
      />
      <Caption1 as="p" className={styles.note}>
        You can&apos;t deactivate your own account. Ask another Partner Admin if you need to.
      </Caption1>

      <FormPanel
        open={roleFor !== null}
        title="Change role"
        dirty={roleValue !== (roleFor?.partnerRole ?? '')}
        onClose={() => setRoleFor(null)}
        submitLabel="Save role"
        submitIcon={<Save20Regular />}
        submitPendingLabel="Saving…"
        onSubmit={saveRole}
      >
        {roleFor && <PartnerRoleRadios label={`Partner role for ${fullName(roleFor)}`} value={roleValue} onChange={setRoleValue} />}
      </FormPanel>

      {activation.dialog}
      <CreatePartnerContactModal open={creating} onClose={() => setCreating(false)} refresh={load.reload} />
      {invitation.modal}
    </Container>
  )
}
