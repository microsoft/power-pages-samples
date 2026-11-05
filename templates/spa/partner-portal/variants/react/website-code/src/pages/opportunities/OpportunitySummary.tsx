import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Text, makeStyles, tokens } from '@fluentui/react-components'
import { Checkmark20Regular, Dismiss20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { ConfirmDialog } from '../../components/Modal'
import { Button, DetailList, PageHeader, Panel } from '../../components/ui'
import { distributedOpportunities } from '../../lib/access'
import { formatCurrency, formatDate } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { KEEP_NOTICE } from '../../lib/notice'
import { PageSkeleton } from '../../components/skeletons'
import { loadOpportunityWorkspace } from '../../services/loaders'
import { useLiveLoad } from '../../services/useLiveLoad'
import { OpportunityLoadError } from '../../services/opportunitiesView'
import { DeclineDialog } from './DistributedOpportunities'
import { ExpiryCell, NoAccess } from './OppParts'
import { OPP_ROUTES, accountName, useDistributedResponse } from './oppUtils'

const useStyles = makeStyles({
  strong: { color: tokens.colorNeutralForeground1 },
  divider: { borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
})

export default function OpportunitySummary() {
  const styles = useStyles()
  const { db, session, mode } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { accept, decline } = useDistributedResponse()
  const [confirm, setConfirm] = useState<'accept' | 'decline' | null>(null)
  const id = params.get('id') ?? ''
  const load = useLiveLoad(id ? `opp:summary:${id}` : null, signal => loadOpportunityWorkspace(id, {}, signal))
  const opp = load.result?.found === false ? undefined : distributedOpportunities(db, session).find(o => o.id === id)
  const crumbs = [
    { label: 'Opportunities', to: OPP_ROUTES.home },
    { label: 'Distributed opportunities', to: OPP_ROUTES.distributed },
    { label: opp?.topic ?? 'Opportunity summary' },
  ]

  if (mode === 'live' && id) {
    if (load.status === 'error') return <OpportunityLoadError load={load} />
    if (load.status === 'loading' && !opp) return <PageSkeleton variant="summary" />
  }

  if (!opp) {
    return (
      <Container>
        <PageHeader title="Opportunity summary" breadcrumbs={crumbs} />
        <NoAccess backTo={OPP_ROUTES.distributed} backLabel="Back to distributed opportunities" />
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader
        title={opp.topic}
        eyebrow="Distributed opportunity"
        breadcrumbs={crumbs}
        description={
          <>
            Reference <Text font="monospace">{opp.referenceCode}</Text>. Accept to start working it, or decline to return it to Zava.
          </>
        }
        actions={
          <>
            <Button variant="primary" icon={<Checkmark20Regular />} onClick={() => setConfirm('accept')}>
              Accept opportunity
            </Button>
            <Button icon={<Dismiss20Regular />} onClick={() => setConfirm('decline')}>
              Decline
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title="Opportunity details">
          <DetailList
            items={[
              { label: 'Topic', value: opp.topic },
              { label: 'Potential customer', value: accountName(db, opp.customerId) },
              { label: 'Estimated revenue', value: formatCurrency(opp.estRevenue) },
              { label: 'Estimated close date', value: formatDate(opp.estCloseDate) },
              { label: 'Purchase timeframe', value: opp.purchaseTimeframe },
              { label: 'Territory', value: opp.territory },
            ]}
          />
          <div className={`mt-6 pt-5 ${styles.divider}`}>
            <DetailList
              columns={1}
              items={[
                { label: 'Description', value: opp.description },
                { label: 'Customer need', value: opp.customerNeed },
              ]}
            />
          </div>
        </Panel>
        <Panel title="Distribution">
          <DetailList
            columns={1}
            items={[
              { label: 'Respond by', value: <ExpiryCell date={opp.expiryDate} /> },
              { label: 'Reference code', value: <Text font="monospace">{opp.referenceCode}</Text> },
            ]}
          />
        </Panel>
      </div>
      <ConfirmDialog
        open={confirm === 'accept'}
        title="Accept opportunity"
        message={
          <>
            Move <Text as="strong" weight="semibold" className={styles.strong}>{opp.topic}</Text> to your managed opportunities and open its details.
          </>
        }
        confirmLabel="Accept opportunity"
        pendingLabel="Accepting…"
        onConfirm={async () => {
          if (await accept(opp)) navigate(OPP_ROUTES.details(opp.id), KEEP_NOTICE)
        }}
        onClose={() => setConfirm(null)}
      />
      <DeclineDialog
        opp={confirm === 'decline' ? opp : null}
        onClose={() => setConfirm(null)}
        onDecline={async input => {
          if (await decline(opp, input)) navigate(OPP_ROUTES.distributed, KEEP_NOTICE)
        }}
      />
    </Container>
  )
}
