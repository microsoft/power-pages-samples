import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Body1, Caption1, Text, makeStyles, tokens } from '@fluentui/react-components'
import { DocumentCheckmark20Regular, Stethoscope20Regular, VehicleTruckProfile20Regular, Location20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { FormPanel } from '../../components/FormPanel'
import { Checkbox, FieldList, FormField, Select, TextArea, ValidationSummary, fieldErrorFor, fieldErrors, type FormError } from '../../components/forms'
import { InlineFeedback } from '../../components/InlineFeedback'
import { PageSkeleton } from '../../components/skeletons'
import { Alert, AppLink, Button, DetailList, PageHeader, Panel, StatusBadge } from '../../components/ui'
import { SERVICE_OUTCOMES, WORK_ORDER_FAULTS, type Booking, type ReplacementPart, type ServiceOutcome, type WorkOrder } from '../../data/types'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { usePendingAction } from '../../hooks/usePendingAction'
import { canActOnWorkOrder, myBooking, technicianWorkOrders } from '../../lib/access'
import { formatAddress, formatDateTime, fullName } from '../../lib/format'
import { PERMISSION_MESSAGE } from '../../services/http'
import { loadTechnicianWorkOrder, workOrderAction } from '../../services/technician'
import { useLiveLoad } from '../../services/useLiveLoad'
import { useApp } from '../../store/AppStore'
import { LoadError } from '../customers/LoadError'
import {
  MOCK_REPLACEMENT_PARTS,
  NEXT_STATUS,
  WO_ROUTES,
  formatVisitWindow,
  mockDiagnose,
  mockReport,
  mockSetStatus,
  purchaseOrderNumber,
  visitBooking,
  workOrderPlace,
} from './workOrderUtils'

const useStyles = makeStyles({
  statusRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalXS },
  muted: { color: tokens.colorNeutralForeground2 },
  intro: { display: 'block', marginBottom: tokens.spacingVerticalL, color: tokens.colorNeutralForeground2 },
  field: { marginTop: tokens.spacingVerticalL },
  timeline: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  timelineItem: {
    borderInlineStartWidth: tokens.strokeWidthThick,
    borderInlineStartStyle: 'solid',
    borderInlineStartColor: tokens.colorBrandStroke2,
    paddingInlineStart: tokens.spacingHorizontalM,
  },
  sectionText: { whiteSpace: 'pre-line' },
})

const BREADCRUMB = { label: 'Work orders', to: WO_ROUTES.home }

export default function WorkOrderDetails() {
  const { db, session, mode } = useApp()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const live = mode === 'live'
  const load = useLiveLoad(id ? `wo:details:${id}` : null, signal => loadTechnicianWorkOrder(id, signal))
  const wo = live && load.result?.found === false ? undefined : technicianWorkOrders(db, session).find(w => w.id === id)

  if (live && id) {
    if (load.status === 'error')
      return <LoadError title="Work order" breadcrumbs={[BREADCRUMB, { label: 'Work order' }]} error={load.error} onRetry={() => void load.reload()} />
    if (load.status === 'loading') return <PageSkeleton variant="detail" />
  }

  if (!wo) {
    return (
      <Container>
        <PageHeader title="Work order" breadcrumbs={[BREADCRUMB, { label: 'Work order' }]} />
        <Alert tone="info" title="You can't view this work order">
          <p>It may have been reassigned, or it isn't assigned to you or your organization. Contact Zava dispatch if you need access.</p>
          <p className="mt-2">
            <AppLink to={WO_ROUTES.home} inline>
              Back to work orders
            </AppLink>
          </p>
        </Alert>
      </Container>
    )
  }
  return <DetailsBody key={wo.id} wo={wo} parts={live ? (load.result?.parts ?? []) : MOCK_REPLACEMENT_PARTS} reload={load.reload} />
}

function DetailsBody({ wo, parts, reload }: { wo: WorkOrder; parts: ReplacementPart[]; reload: () => Promise<void> }) {
  const styles = useStyles()
  const { db, session, perform } = useApp()
  const me = fullName(session.contact)
  const mine = myBooking(db, session, wo.id)
  const booking = mine ?? visitBooking(db, wo.id, session.contact?.id)
  const canAct = canActOnWorkOrder(db, session, wo)
  const onSite = canAct && !!mine && (mine.status === 'In Progress' || mine.status === 'On Break')
  const next = canAct && mine ? NEXT_STATUS[mine.status] : undefined
  const [panel, setPanel] = useState<'diagnosis' | 'report' | null>(null)
  const status = useInlineFeedback(mine?.status)
  const { pending, run } = usePendingAction()

  const advance = () =>
    run(async () => {
      if (!mine || !next) return
      const ok = await perform({
        mock: d => mockSetStatus(d, wo.id, mine.id, next.to, me),
        live: () => workOrderAction({ action: next.action, workOrderId: wo.id, bookingId: mine.id }),
        refresh: reload,
      })
      if (ok)
        status.show(next.to === 'Traveling' ? 'Status updated: traveling to site.' : 'Arrival recorded. You can now record your diagnosis.', 'success', {
          watch: next.to,
        })
    })

  const primary = next ? (
    <Button
      variant="primary"
      icon={next.action === 'travel' ? <VehicleTruckProfile20Regular /> : <Location20Regular />}
      pending={pending}
      pendingLabel={next.pendingLabel}
      onClick={() => void advance()}
    >
      {next.label}
    </Button>
  ) : onSite && !wo.diagnosis ? (
    <Button variant="primary" icon={<Stethoscope20Regular />} onClick={() => setPanel('diagnosis')}>
      Record diagnosis
    </Button>
  ) : onSite ? (
    <>
      <Button icon={<Stethoscope20Regular />} onClick={() => setPanel('diagnosis')}>
        Edit diagnosis
      </Button>
      <Button variant="primary" icon={<DocumentCheckmark20Regular />} onClick={() => setPanel('report')}>
        Submit service report
      </Button>
    </>
  ) : null

  const visitStatus = booking?.status ?? wo.systemStatus

  return (
    <Container>
      <PageHeader
        title={`${wo.number} · ${wo.title}`}
        eyebrow="Work order"
        breadcrumbs={[BREADCRUMB, { label: wo.number }]}
        description={
          <div>
            <Text className={styles.muted}>
              {workOrderPlace(wo)} · {wo.priority}
            </Text>
            <div className={styles.statusRow}>
              <Text weight="semibold">Visit status</Text>
              <StatusBadge status={visitStatus} />
              <InlineFeedback feedback={status.feedback} />
            </div>
          </div>
        }
        actions={primary}
      />

      {!canAct && !wo.report && booking && booking.resourceContactId !== session.contact?.id && (
        <div className="mb-6">
          <Alert tone="info" title={`Assigned to ${booking.resourceName}`}>
            You can view this work order because it belongs to your organization. Only the assigned technician can update its status, diagnosis or service
            report.
          </Alert>
        </div>
      )}
      {canAct && mine && !onSite && !next && (
        <div className="mb-6">
          <Alert tone="info">This visit is on hold. Contact Zava dispatch to continue it.</Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Visit">
            <DetailList
              items={[
                { label: 'Customer', value: wo.customerName },
                { label: 'Site', value: wo.siteName },
                { label: 'Address', value: formatAddress(wo.address) },
                {
                  label: 'Contact on site',
                  value: wo.siteContact ? `${wo.siteContact.name}${wo.siteContact.phone ? ` · ${wo.siteContact.phone}` : ''}` : undefined,
                },
                { label: 'Scheduled', value: formatVisitWindow(booking) },
                { label: 'Technician', value: booking?.resourceName },
                { label: 'Arrived', value: booking?.arrivedOn ? formatDateTime(booking.arrivedOn) : undefined },
                { label: 'Case', value: wo.caseNumber ? `${wo.caseNumber}${wo.caseTitle ? ` · ${wo.caseTitle}` : ''}` : undefined },
              ]}
            />
            {wo.instructions && (
              <div className="mt-5">
                <Text weight="semibold" as="h3" block>
                  Instructions
                </Text>
                <Body1 as="p" className={styles.sectionText}>
                  {wo.instructions}
                </Body1>
              </div>
            )}
          </Panel>

          <Panel title="Diagnosis">
            {wo.diagnosis ? (
              <DetailList
                items={[
                  { label: 'Fault', value: wo.diagnosis.fault },
                  { label: 'Replacement part', value: wo.diagnosis.partRequired ? wo.diagnosis.part || 'Required' : 'Not required' },
                  { label: 'What was found', value: <span className={styles.sectionText}>{wo.diagnosis.findings}</span> },
                  { label: 'Recorded', value: `${formatDateTime(wo.diagnosis.recordedOn)}${wo.diagnosis.recordedBy ? ` by ${wo.diagnosis.recordedBy}` : ''}` },
                ]}
              />
            ) : (
              <Body1 as="p" className={styles.muted}>
                {onSite
                  ? 'Not recorded yet. Record what you found before submitting the service report.'
                  : 'Not recorded yet. The diagnosis is recorded on site, after arrival.'}
              </Body1>
            )}
          </Panel>

          {wo.report && (
            <Panel title="Service report">
              <DetailList
                columns={1}
                items={[
                  { label: 'Outcome', value: <StatusBadge status={wo.report.outcome} tone={wo.report.outcome === 'Resolved' ? 'green' : 'amber'} /> },
                  { label: 'Work performed', value: <span className={styles.sectionText}>{wo.report.workPerformed}</span> },
                  { label: 'Summary for the customer', value: <span className={styles.sectionText}>{wo.report.customerSummary}</span> },
                  { label: 'Submitted', value: `${formatDateTime(wo.report.submittedOn)}${wo.report.submittedBy ? ` by ${wo.report.submittedBy}` : ''}` },
                  {
                    label: 'Purchase order',
                    value: wo.purchaseOrder ? (
                      <>
                        {wo.purchaseOrder.number} <StatusBadge status={wo.purchaseOrder.status} />
                        {wo.purchaseOrder.part ? ` · ${wo.purchaseOrder.part}` : ''}
                      </>
                    ) : undefined,
                  },
                ]}
              />
            </Panel>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Asset">
            {wo.asset ? (
              <DetailList
                columns={1}
                items={[
                  { label: 'Asset', value: wo.asset.name },
                  { label: 'Model', value: wo.asset.model },
                  { label: 'Serial number', value: wo.asset.serialNumber },
                  { label: 'Location', value: wo.asset.location },
                ]}
              />
            ) : (
              <Body1 as="p" className={styles.muted}>
                No asset is linked to this work order.
              </Body1>
            )}
          </Panel>
          <Panel title="Work order">
            <DetailList
              columns={1}
              items={[
                { label: 'Number', value: wo.number },
                { label: 'Type', value: wo.type },
                { label: 'Incident type', value: wo.incidentType },
                { label: 'Priority', value: wo.priority },
                { label: 'Work order status', value: <StatusBadge status={wo.systemStatus} /> },
              ]}
            />
          </Panel>
          <Panel title="Activity">
            <Timeline wo={wo} />
          </Panel>
        </div>
      </div>

      {mine && (
        <>
          <DiagnosisPanel open={panel === 'diagnosis'} wo={wo} booking={mine} parts={parts} reload={reload} onClose={() => setPanel(null)} />
          <ReportPanel open={panel === 'report'} wo={wo} booking={mine} reload={reload} onClose={() => setPanel(null)} />
        </>
      )}
    </Container>
  )
}

function Timeline({ wo }: { wo: WorkOrder }) {
  const styles = useStyles()
  const events = [...wo.timeline].sort((a, b) => b.at.localeCompare(a.at))
  if (events.length === 0)
    return (
      <Body1 as="p" className={styles.muted}>
        No activity yet.
      </Body1>
    )
  return (
    <ol className={styles.timeline} aria-label="Work order activity, newest first">
      {events.map(e => (
        <li key={e.id} className={styles.timelineItem}>
          <Body1 as="p" block>
            {e.text}
          </Body1>
          <Caption1 as="p" block className={styles.muted}>
            {formatDateTime(e.at)}
            {e.by ? ` · ${e.by}` : ''}
          </Caption1>
        </li>
      ))}
    </ol>
  )
}

/** Resets a panel's draft each time it opens (the panel keeps its last render while it animates out). */
function useDraftOnOpen<T>(open: boolean, initial: () => T) {
  const [draft, setDraft] = useState(initial)
  const [baseline, setBaseline] = useState(initial)
  const [errors, setErrors] = useState<FormError[]>([])
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const next = initial()
      setDraft(next)
      setBaseline(next)
      setErrors([])
    }
  }
  return { draft, setDraft, errors, setErrors, dirty: JSON.stringify(draft) !== JSON.stringify(baseline) }
}

interface PanelProps {
  open: boolean
  wo: WorkOrder
  booking: Booking
  reload: () => Promise<void>
  onClose: () => void
}

function DiagnosisPanel({ open, wo, booking, parts, reload, onClose }: PanelProps & { parts: ReplacementPart[] }) {
  const styles = useStyles()
  const { session, perform, notify } = useApp()
  const { draft, setDraft, errors, setErrors, dirty } = useDraftOnOpen(open, () => ({
    fault: wo.diagnosis?.fault ?? '',
    findings: wo.diagnosis?.findings ?? '',
    partRequired: wo.diagnosis?.partRequired ?? false,
    partId: wo.diagnosis?.partId ?? parts.find(p => p.number && p.number === wo.diagnosis?.partNumber)?.id ?? '',
  }))
  const editing = !!wo.diagnosis
  const partOptions = parts.map(p => ({ value: p.id, label: p.number ? `${p.name} (${p.number})` : p.name }))

  const submit = async () => {
    const chosen = parts.find(p => p.id === draft.partId)
    const errs = fieldErrors({
      'dx-fault': !draft.fault && 'Select the fault you found',
      'dx-findings': !draft.findings.trim() && 'Describe what you found',
      'dx-part': draft.partRequired && !chosen && 'Select the replacement part, or clear Replacement part required',
    })
    setErrors(errs)
    if (errs.length) return
    const diagnosis = {
      fault: draft.fault,
      findings: draft.findings.trim(),
      partRequired: draft.partRequired,
      partId: draft.partRequired ? chosen?.id : undefined,
    }
    const ok = await perform({
      mock: d =>
        mockDiagnose(
          d,
          wo.id,
          { ...diagnosis, part: diagnosis.partId ? chosen?.name : undefined, partNumber: diagnosis.partId ? chosen?.number : undefined },
          fullName(session.contact),
        ),
      live: () => {
        if (!session.contact) throw new Error(PERMISSION_MESSAGE)
        return workOrderAction({ action: 'diagnose', workOrderId: wo.id, bookingId: booking.id, ...diagnosis })
      },
      refresh: reload,
    })
    if (!ok) return
    notify(
      diagnosis.partRequired && chosen
        ? `Diagnosis saved for ${wo.number}. A purchase order for ${chosen.name} is raised when you submit the service report.`
        : `Diagnosis saved for ${wo.number}.`,
    )
    onClose()
  }

  return (
    <FormPanel
      open={open}
      title={editing ? 'Edit diagnosis' : 'Record diagnosis'}
      dirty={dirty}
      onClose={onClose}
      submitLabel="Save diagnosis"
      submitIcon={<Stethoscope20Regular />}
      submitPendingLabel="Saving…"
      onSubmit={submit}
    >
      <ValidationSummary errors={errors} />
      <Body1 as="p" className={styles.intro}>
        Record what you found at {workOrderPlace(wo)}. Zava and the customer see the fault and findings on the work order.
      </Body1>
      <FieldList
        items={[
          { label: 'Work order', value: `${wo.number} · ${wo.title}` },
          { label: 'Asset', value: wo.asset?.name },
        ]}
        hideEmpty
      />
      <FormField id="dx-fault" label="Fault" required error={fieldErrorFor(errors, 'Fault', 'dx-fault')} className={styles.field}>
        <Select
          id="dx-fault"
          value={draft.fault}
          placeholder="Select a fault"
          options={[...WORK_ORDER_FAULTS]}
          onChange={e => setDraft({ ...draft, fault: e.target.value })}
        />
      </FormField>
      <FormField
        id="dx-findings"
        label="What you found"
        required
        hint="For example, compressor seized; high discharge temperature and tripped overload."
        error={fieldErrorFor(errors, 'What you found', 'dx-findings')}
        className={styles.field}
      >
        <TextArea id="dx-findings" value={draft.findings} onChange={e => setDraft({ ...draft, findings: e.target.value })} />
      </FormField>
      <div className={styles.field}>
        <Checkbox
          id="dx-part-required"
          label="Replacement part required"
          checked={draft.partRequired}
          onChange={v => setDraft({ ...draft, partRequired: v })}
        />
      </div>
      {draft.partRequired && (
        <FormField
          id="dx-part"
          label="Replacement part"
          required
          hint={
            parts.length
              ? 'Choose the part to order. Submitting the service report raises a purchase order for it.'
              : 'No replacement parts are available to order. Contact Zava dispatch.'
          }
          error={fieldErrorFor(errors, 'Replacement part', 'dx-part')}
          className={styles.field}
        >
          <Select
            id="dx-part"
            value={draft.partId}
            placeholder="Select a part"
            options={partOptions}
            onChange={e => setDraft({ ...draft, partId: e.target.value })}
          />
        </FormField>
      )}
    </FormPanel>
  )
}

function ReportPanel({ open, wo, booking, reload, onClose }: PanelProps) {
  const styles = useStyles()
  const { session, perform, notify, mode } = useApp()
  const { draft, setDraft, errors, setErrors, dirty } = useDraftOnOpen(open, () => ({
    workPerformed: '',
    outcome: '' as ServiceOutcome | '',
    customerSummary: '',
    confirmed: false,
  }))

  const submit = async () => {
    const errs = fieldErrors({
      'rp-diagnosis': !wo.diagnosis && 'Record your diagnosis before submitting the service report',
      'rp-work': !draft.workPerformed.trim() && 'Describe the work you performed',
      'rp-outcome': !draft.outcome && 'Select the outcome of the visit',
      'rp-summary': !draft.customerSummary.trim() && 'Enter a summary for the customer',
      'rp-confirm': !draft.confirmed && 'Confirm the report is accurate',
    })
    setErrors(errs)
    if (errs.length || !draft.outcome) return
    const report = { workPerformed: draft.workPerformed.trim(), outcome: draft.outcome, customerSummary: draft.customerSummary.trim() }
    let purchaseOrder: { number: string; part?: string } | undefined
    const ok = await perform({
      mock: d => mockReport(d, wo.id, booking.id, report, fullName(session.contact)),
      live: async () => {
        if (!session.contact) throw new Error(PERMISSION_MESSAGE)
        purchaseOrder = (await workOrderAction({ action: 'report', workOrderId: wo.id, bookingId: booking.id, ...report })).purchaseOrder
      },
      refresh: reload,
    })
    if (!ok) return
    // Mock changes are applied in a state updater, so derive the mock result instead of reading it back.
    if (mode !== 'live')
      purchaseOrder =
        wo.purchaseOrder ?? (wo.diagnosis?.partRequired && wo.diagnosis.partNumber ? { number: purchaseOrderNumber(wo), part: wo.diagnosis.part } : undefined)
    notify(
      `Service report submitted for ${wo.number}. ${wo.customerName} can now see your summary in Customer Hub.` +
        (purchaseOrder ? ` Purchase order ${purchaseOrder.number} was raised for ${purchaseOrder.part ?? 'the replacement part'}.` : ''),
    )
    onClose()
  }

  return (
    <FormPanel
      open={open}
      title="Submit service report"
      dirty={dirty}
      onClose={onClose}
      submitLabel="Submit service report"
      submitIcon={<DocumentCheckmark20Regular />}
      submitPendingLabel="Submitting…"
      onSubmit={submit}
    >
      <ValidationSummary errors={errors} />
      <Body1 as="p" className={styles.intro}>
        Submitting completes your visit. {wo.customerName} will see the summary in Customer Hub, and you can't edit the report afterwards.
        {wo.diagnosis?.partRequired && wo.diagnosis.partNumber ? ` A purchase order for ${wo.diagnosis.part} is raised with Zava.` : ''}
      </Body1>
      <FieldList
        items={[
          { label: 'Work order', value: `${wo.number} · ${wo.title}` },
          {
            label: 'Diagnosis',
            value: wo.diagnosis
              ? `${wo.diagnosis.fault}${wo.diagnosis.partRequired ? ` – replacement part: ${wo.diagnosis.part ?? 'required'}` : ''}`
              : undefined,
          },
        ]}
      />
      {!wo.diagnosis && <ErrorAnchor id="rp-diagnosis">Record your diagnosis first.</ErrorAnchor>}
      <FormField id="rp-work" label="Work performed" required error={fieldErrorFor(errors, 'Work performed', 'rp-work')} className={styles.field}>
        <TextArea id="rp-work" value={draft.workPerformed} onChange={e => setDraft({ ...draft, workPerformed: e.target.value })} />
      </FormField>
      <FormField id="rp-outcome" label="Outcome" required error={fieldErrorFor(errors, 'Outcome', 'rp-outcome')} className={styles.field}>
        <Select
          id="rp-outcome"
          value={draft.outcome}
          placeholder="Select an outcome"
          options={[...SERVICE_OUTCOMES]}
          onChange={e => setDraft({ ...draft, outcome: e.target.value as ServiceOutcome | '' })}
        />
      </FormField>
      <FormField
        id="rp-summary"
        label="Summary for the customer"
        required
        hint="Plain language. The customer sees this in Customer Hub and the Zava Service Mobile app."
        error={fieldErrorFor(errors, 'Summary for the customer', 'rp-summary')}
        className={styles.field}
      >
        <TextArea id="rp-summary" value={draft.customerSummary} onChange={e => setDraft({ ...draft, customerSummary: e.target.value })} />
      </FormField>
      <FormField id="rp-confirm" label="Confirmation" required error={fieldErrorFor(errors, 'Confirmation', 'rp-confirm')} className={styles.field}>
        <Checkbox
          id="rp-confirm"
          label="I confirm this report is accurate and complete"
          checked={draft.confirmed}
          onChange={v => setDraft({ ...draft, confirmed: v })}
        />
      </FormField>
    </FormPanel>
  )
}

/** Focus target for a validation-summary link when there is no input to fix (e.g. a missing diagnosis). */
function ErrorAnchor({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} tabIndex={-1} className="mt-3">
      <Text weight="semibold">{children}</Text>
    </p>
  )
}
