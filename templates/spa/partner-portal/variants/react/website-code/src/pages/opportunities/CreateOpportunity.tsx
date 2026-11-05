import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { makeStyles, tokens } from '@fluentui/react-components'
import { Add20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { useFormGuard } from '../../components/UnsavedChanges'
import {
  FormField,
  FormSection,
  ReadOnlyField,
  Select,
  TextArea,
  TextInput,
  ValidationSummary,
  fieldErrorFor,
  fieldErrors,
  type FormError,
} from '../../components/forms'
import { Button, ButtonLink, PageHeader, Panel } from '../../components/ui'
import { PURCHASE_TIMEFRAMES, TERRITORIES, type PurchaseTimeframe } from '../../data/types'
import { partnerContacts } from '../../lib/access'
import { CURRENCY, fullName, newId, todayIso } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { PageSkeleton } from '../../components/skeletons'
import { createOpportunity } from '../../services/actions'
import { PERMISSION_MESSAGE } from '../../services/http'
import { loadOpportunityWorkspace } from '../../services/loaders'
import { useLiveLoad } from '../../services/useLiveLoad'
import { OpportunityLoadError } from '../../services/opportunitiesView'
import { OPP_ROUTES } from './oppUtils'
import { CustomerAccountPicker } from '../customers/CustomerAccountPicker'
import { KEEP_NOTICE } from '../../lib/notice'

const useStyles = makeStyles({
  footer: { borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
})

export default function CreateOpportunity() {
  const styles = useStyles()
  const { db, session, mode, perform, notify } = useApp()
  const live = mode === 'live'
  const load = useLiveLoad('opp:create', signal => loadOpportunityWorkspace(null, {}, signal))
  const lookups = load.result?.lookups
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSeller = session.role === 'partner-seller'
  const contacts = live
    ? (lookups?.partnerContacts ?? []).filter(c => c.partnerRole)
    : partnerContacts(db, session).filter(c => c.active && c.partnerRole)
  const territories = live ? (lookups?.territories ?? []).map(t => t.name) : [...TERRITORIES]

  const [form, setForm] = useState({
    topic: '',
    // Prefilled from global search ("Create opportunity for <account>") when the account is in scope.
    customerId: (() => {
      const id = searchParams.get('customer') ?? ''
      return live || db.accounts.some(a => a.id === id && a.managingPartnerId === session.partnerId) ? id : ''
    })(),
    estRevenue: '',
    estCloseDate: '',
    purchaseTimeframe: '' as PurchaseTimeframe | '',
    territory: '',
    description: '',
    customerNeed: '',
    partnerContactId: session.contact?.id ?? '',
  })
  const [errors, setErrors] = useState<FormError[]>([])
  const [saving, setSaving] = useState(false)
  const guard = useFormGuard(form, 'New opportunity')
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))
  const errorFor = (label: string, id: string) => fieldErrorFor(errors, label, id)

  const topicError = errorFor('Topic', 'opp-topic')
  const customerError = errorFor('Potential customer', 'opp-customer')
  const revenueError = errorFor('Estimated revenue', 'opp-revenue')
  const closeError = errorFor('Estimated close date', 'opp-close')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const revenue = form.estRevenue.trim()
    const errs = fieldErrors({
      'opp-topic': !form.topic.trim() && 'Enter a topic',
      'opp-customer': !form.customerId && 'Select a potential customer',
      'opp-revenue': revenue !== '' && (Number.isNaN(Number(revenue)) || Number(revenue) < 0) && `Enter an estimated revenue of 0 or more, ${CURRENCY.inWords}`,
      'opp-close': !form.estCloseDate && 'Enter an estimated close date',
    })
    setErrors(errs)
    if (errs.length) return
    let id = newId('opp')
    const today = todayIso()
    const partnerContactId = isSeller ? session.contact?.id : form.partnerContactId || undefined
    setSaving(true)
    const ok = await perform({
      mock: d => {
        const maxRef = d.opportunities.reduce((m, o) => Math.max(m, Number(o.referenceCode.replace(/\D/g, '')) || 0), 0)
        d.opportunities.push({
          id,
          referenceCode: `OPP-${String(maxRef + 1).padStart(4, '0')}`,
          topic: form.topic.trim(),
          customerId: form.customerId,
          estRevenue: revenue === '' ? 0 : Number(revenue),
          estCloseDate: form.estCloseDate,
          purchaseTimeframe: (form.purchaseTimeframe || 'Unknown') as PurchaseTimeframe,
          territory: form.territory,
          description: form.description.trim() || undefined,
          customerNeed: form.customerNeed.trim() || undefined,
          partnerId: session.partnerId,
          partnerContactId,
          partnerCreated: true,
          collaboration: false,
          collaboratingPartnerIds: [],
          status: 'In Progress',
          customerContactIds: [],
          products: [],
          createdOn: today,
          modifiedOn: today,
        })
      },
      live: async () => {
        if (!session.contact || !session.partnerId) throw new Error(PERMISSION_MESSAGE)
        id = await createOpportunity(
          {
            topic: form.topic,
            customerId: form.customerId,
            estRevenue: revenue === '' ? undefined : Number(revenue),
            estCloseDate: form.estCloseDate,
            purchaseTimeframe: form.purchaseTimeframe || undefined,
            territory: form.territory || undefined,
            description: form.description,
            customerNeed: form.customerNeed,
          },
          { contactId: session.contact.id, partnerId: session.partnerId },
          partnerContactId,
        )
      },
    })
    setSaving(false)
    if (!ok) return
    notify(`Opportunity "${form.topic.trim()}" created. Next, add products and customer contacts.`, 'success')
    guard.markSaved()
    navigate(OPP_ROUTES.details(id), KEEP_NOTICE)
  }

  if (live && load.status === 'error') return <OpportunityLoadError load={load} />
  if (live && load.status === 'loading') return <PageSkeleton variant="form" />

  return (
    <Container>
      <PageHeader
        title="Create opportunity"
        eyebrow="Opportunities"
        breadcrumbs={[
          { label: 'Opportunities', to: OPP_ROUTES.home },
          { label: 'Managed opportunities', to: OPP_ROUTES.managed },
          { label: 'Create opportunity' },
        ]}
        description="Log a deal your team found. It starts as In progress, and you can register it with Zava to protect it."
      />
      <Panel className="max-w-3xl">
        <form noValidate onSubmit={submit}>
          <ValidationSummary errors={errors} />
          <FormSection title="Opportunity">
            <FormField id="opp-topic" label="Topic" required error={topicError} hint="A short name your team will recognise, for example Contoso Cloud migration.">
              <TextInput id="opp-topic" value={form.topic} onChange={set('topic')} aria-invalid={!!topicError} aria-required="true" maxLength={300} />
            </FormField>
            <CustomerAccountPicker id="opp-customer" label="Potential customer" activeOnly
              value={form.customerId} onChange={customerId => setForm(f => ({ ...f, customerId }))} error={customerError} />
            <FormField id="opp-revenue" label="Estimated revenue" optional hint={CURRENCY.hint} error={revenueError}>
              <TextInput
                id="opp-revenue"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.estRevenue}
                onChange={set('estRevenue')}
                aria-invalid={!!revenueError}
              />
            </FormField>
            <FormField id="opp-close" label="Estimated close date" required error={closeError}>
              <TextInput id="opp-close" type="date" value={form.estCloseDate} onChange={set('estCloseDate')} aria-invalid={!!closeError} aria-required="true" />
            </FormField>
            <FormField id="opp-timeframe" label="Purchase timeframe" optional>
              <Select id="opp-timeframe" value={form.purchaseTimeframe} onChange={set('purchaseTimeframe')} placeholder="Select a timeframe" options={[...PURCHASE_TIMEFRAMES]} />
            </FormField>
            <FormField id="opp-territory" label="Territory" optional>
              <Select id="opp-territory" value={form.territory} onChange={set('territory')} placeholder="Select a territory" options={territories} />
            </FormField>
            {isSeller ? (
              <ReadOnlyField label="Partner contact" value={fullName(session.contact)} hint="Opportunities you create are assigned to you." />
            ) : (
              <FormField id="opp-contact" label="Partner contact" optional hint="The person at your organization who owns this deal.">
                <Select
                  id="opp-contact"
                  value={form.partnerContactId}
                  onChange={set('partnerContactId')}
                  placeholder="Unassigned"
                  options={contacts.map(c => ({ value: c.id, label: `${fullName(c)} (${c.partnerRole})` }))}
                />
              </FormField>
            )}
          </FormSection>
          <FormSection title="Details">
            <FormField id="opp-description" label="Description" optional>
              <TextArea id="opp-description" value={form.description} onChange={set('description')} />
            </FormField>
            <FormField id="opp-need" label="Customer need" optional hint="What problem the customer wants to solve.">
              <TextArea id="opp-need" rows={3} value={form.customerNeed} onChange={set('customerNeed')} />
            </FormField>
          </FormSection>
          <div className={`flex flex-wrap gap-2 pt-4 ${styles.footer}`}>
            <Button type="submit" variant="primary" icon={<Add20Regular />} pending={saving} pendingLabel="Creating…">
              Create opportunity
            </Button>
            <ButtonLink to={OPP_ROUTES.managed}>Cancel</ButtonLink>
          </div>
        </form>
      </Panel>
      {guard.dialog}
    </Container>
  )
}
