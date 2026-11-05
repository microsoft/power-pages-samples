import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Radio, RadioGroup, Text, makeStyles, tokens } from '@fluentui/react-components'
import { Briefcase20Regular, Checkmark20Regular, Dismiss20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import { FormField, TextArea } from '../../components/forms'
import { ConfirmDialog } from '../../components/Modal'
import { FormPanel } from '../../components/FormPanel'
import { AppLink, Button, ButtonLink, PageHeader } from '../../components/ui'
import { DECLINE_REASONS, type Opportunity } from '../../data/types'
import { distributedOpportunities } from '../../lib/access'
import { formatCurrency, formatDate } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { KEEP_NOTICE } from '../../lib/notice'
import { PageSkeleton } from '../../components/skeletons'
import { loadOpportunityListFresh } from '../../services/opportunities'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { OpportunityLoadError } from '../../services/opportunitiesView'
import { ExpiryCell, Numeric } from './OppParts'
import { OPP_ROUTES, accountName, useDistributedResponse, type DeclineInput } from './oppUtils'

const useStyles = makeStyles({
  strong: { color: tokens.colorNeutralForeground1 },
  intro: { margin: 0, marginBottom: tokens.spacingVerticalL, color: tokens.colorNeutralForeground2 },
  fields: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
})

/** Decline dialog: asks why (required) plus an optional note. Shared with the opportunity summary. */
export function DeclineDialog({
  opp,
  onClose,
  onDecline,
}: {
  opp: Opportunity | null
  onClose: () => void
  onDecline: (input: DeclineInput) => unknown
}) {
  const styles = useStyles()
  const { mode } = useApp()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState(false)

  const close = () => {
    setReason('')
    setNote('')
    setError(false)
    onClose()
  }

  const submit = async (allowNavigation: () => void) => {
    if (!reason) {
      setError(true)
      document.getElementById('decline-reason')?.querySelector<HTMLInputElement>('input')?.focus()
      return
    }
    allowNavigation()
    await onDecline({ reason, note })
    close()
  }

  // Live: confirmation only – no decline reason is captured (spec D1).
  if (mode === 'live') {
    return (
      <ConfirmDialog
        open={!!opp}
        title="Decline opportunity"
        message={
          <>
            <Text as="strong" weight="semibold" className={styles.strong}>
              {opp?.topic}
            </Text>{' '}
            will be returned to Zava and removed from your list.
          </>
        }
        confirmLabel="Decline opportunity"
        tone="danger"
        pendingLabel="Declining…"
        onConfirm={() => onDecline({ reason: '' })}
        onClose={onClose}
      />
    )
  }

  return (
    <FormPanel
      open={!!opp}
      title="Decline opportunity"
      dirty={reason !== '' || note !== ''}
      onClose={close}
      submitLabel="Decline opportunity"
      submitIcon={<Dismiss20Regular />}
      submitPendingLabel="Declining…"
      destructive
      onSubmit={submit}
    >
      <Text as="p" className={styles.intro}>
        <Text as="strong" weight="semibold" className={styles.strong}>
          {opp?.topic}
        </Text>{' '}
        will be returned to Zava and removed from your list. Tell Zava why so it can route similar leads better.
      </Text>
      <div className={styles.fields}>
        <Field
          label="Reason for declining"
          required
          validationState={error ? 'error' : 'none'}
          validationMessage={error ? 'Select a reason for declining' : undefined}
        >
          <RadioGroup
            id="decline-reason"
            value={reason}
            onChange={(_, data) => {
              setReason(data.value)
              setError(false)
            }}
          >
            {DECLINE_REASONS.map(r => (
              <Radio key={r} value={r} label={r} />
            ))}
          </RadioGroup>
        </Field>
        <FormField id="decline-note" label="Note" optional hint="Anything Zava should know, such as who to contact instead.">
          <TextArea id="decline-note" rows={3} value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
        </FormField>
      </div>
    </FormPanel>
  )
}

export default function DistributedOpportunities() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { db, session, mode } = useApp()
  const load = useLiveLoad('opps:distributed', asLoad(signal => loadOpportunityListFresh('distributed', undefined, signal)))
  const { accept, decline } = useDistributedResponse()
  const [accepting, setAccepting] = useState<Opportunity | null>(null)
  const [declining, setDeclining] = useState<Opportunity | null>(null)
  const rows = distributedOpportunities(db, session)

  if (mode === 'live' && load.status === 'error') return <OpportunityLoadError load={load} />
  if (mode === 'live' && load.status === 'loading') return <PageSkeleton variant="list" />

  const columns: Column<Opportunity>[] = [
    {
      key: 'topic',
      header: 'Topic',
      sortValue: o => o.topic,
      render: o => (
        <AppLink to={OPP_ROUTES.summary(o.id)} inline>
          {o.topic}
        </AppLink>
      ),
    },
    { key: 'expiry', header: 'Respond by', sortValue: o => o.expiryDate ?? '9999', render: o => <ExpiryCell date={o.expiryDate} /> },
    { key: 'customer', header: 'Potential customer', sortValue: o => accountName(db, o.customerId), render: o => accountName(db, o.customerId) },
    { key: 'revenue', header: 'Estimated revenue', sortValue: o => o.estRevenue, render: o => <Numeric>{formatCurrency(o.estRevenue)}</Numeric>, className: 'text-right' },
    { key: 'close', header: 'Estimated close date', sortValue: o => o.estCloseDate, render: o => formatDate(o.estCloseDate) },
    createdOnColumn<Opportunity>(),
  ]

  return (
    <Container>
      <PageHeader
        title="Distributed opportunities"
        eyebrow="Opportunities"
        breadcrumbs={[{ label: 'Opportunities', to: OPP_ROUTES.home }, { label: 'Distributed opportunities' }]}
        description="Leads Zava has sent to your organization. Accept to start working them, or decline to return them to Zava. Respond before the date shown."
      />
      <DataTable
        caption="Distributed opportunities"
        columns={columns}
        rows={rows}
        rowKey={o => o.id}
        initialSort={{ key: 'expiry', dir: 'asc' }}
        empty={{
          title: 'No opportunities waiting for a response',
          body: 'When Zava sends your organization a new lead, it appears here for you to accept or decline.',
          action: (
            <ButtonLink to={OPP_ROUTES.managed} icon={<Briefcase20Regular />}>
              Go to managed opportunities
            </ButtonLink>
          ),
        }}
        actions={o => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" icon={<Checkmark20Regular />} onClick={() => setAccepting(o)}>
              Accept<span className="sr-only"> {o.topic}</span>
            </Button>
            <Button size="sm" variant="ghost" icon={<Dismiss20Regular />} onClick={() => setDeclining(o)}>
              Decline<span className="sr-only"> {o.topic}</span>
            </Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={!!accepting}
        title="Accept opportunity"
        message={
          <>
            Move <Text as="strong" weight="semibold" className={styles.strong}>{accepting?.topic}</Text> to your managed opportunities and open its details.
          </>
        }
        confirmLabel="Accept opportunity"
        pendingLabel="Accepting…"
        onConfirm={async () => {
          if (!accepting) return
          const opp = accepting
          if (await accept(opp)) navigate(OPP_ROUTES.details(opp.id), KEEP_NOTICE)
        }}
        onClose={() => setAccepting(null)}
      />
      <DeclineDialog opp={declining} onClose={() => setDeclining(null)} onDecline={input => (declining ? decline(declining, input, load.reload) : undefined)} />
    </Container>
  )
}
