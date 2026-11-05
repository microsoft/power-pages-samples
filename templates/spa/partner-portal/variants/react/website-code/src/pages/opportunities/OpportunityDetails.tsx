import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Avatar,
  Body1,
  Body1Strong,
  Button as FluentButton,
  Caption1,
  Field,
  Link as FluentLink,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Radio,
  RadioGroup,
  Text,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import {
  Add20Regular,
  ArrowReply20Regular,
  ArrowUndo20Regular,
  Beaker20Regular,
  CalendarAdd20Regular,
  CheckmarkCircle20Filled,
  Circle20Regular,
  Clock20Regular,
  Delete20Regular,
  Dismiss20Regular,
  MoreHorizontal20Regular,
  PersonAdd20Regular,
  Save20Regular,
  Send20Regular,
  ShieldCheckmark20Regular,
  Trophy20Regular,
  Warning20Filled,
} from '@fluentui/react-icons'
import { Comments } from '../../components/Comments'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import { Container } from '../../components/Layout'
import { ConfirmDialog } from '../../components/Modal'
import { FormPanel } from '../../components/FormPanel'
import { useUnsavedChanges } from '../../components/UnsavedChanges'
import {
  FieldList,
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
import { Alert, AppLink, Button, EmptyState, PageHeader, Panel, RoleText, Stat, StatusBadge } from '../../components/ui'
import {
  LOSS_REASONS,
  PURCHASE_TIMEFRAMES,
  RETURN_REASONS,
  TERRITORIES,
  type Contact,
  type Database,
  type DealRegistration,
  type Opportunity,
  type OpportunityProduct,
  type PurchaseTimeframe,
} from '../../data/types'
import { canViewOpportunity, customerAccounts, customerContacts, partnerContacts } from '../../lib/access'
import { addDays, CURRENCY, formatCurrency, formatDate, fullName, newId, todayIso } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { useBusyIndicator, usePendingAction } from '../../hooks/usePendingAction'
import { KEEP_NOTICE } from '../../lib/notice'
import { PageSkeleton } from '../../components/skeletons'
import {
  addProduct,
  assignPartnerContact,
  linkCustomerContact,
  registerDeal,
  removeProduct,
  runOpportunityAction,
  shareOpportunity,
  unlinkCustomerContact,
  unshareOpportunity,
  updateOpportunity,
  type OpportunityFields,
} from '../../services/actions'
import { PERMISSION_MESSAGE, webApi } from '../../services/http'
import { loadOpportunityWorkspace, type WorkspaceLookups } from '../../services/loaders'
import { useLiveLoad } from '../../services/useLiveLoad'
import { OpportunityLoadError } from '../../services/opportunitiesView'
import { NoAccess, Numeric } from './OppParts'
import { ACTIVE_REG_STATUSES, CLOSED_OPP_STATUSES, LIVE_ACTION_MESSAGES, OPEN_OPP_STATUSES, OPP_ROUTES, accountName, contactName, daysUntil, registrationsFor } from './oppUtils'

/** Pending-action key for a panel's "Add" form; row actions use the record id. */
const ADD_KEY = 'add'

const PRODUCT_CATALOG = [
  { name: 'Cloud Migration Services', unit: 'Hour', price: 150 },
  { name: 'Managed Security Services', unit: 'Month', price: 4500 },
  { name: 'Dynamics 365 Sales Enterprise', unit: 'License', price: 131.6 },
  { name: 'Power BI Pro', unit: 'License', price: 13.7 },
  { name: 'Implementation Services', unit: 'Day', price: 1400 },
  { name: 'Zava Premier Support', unit: 'Each', price: 12000 },
]
const UNITS = ['Each', 'Hour', 'Day', 'Month', 'License']

const productsTotal = (o: Opportunity) => o.products.reduce((t, p) => t + p.quantity * p.pricePerUnit, 0)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
/** "120 hours", "3 licenses", "1" (for "Each"). */
const quantityLabel = (quantity: number, unit: string) => (!unit || unit === 'Each' ? String(quantity) : plural(quantity, unit.toLowerCase()))
const daysLeftLabel = (days: number) => (days === 0 ? 'today' : days < 0 ? `${plural(-days, 'day')} ago` : `${plural(days, 'day')} left`)
/** Display label for stored Title Case reason values (sentence case). */
const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** Draft mutation for this opportunity (mock store) that stamps modifiedOn. */
const draftUpdate = (id: string, fn: (o: Opportunity) => void) => (d: Database) => {
  const x = d.opportunities.find(y => y.id === id)
  if (!x) return
  fn(x)
  x.modifiedOn = todayIso()
}

/** Runs an opportunity write: mock → `fn` on the stored record; live → `live()` then reloads the workspace. */
type OpportunityWrite = (fn: (o: Opportunity) => void, live: () => Promise<unknown>) => Promise<boolean>

const useStyles = makeStyles({
  muted: { color: tokens.colorNeutralForeground2 },
  strong: { color: tokens.colorNeutralForeground1 },
  dividerBottom: { borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
  totalBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalXXL,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderEndStartRadius: tokens.borderRadiusMedium,
    borderEndEndRadius: tokens.borderRadiusMedium,
  },
  amount: { fontVariantNumeric: 'tabular-nums', color: tokens.colorNeutralForeground1 },
  regItem: {
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL),
    ':not(:first-child)': { borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
  },
  regTitle: { margin: 0, color: tokens.colorNeutralForeground1 },
  regList: { margin: `${tokens.spacingVerticalM} 0 0`, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: tokens.spacingHorizontalL, rowGap: tokens.spacingVerticalXS },
  regTerm: { color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300 },
  regValue: { margin: 0, color: tokens.colorNeutralForeground1, fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300 },
  regNote: { display: 'block', margin: `${tokens.spacingVerticalS} 0 0`, fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300, color: tokens.colorNeutralForeground2 },
  simulation: {
    marginTop: tokens.spacingVerticalM,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    border: `${tokens.strokeWidthThin} dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  simulationLabel: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  simulationButton: { marginTop: tokens.spacingVerticalXS, marginInlineStart: `calc(-1 * ${tokens.spacingHorizontalS})` },
  removeButton: {
    color: tokens.colorNeutralForeground2,
    ':hover': { color: tokens.colorPaletteRedForeground1 },
    ':hover:active': { color: tokens.colorPaletteRedForeground1 },
  },
  contactName: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  contactLine: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  partnerList: {
    marginTop: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  steps: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalL },
  step: { display: 'flex', columnGap: tokens.spacingHorizontalM, alignItems: 'flex-start' },
  stepIcon: { flexShrink: 0, lineHeight: 0, paddingTop: '1px', fontSize: '20px' },
  stepDone: { color: tokens.colorStatusSuccessForeground1 },
  stepTodo: { color: tokens.colorNeutralForeground3 },
  stepPending: { color: tokens.colorNeutralForeground2 },
  stepWarning: { color: tokens.colorStatusWarningForeground1 },
  stepBody: { minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', rowGap: tokens.spacingVerticalXXS },
  stepTitle: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1, fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300 },
  stepHint: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300 },
  stepAction: { marginTop: tokens.spacingVerticalXS },
  saveBar: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    boxShadow: tokens.shadow16,
  },
  saveBarInner: {
    maxWidth: '1440px',
    margin: '0 auto',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXXL),
  },
  saveBarSpacer: { height: '80px' },
  sectionStatus: { display: 'flex', ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL) },
  savedText: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  savedIcon: { flexShrink: 0, color: tokens.colorStatusSuccessForeground1 },
  intro: { display: 'block', margin: `0 0 ${tokens.spacingVerticalL}`, color: tokens.colorNeutralForeground2 },
  dialogField: { marginTop: tokens.spacingVerticalL },
  extAmountLabel: { display: 'block', color: tokens.colorNeutralForeground1, fontWeight: tokens.fontWeightSemibold },
  alertAction: { marginTop: tokens.spacingVerticalS },
})

export default function OpportunityDetails({ shared }: { shared: boolean }) {
  const { db, session, mode } = useApp()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const load = useLiveLoad(id ? `opp:details:${id}` : null, signal => loadOpportunityWorkspace(id, { lookups: true }, signal))
  const live = mode === 'live'
  const opp = live && load.result?.found === false ? undefined : db.opportunities.find(o => o.id === id)

  if (live && id) {
    if (load.status === 'error') return <OpportunityLoadError load={load} />
    if (load.status === 'loading') return <PageSkeleton variant="detail" />
  }

  if (!opp || !canViewOpportunity(db, session, opp)) {
    const otherSeller = !!opp && session.role === 'partner-seller' && !!session.partnerId && opp.partnerId === session.partnerId
    return (
      <Container>
        <PageHeader
          title={shared ? 'Opportunity details (shared)' : 'Opportunity details'}
          breadcrumbs={[
            { label: 'Opportunities', to: OPP_ROUTES.home },
            { label: 'Managed opportunities', to: OPP_ROUTES.managed },
            { label: 'Opportunity details' },
          ]}
        />
        <NoAccess
          backTo={OPP_ROUTES.managed}
          backLabel="Back to managed opportunities"
          message={
            otherSeller
              ? 'This opportunity is assigned to another seller. Ask your partner admin if you need access.'
              : "This opportunity doesn't exist or isn't shared with your organization. Ask your partner admin if you need access."
          }
        />
      </Container>
    )
  }
  if (opp.collaboration && !shared) return <Navigate replace to={OPP_ROUTES.shared(opp.id)} />
  return <DetailsBody key={`${opp.id}-${shared}`} opp={opp} shared={shared} lookups={load.result?.lookups} reload={load.reload} />
}

type StepState = 'done' | 'todo' | 'pending' | 'warning'
interface Step {
  key: string
  state: StepState
  title: string
  hint?: string
  action?: ReactNode
}

function DetailsBody({
  opp,
  shared,
  lookups,
  reload,
}: {
  opp: Opportunity
  shared: boolean
  lookups?: WorkspaceLookups
  reload: () => Promise<void>
}) {
  const { db, session, mode, mutate, perform, notify } = useApp()
  const live = mode === 'live'
  const styles = useStyles()
  const navigate = useNavigate()
  const write: OpportunityWrite = (fn, liveOp) =>
    perform({
      mock: draftUpdate(opp.id, fn),
      live: async () => {
        await liveOp()
      },
      refresh: reload,
    })
  const runAction = (action: 'return' | 'win' | 'lose' | 'reopen', refresh?: () => Promise<void>) =>
    perform({ mock: () => {}, live: () => runOpportunityAction(action, opp.id), refresh })
  const isSeller = session.role === 'partner-seller'
  const closed = CLOSED_OPP_STATUSES.has(opp.status)
  const actionsAllowed = !shared && !opp.collaboration
  const readOnly = shared || opp.collaboration || closed

  const regs = registrationsFor(db, opp.id)
  const activeReg = regs.find(r => ACTIVE_REG_STATUSES.has(r.status))
  const latestReg = regs[0]
  const currentReg = regs.find(r => r.status !== 'Closed')
  const isOpen = OPEN_OPP_STATUSES.has(opp.status)
  const canClose = actionsAllowed && isOpen
  const canReopen = actionsAllowed && (opp.status === 'Won' || opp.status === 'Lost')
  // Matches opportunity-action: only an Accepted distributed opportunity can be returned.
  const canReturn = actionsAllowed && opp.status === 'Accepted' && !!opp.partnerId && !opp.partnerCreated
  const canRegister = actionsAllowed && opp.partnerCreated && isOpen && !activeReg
  const canExtend = actionsAllowed && !closed && !!latestReg && (latestReg.status === 'Expiring' || latestReg.status === 'Expired')
  const nextStep: 'extend' | 'register' | null = canExtend ? 'extend' : canRegister ? 'register' : null
  const expiringReg = !closed && latestReg && (latestReg.status === 'Expiring' || latestReg.status === 'Expired') ? latestReg : undefined

  const [confirm, setConfirm] = useState<'reopen' | null>(null)
  const [closeMode, setCloseMode] = useState<'won' | 'lost' | null>(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [regModal, setRegModal] = useState<'register' | 'extend' | null>(null)
  const [addProductOpen, setAddProductOpen] = useState(false)

  // Unsaved changes in the opportunity information form.
  const [dirty, setDirty] = useState(false)
  // The fixed save bar also stays up briefly in its "saved" state, so the page reserves room for it.
  const [saveBarShown, setSaveBarShown] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const guard = useUnsavedChanges(dirty && !readOnly, `Opportunity information: ${opp.topic}`)
  const [lifecycleWarning, setLifecycleWarning] = useState(false)
  const withSavedDetails = (action: () => void) => {
    if (dirty) {
      setLifecycleWarning(true)
      return
    }
    setLifecycleWarning(false)
    action()
  }
  const discard = () => {
    setFormKey(k => k + 1)
    setDirty(false)
  }

  const closeAs = (status: 'Won' | 'Lost', outcome: { actualRevenue?: number; actualCloseDate?: string; lossReason?: string }) => {
    mutate(d => {
      const x = d.opportunities.find(y => y.id === opp.id)
      if (!x) return
      x.status = status
      x.actualRevenue = outcome.actualRevenue
      x.actualCloseDate = outcome.actualCloseDate
      x.lossReason = outcome.lossReason
      x.modifiedOn = todayIso()
      d.dealRegistrations.forEach(r => {
        if (r.opportunityId === opp.id && ACTIVE_REG_STATUSES.has(r.status)) r.status = 'Closed'
      })
    })
    discard()
    notify(status === 'Won' ? 'The opportunity has been closed as won.' : 'The opportunity has been closed as lost.')
  }

  const closeLive = async (status: 'Won' | 'Lost') => {
    const action = status === 'Won' ? 'win' : 'lose'
    if (!(await runAction(action, reload))) return
    discard()
    notify(LIVE_ACTION_MESSAGES[action])
  }

  const reopen = async () => {
    if (live) {
      if (await runAction('reopen', reload)) notify(LIVE_ACTION_MESSAGES.reopen)
      return
    }
    mutate(
      draftUpdate(opp.id, o => {
        o.status = o.partnerCreated ? 'In Progress' : 'Accepted'
        o.actualRevenue = undefined
        o.actualCloseDate = undefined
        o.lossReason = undefined
      }),
    )
    notify('The opportunity has been reopened.')
  }

  const returnToContoso = async (reason: string) => {
    if (live) {
      if (!(await runAction('return'))) return
      notify(LIVE_ACTION_MESSAGES.return)
    } else {
      mutate(
        draftUpdate(opp.id, o => {
          o.status = 'Returned'
          o.reasonForReturn = reason
          o.partnerId = undefined
          o.partnerContactId = undefined
        }),
      )
      notify('The opportunity has been returned to Zava.')
    }
    guard.allowNavigation()
    navigate(OPP_ROUTES.managed, KEEP_NOTICE)
  }

  const focusAddContact = () => {
    const el = document.getElementById('cc-add')
    el?.scrollIntoView({ block: 'center' })
    el?.focus({ preventScroll: true })
  }

  const owner = accountName(db, opp.partnerId)
  const pageLabel = shared ? 'Opportunity details (shared)' : 'Opportunity details'
  const crumbs = [
    { label: 'Opportunities', to: OPP_ROUTES.home },
    { label: 'Managed opportunities', to: OPP_ROUTES.managed },
    { label: pageLabel },
  ]

  // KPI strip: non-duplicated summary (O-14).
  const total = productsTotal(opp)
  const revenueHint =
    opp.products.length === 0
      ? readOnly
        ? 'No products listed'
        : 'No products added yet'
      : Math.round(total) === Math.round(opp.estRevenue)
        ? 'Matches the products total'
        : `Products total ${formatCurrency(total)}`
  const shownReg = currentReg ?? (closed ? latestReg : undefined)
  const regValue = shownReg ? shownReg.status : opp.partnerCreated ? 'Not registered' : 'Not required'
  const regHint = !shownReg
    ? opp.partnerCreated
      ? isOpen
        ? 'Register to protect this deal'
        : undefined
      : 'Distributed by Zava'
    : shownReg.status === 'Closed'
      ? `Was valid until ${formatDate(shownReg.expirationDate)}`
      : shownReg.status === 'Expired'
        ? `Expired ${formatDate(shownReg.expirationDate)}`
        : shownReg.expirationDate && shownReg.status !== 'Declined'
          ? `Expires ${formatDate(shownReg.expirationDate)}`
          : `Submitted ${formatDate(shownReg.submissionDate)}`
  const closeDays = daysUntil(opp.estCloseDate)

  const steps: Step[] = []
  if (actionsAllowed && isOpen) {
    steps.push({
      key: 'start',
      state: 'done',
      title: opp.acceptedDate ? 'Opportunity accepted' : 'Opportunity created',
      hint: formatDate(opp.acceptedDate ?? opp.createdOn),
    })
    steps.push({
      key: 'products',
      state: opp.products.length ? 'done' : 'todo',
      title: 'Add products',
      hint: opp.products.length ? `${plural(opp.products.length, 'product')} · ${formatCurrency(total)}` : 'List the products and services in this deal.',
      action: !opp.products.length && (
        <Button size="sm" icon={<Add20Regular />} onClick={() => setAddProductOpen(true)}>
          Add product
        </Button>
      ),
    })
    steps.push({
      key: 'contacts',
      state: opp.customerContactIds.length ? 'done' : 'todo',
      title: 'Add customer contacts',
      hint: opp.customerContactIds.length ? plural(opp.customerContactIds.length, 'contact') : "Link the people you're working with at the customer.",
      action: !opp.customerContactIds.length && (
        <Button size="sm" icon={<PersonAdd20Regular />} onClick={focusAddContact}>
          Add contact
        </Button>
      ),
    })
    if (opp.partnerCreated) {
      const r = currentReg
      const step: Step =
        !r || r.status === 'Declined'
          ? {
              key: 'register',
              state: 'todo',
              title: 'Register deal',
              hint: r ? 'Your last registration was declined. Register again with more detail.' : 'Register this deal to protect it with Zava.',
              action: canRegister && (
                <Button size="sm" icon={<ShieldCheckmark20Regular />} onClick={() => withSavedDetails(() => setRegModal('register'))}>
                  Register deal
                </Button>
              ),
            }
          : r.status === 'New' || r.status === 'Under Review'
            ? { key: 'register', state: 'pending', title: 'Register deal', hint: `Submitted ${formatDate(r.submissionDate)} · waiting for Zava review` }
            : r.status === 'Approved'
              ? { key: 'register', state: 'done', title: 'Deal registered', hint: `Protected until ${formatDate(r.expirationDate)}` }
              : {
                  key: 'register',
                  state: 'warning',
                  title: 'Extend registration',
                  hint: `${r.status === 'Expired' ? 'Expired' : 'Expires'} ${formatDate(r.expirationDate)}. Extend it to keep deal protection.`,
                }
      steps.push(step)
    }
    steps.push({ key: 'close', state: 'todo', title: 'Close the opportunity', hint: 'When the customer decides, use Close opportunity to record the outcome.' })
  }

  const primaryVariant = dirty ? 'secondary' : 'primary'
  const expDays = expiringReg ? daysUntil(expiringReg.expirationDate) : undefined
  const closingValues = [
    opp.actualRevenue !== undefined && 'actual revenue',
    opp.actualCloseDate && 'actual close date',
    opp.lossReason && 'loss reason',
  ].filter(Boolean)

  return (
    <Container>
      <PageHeader
        title={opp.topic}
        breadcrumbs={crumbs}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={opp.status} />
            <Text font="monospace" size={200} className={styles.strong}>
              {opp.referenceCode}
            </Text>
            <span aria-hidden="true">·</span>
            <span>{accountName(db, opp.customerId)}</span>
            {opp.collaboration && <StatusBadge status="Collaborative" tone="indigo" />}
            {opp.partnerCreated && <StatusBadge status="Partner created" tone="slate" />}
          </span>
        }
        actions={
          actionsAllowed && (
            <>
              {nextStep === 'register' && (
                <Button variant={primaryVariant} icon={<ShieldCheckmark20Regular />} onClick={() => withSavedDetails(() => setRegModal('register'))}>
                  Register deal
                </Button>
              )}
              {nextStep === 'extend' && (
                <Button variant={primaryVariant} icon={<CalendarAdd20Regular />} onClick={() => withSavedDetails(() => setRegModal('extend'))}>
                  Extend registration
                </Button>
              )}
              {canClose && (
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <MenuButton appearance="secondary">Close opportunity</MenuButton>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem icon={<Trophy20Regular />} onClick={() => withSavedDetails(() => setCloseMode('won'))}>
                        Close as won
                      </MenuItem>
                      <MenuItem icon={<Dismiss20Regular />} onClick={() => withSavedDetails(() => setCloseMode('lost'))}>
                        Close as lost
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              )}
              {canReopen && (
                <Button icon={<ArrowUndo20Regular />} onClick={() => setConfirm('reopen')}>
                  Reopen opportunity
                </Button>
              )}
              {canReturn && (
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <FluentButton appearance="subtle" icon={<MoreHorizontal20Regular />} aria-label="More actions" />
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem icon={<ArrowReply20Regular />} onClick={() => withSavedDetails(() => setReturnOpen(true))}>
                        Return to Zava
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              )}
            </>
          )
        }
      />

      <div className="space-y-3 mb-6 empty:hidden">
        {dirty && lifecycleWarning && (
          <div role="alert">
            <Alert tone="warning" title="Save your changes first">
              Save or discard the opportunity information using the action bar below, then continue with registration or closing/returning this deal.
            </Alert>
          </div>
        )}
        {expiringReg && (
          <Alert
            tone="warning"
            title={
              expiringReg.status === 'Expired'
                ? `Deal registration expired on ${formatDate(expiringReg.expirationDate)}`
                : `Deal registration expires on ${formatDate(expiringReg.expirationDate)}${expDays !== undefined ? ` (${daysLeftLabel(expDays)})` : ''}`
            }
          >
            {expiringReg.status === 'Expired'
              ? 'This deal is no longer protected. Submit a renewal request to restore deal protection.'
              : 'Extend it before it expires to keep deal protection with Zava.'}
            {canExtend && (
              <div className={styles.alertAction}>
                <Button size="sm" icon={<CalendarAdd20Regular />} onClick={() => withSavedDetails(() => setRegModal('extend'))}>
                  Extend registration
                </Button>
              </div>
            )}
          </Alert>
        )}
        {opp.collaboration && (
          <Alert tone="info" title="Collaborative opportunity">
            Shared between {owner}
            {opp.collaboratingPartnerIds.length ? ` and ${opp.collaboratingPartnerIds.map(p => accountName(db, p)).join(', ')}` : ''}. Opportunity details are read-only; you can still add notes.
          </Alert>
        )}
        {shared && !opp.collaboration && (
          <Alert tone="info">
            This opportunity is not collaborative.{' '}
            <AppLink to={OPP_ROUTES.details(opp.id)} inline>
              Open the editable opportunity details
            </AppLink>
            .
          </Alert>
        )}
        {closed && actionsAllowed && (
          <Alert tone="info">
            This opportunity is closed as {opp.status.toLowerCase()}. {canReopen ? 'Reopen it to make changes.' : ''}
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 mb-6">
        {opp.status === 'Won' && opp.actualRevenue !== undefined ? (
          <Stat label="Actual revenue" value={formatCurrency(opp.actualRevenue)} hint={`Estimated ${formatCurrency(opp.estRevenue)}`} />
        ) : (
          <Stat label="Estimated revenue" value={formatCurrency(opp.estRevenue)} hint={revenueHint} />
        )}
        <Stat label="Registration" value={regValue} hint={regHint} />
        {closed ? (
          <Stat label="Closed on" value={formatDate(opp.actualCloseDate ?? opp.modifiedOn)} hint={opp.lossReason ? `Reason: ${opp.lossReason}` : undefined} />
        ) : (
          <Stat
            label="Days to close"
            value={closeDays === undefined ? '—' : closeDays < 0 ? `${-closeDays} overdue` : closeDays === 0 ? 'Today' : String(closeDays)}
            hint={`Estimated close ${formatDate(opp.estCloseDate)}`}
          />
        )}
      </div>

      {!readOnly && (
        <div className="mb-4">
          <Button onClick={() => {
            const field = document.getElementById('od-topic')
            field?.scrollIntoView({ block: 'center' })
            field?.focus({ preventScroll: true })
          }}>Edit opportunity information</Button>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-[auto_1fr]">
        {/* Sidebar comes first in the DOM so status and next steps lead on small screens; on xl it sits in the right column. */}
        <div className="min-w-0 xl:col-start-2 xl:row-start-1">
          {steps.length > 0 && <NextStepsPanel steps={steps} />}
        </div>
        <div className="space-y-6 min-w-0 xl:col-start-1 xl:row-start-1 xl:row-span-2">
          {readOnly ? (
            <DetailsView opp={opp} />
          ) : (
            <DetailsForm
              key={formKey}
              opp={opp}
              isSeller={isSeller}
              lookups={lookups}
              onSave={write}
              onDirtyChange={setDirty}
              onSaveBarChange={setSaveBarShown}
              onDiscard={discard}
            />
          )}
          <ProductsPanel opp={opp} readOnly={readOnly} onChange={write} addOpen={addProductOpen} setAddOpen={setAddProductOpen} />
          <CustomerContactsPanel opp={opp} readOnly={readOnly} lookups={lookups} onChange={write} />
          <Comments regardingType="opportunity" regardingId={opp.id} canAdd onChange={reload} />
        </div>
        <div className="space-y-6 min-w-0 self-start xl:col-start-2 xl:row-start-2">
          <RegistrationPanel
            regs={regs}
            allowSimulation={actionsAllowed && !live}
            emptyKind={opp.partnerCreated ? (canRegister ? 'register' : 'none') : 'distributed'}
            onRegister={() => withSavedDetails(() => setRegModal('register'))}
          />
          <PartnerContactPanel opp={opp} />
          {live && !readOnly && <SharedContactsPanel opp={opp} lookups={lookups} onChange={write} />}
        </div>
      </div>

      {live ? (
        <ConfirmDialog
          open={closeMode !== null}
          title={closeMode === 'won' ? 'Close opportunity as won' : 'Close opportunity as lost'}
          message={
            <>
              <strong>{opp.topic}</strong> will be closed as {closeMode === 'won' ? 'won' : 'lost'}. Any active deal registration will be closed. You can reopen
              the opportunity later if needed.
            </>
          }
          confirmLabel={closeMode === 'won' ? 'Close as won' : 'Close as lost'}
          tone={closeMode === 'won' ? 'primary' : 'danger'}
          pendingLabel="Closing…"
          onConfirm={() => (closeMode ? closeLive(closeMode === 'won' ? 'Won' : 'Lost') : undefined)}
          onClose={() => setCloseMode(null)}
        />
      ) : (
        <CloseModal mode={closeMode} opp={opp} onClose={() => setCloseMode(null)} onConfirm={closeAs} />
      )}
      <ConfirmDialog
        open={confirm === 'reopen'}
        title="Reopen opportunity"
        message={
          <>
            <p><strong>{opp.topic}</strong> will return to {opp.partnerCreated ? 'In Progress' : 'Accepted'}.</p>
            <p className="mt-2">
              {closingValues.length ? `This clears its recorded ${closingValues.join(', ')}.` : 'No recorded closing values need to be cleared.'}
            </p>
            {regs.some(r => r.status === 'Closed') && <p className="mt-2">Closed deal registrations will stay closed.</p>}
          </>
        }
        confirmLabel="Reopen opportunity"
        cancelLabel="Keep closed"
        pendingLabel="Reopening…"
        onConfirm={reopen}
        onClose={() => setConfirm(null)}
      />
      {live ? (
        <ConfirmDialog
          open={returnOpen}
          title="Return opportunity to Zava"
          message={
            <>
              <strong>{opp.topic}</strong> will be returned to Zava. Your organization will no longer have access to this opportunity. This can't be undone.
            </>
          }
          confirmLabel="Return to Zava"
          tone="danger"
          pendingLabel="Returning…"
          onConfirm={() => returnToContoso('')}
          onClose={() => setReturnOpen(false)}
        />
      ) : (
        <ReturnModal open={returnOpen} onClose={() => setReturnOpen(false)} onConfirm={returnToContoso} />
      )}
      <RegistrationModal mode={regModal} opp={opp} previous={latestReg} reload={reload} onClose={() => setRegModal(null)} />
      {guard.dialog}
      {saveBarShown && !readOnly && <div className={styles.saveBarSpacer} aria-hidden="true" />}
    </Container>
  )
}

function NextStepsPanel({ steps }: { steps: Step[] }) {
  const styles = useStyles()
  const icon = (s: StepState) =>
    s === 'done' ? (
      <CheckmarkCircle20Filled className={styles.stepDone} />
    ) : s === 'pending' ? (
      <Clock20Regular className={styles.stepPending} />
    ) : s === 'warning' ? (
      <Warning20Filled className={styles.stepWarning} />
    ) : (
      <Circle20Regular className={styles.stepTodo} />
    )
  const srState: Record<StepState, string> = { done: 'Done: ', todo: 'To do: ', pending: 'In progress: ', warning: 'Needs attention: ' }
  return (
    <Panel title="Next steps">
      <ol className={styles.steps}>
        {steps.map(s => (
          <li key={s.key} className={styles.step}>
            <span className={styles.stepIcon} aria-hidden="true">
              {icon(s.state)}
            </span>
            <div className={styles.stepBody}>
              <Text as="p" className={styles.stepTitle}>
                <span className="sr-only">{srState[s.state]}</span>
                {s.title}
              </Text>
              {s.hint && (
                <Text as="p" className={styles.stepHint}>
                  {s.hint}
                </Text>
              )}
              {s.action && <div className={styles.stepAction}>{s.action}</div>}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/** Read-only view for shared, collaborative and closed opportunities (no disabled inputs). */
function DetailsView({ opp }: { opp: Opportunity }) {
  const { db } = useApp()
  return (
    <Panel title="Opportunity information">
      <FieldList
        items={[
          { label: 'Topic', value: opp.topic },
          { label: 'Potential customer', value: accountName(db, opp.customerId) },
          { label: 'Estimated revenue', value: formatCurrency(opp.estRevenue) },
          { label: 'Estimated close date', value: formatDate(opp.estCloseDate) },
          { label: 'Purchase timeframe', value: opp.purchaseTimeframe },
          { label: 'Territory', value: opp.territory },
          { label: 'Partner contact', value: opp.partnerContactId ? contactName(db, opp.partnerContactId) : 'Unassigned' },
          { label: 'Description', value: opp.description },
          { label: 'Customer need', value: opp.customerNeed },
          ...(opp.actualRevenue !== undefined ? [{ label: 'Actual revenue', value: formatCurrency(opp.actualRevenue) }] : []),
          ...(opp.actualCloseDate ? [{ label: 'Actual close date', value: formatDate(opp.actualCloseDate) }] : []),
          ...(opp.lossReason ? [{ label: 'Loss reason', value: opp.lossReason }] : []),
          ...(opp.reasonForReturn ? [{ label: 'Reason for return', value: opp.reasonForReturn }] : []),
        ]}
      />
    </Panel>
  )
}

type DetailsDraft = {
  topic: string
  customerId: string
  estRevenue: string
  estCloseDate: string
  purchaseTimeframe: string
  territory: string
  description: string
  customerNeed: string
  partnerContactId: string
}

const draftFrom = (o: Opportunity): DetailsDraft => ({
  topic: o.topic,
  customerId: o.customerId,
  estRevenue: String(o.estRevenue ?? ''),
  estCloseDate: o.estCloseDate,
  purchaseTimeframe: o.purchaseTimeframe as string,
  territory: o.territory ?? '',
  description: o.description ?? '',
  customerNeed: o.customerNeed ?? '',
  partnerContactId: o.partnerContactId ?? '',
})
/** Normalised snapshot used to detect unsaved changes (trimmed text, numeric revenue). */
const draftKey = (d: DetailsDraft) =>
  JSON.stringify({ ...d, topic: d.topic.trim(), description: d.description.trim(), customerNeed: d.customerNeed.trim(), estRevenue: d.estRevenue === '' ? 0 : Number(d.estRevenue) })

function DetailsForm({
  opp,
  isSeller,
  lookups,
  onSave,
  onDirtyChange,
  onSaveBarChange,
  onDiscard,
}: {
  opp: Opportunity
  isSeller: boolean
  lookups?: WorkspaceLookups
  onSave: OpportunityWrite
  onDirtyChange: (dirty: boolean) => void
  onSaveBarChange: (shown: boolean) => void
  onDiscard: () => void
}) {
  const { db, session, mode } = useApp()
  const live = mode === 'live'
  // A-10: in live mode sellers can assign the partner contact too (the server re-checks the scope).
  const canAssign = live || !isSeller
  const styles = useStyles()
  const [form, setForm] = useState<DetailsDraft>(() => draftFrom(opp))
  const [errors, setErrors] = useState<FormError[]>([])
  const [saving, setSaving] = useState(false)
  const savingShown = useBusyIndicator(saving)
  const set = (k: keyof DetailsDraft) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))
  const dirty = draftKey(form) !== draftKey(draftFrom(opp))
  // After a save the bar confirms it in place until the next edit (or Dismiss).
  const saved = useInlineFeedback(form)
  const showSaved = !dirty && saved.feedback !== null
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  useEffect(() => onSaveBarChange(dirty || showSaved), [dirty, showSaved, onSaveBarChange])

  const customers = (live ? (lookups?.customerAccounts ?? []) : customerAccounts(db, session)).map(a => ({ value: a.id, label: a.name }))
  if (!customers.some(c => c.value === opp.customerId)) customers.unshift({ value: opp.customerId, label: accountName(db, opp.customerId) })
  const contacts = (live ? (lookups?.partnerContacts ?? []) : partnerContacts(db, session))
    .filter(c => c.active && c.partnerRole)
    .map(c => ({ value: c.id, label: `${fullName(c)} (${c.partnerRole})` }))
  if (opp.partnerContactId && !contacts.some(c => c.value === opp.partnerContactId)) contacts.unshift({ value: opp.partnerContactId, label: contactName(db, opp.partnerContactId) })
  const territories = live ? (lookups?.territories ?? []).map(t => t.name) : [...TERRITORIES]
  if (live && opp.territory && !territories.includes(opp.territory)) territories.unshift(opp.territory)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const revenueInvalid = form.estRevenue !== '' && (Number.isNaN(Number(form.estRevenue)) || Number(form.estRevenue) < 0)
    const errs = fieldErrors({
      'od-topic': !form.topic.trim() && 'Enter a topic',
      'od-customer': !form.customerId && 'Select a potential customer',
      'od-revenue': revenueInvalid && `Enter an estimated revenue of 0 or more, ${CURRENCY.inWords}`,
      'od-close': !form.estCloseDate && 'Enter an estimated close date',
    })
    setErrors(errs)
    if (errs.length) return
    const before = draftFrom(opp)
    const changed = (k: keyof DetailsDraft) => form[k] !== before[k]
    const fields: OpportunityFields = {}
    if (form.topic.trim() !== before.topic) fields.topic = form.topic
    if (changed('customerId')) fields.customerId = form.customerId
    if ((form.estRevenue === '' ? 0 : Number(form.estRevenue)) !== Number(before.estRevenue || 0)) fields.estRevenue = form.estRevenue === '' ? 0 : Number(form.estRevenue)
    if (changed('estCloseDate')) fields.estCloseDate = form.estCloseDate
    if (changed('purchaseTimeframe')) fields.purchaseTimeframe = form.purchaseTimeframe as PurchaseTimeframe
    if (changed('territory') && form.territory) fields.territory = form.territory
    if (form.description.trim() !== before.description.trim()) fields.description = form.description
    if (form.customerNeed.trim() !== before.customerNeed.trim()) fields.customerNeed = form.customerNeed
    const assign = canAssign && changed('partnerContactId')
    setSaving(true)
    const ok = await onSave(
      o => {
        o.topic = form.topic.trim()
        o.customerId = form.customerId
        o.estRevenue = form.estRevenue === '' ? 0 : Number(form.estRevenue)
        o.estCloseDate = form.estCloseDate
        o.purchaseTimeframe = form.purchaseTimeframe as PurchaseTimeframe
        o.territory = form.territory
        o.description = form.description.trim() || undefined
        o.customerNeed = form.customerNeed.trim() || undefined
        if (!isSeller) o.partnerContactId = form.partnerContactId || undefined
      },
      async () => {
        if (Object.keys(fields).length) await updateOpportunity(opp.id, fields)
        if (changed('territory') && !form.territory) await webApi.clearLookup('opportunities', opp.id, 'adx_TerritoryId')
        if (assign) await assignPartnerContact(opp.id, form.partnerContactId || undefined)
      },
    )
    setSaving(false)
    if (ok) saved.show('Your changes have been saved.')
  }

  const err = (label: string, id: string) => fieldErrorFor(errors, label, id)

  return (
    <Panel title="Opportunity information">
      <form ref={formRef} tabIndex={-1} className="outline-none" noValidate onSubmit={submit} aria-label="Opportunity information">
        <ValidationSummary errors={errors} />
        <FormSection title="Opportunity">
          <FormField id="od-topic" label="Topic" required error={err('Topic', 'od-topic')}>
            <TextInput id="od-topic" value={form.topic} onChange={set('topic')} maxLength={300} />
          </FormField>
          <FormField id="od-customer" label="Potential customer" required error={err('Potential customer', 'od-customer')}>
            <Select id="od-customer" value={form.customerId} onChange={set('customerId')} placeholder="Select a customer" options={customers} />
          </FormField>
          <FormField id="od-revenue" label="Estimated revenue" optional hint={CURRENCY.hint} error={err('Estimated revenue', 'od-revenue')}>
            <TextInput id="od-revenue" type="number" min={0} step="0.01" value={form.estRevenue} onChange={set('estRevenue')} />
          </FormField>
          <FormField id="od-close" label="Estimated close date" required error={err('Estimated close date', 'od-close')}>
            <TextInput id="od-close" type="date" value={form.estCloseDate} onChange={set('estCloseDate')} />
          </FormField>
          <FormField id="od-timeframe" label="Purchase timeframe">
            <Select id="od-timeframe" value={form.purchaseTimeframe} onChange={set('purchaseTimeframe')} options={[...PURCHASE_TIMEFRAMES]} />
          </FormField>
          <FormField id="od-territory" label="Territory" optional>
            <Select id="od-territory" value={form.territory} onChange={set('territory')} placeholder="Select a territory" options={territories} />
          </FormField>
          {!canAssign ? (
            <ReadOnlyField
              label="Partner contact"
              value={opp.partnerContactId ? contactName(db, opp.partnerContactId) : 'Unassigned'}
              hint="Only partner admins and partner managers can reassign opportunities."
            />
          ) : (
            <FormField id="od-contact" label="Partner contact" optional>
              <Select id="od-contact" value={form.partnerContactId} onChange={set('partnerContactId')} placeholder="Unassigned" options={contacts} />
            </FormField>
          )}
        </FormSection>
        <FormSection title="Details">
          <FormField id="od-description" label="Description" optional>
            <TextArea id="od-description" value={form.description} onChange={set('description')} />
          </FormField>
          <FormField id="od-need" label="Customer need" optional hint="What problem is the customer trying to solve?">
            <TextArea id="od-need" rows={3} value={form.customerNeed} onChange={set('customerNeed')} />
          </FormField>
        </FormSection>
        {dirty && (
          <div className={styles.saveBar} data-fab-avoid>
            <div className={styles.saveBarInner}>
              <Body1Strong role="status">Unsaved changes</Body1Strong>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabledFocusable={savingShown}
                  onClick={() => {
                    if (saving) return
                    setErrors([])
                    onDiscard()
                  }}
                >
                  Discard
                </Button>
                <Button type="submit" variant="primary" icon={<Save20Regular />} pending={saving} pendingLabel="Saving…">
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        )}
        {showSaved && (
          <div className={styles.saveBar} data-fab-avoid>
            <div className={styles.saveBarInner}>
              {/* Announced by the persistent status below; the bar itself may mount after the save completes. */}
              <Body1Strong className={styles.savedText} aria-hidden="true">
                <CheckmarkCircle20Filled className={styles.savedIcon} />
                {saved.feedback?.message}
              </Body1Strong>
              <Button
                icon={<Dismiss20Regular />}
                onClick={() => {
                  saved.clear()
                  formRef.current?.focus({ preventScroll: true })
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
        <span role="status" className="sr-only">
          {showSaved ? saved.feedback?.message : ''}
        </span>
      </form>
    </Panel>
  )
}

function ProductsPanel({
  opp,
  readOnly,
  onChange,
  addOpen,
  setAddOpen,
}: {
  opp: Opportunity
  readOnly: boolean
  onChange: OpportunityWrite
  addOpen: boolean
  setAddOpen: (open: boolean) => void
}) {
  const { mode } = useApp()
  const styles = useStyles()
  const status = useInlineFeedback()
  const removal = usePendingAction()

  const remove = (p: OpportunityProduct) => removal.run(async () => {
    const index = opp.products.findIndex(x => x.id === p.id)
    const ok = await onChange(
      o => {
        o.products = o.products.filter(x => x.id !== p.id)
      },
      () => removeProduct(p.id),
    )
    if (!ok) return
    if (mode === 'live') {
      status.show(`Removed ${p.product}.`, 'info')
      return
    }
    status.show(`Removed ${p.product}.`, 'info', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const restored = await onChange(
            o => {
              if (o.products.some(x => x.id === p.id)) return
              o.products.splice(Math.min(index, o.products.length), 0, p)
            },
            async () => {},
          )
          if (restored) status.show(`${p.product} restored.`)
        },
      },
    })
  }, p.id)

  const columns: Column<OpportunityProduct>[] = [
    {
      key: 'product',
      header: 'Product',
      sortValue: p => p.product,
      render: p => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{p.product}</span>
          {p.writeIn && <StatusBadge status="Write-in" tone="slate" />}
        </span>
      ),
    },
    { key: 'price', header: 'Price per unit', render: p => <Numeric>{formatCurrency(p.pricePerUnit, { cents: true })}</Numeric>, className: 'text-right' },
    { key: 'qty', header: 'Quantity', render: p => <Numeric>{quantityLabel(p.quantity, p.unit)}</Numeric>, className: 'text-right' },
    { key: 'ext', header: 'Extended amount', render: p => <Numeric strong>{formatCurrency(p.quantity * p.pricePerUnit, { cents: true })}</Numeric>, className: 'text-right' },
  ]

  return (
    <Panel
      title="Products"
      bodyClassName="p-0"
      actions={
        !readOnly && (
          <Button size="sm" icon={<Add20Regular />} onClick={() => setAddOpen(true)}>
            Add product
          </Button>
        )
      }
    >
      <InlineFeedback feedback={status.feedback} className={status.feedback ? styles.sectionStatus : undefined} />
      <DataTable
        bare
        caption="Opportunity products"
        columns={columns}
        rows={opp.products}
        rowKey={p => p.id}
        empty={{
          title: 'No products yet',
          body: readOnly ? 'No products were added to this opportunity.' : 'Add the products and services in this deal to track its total amount.',
        }}
        actions={
          readOnly
            ? undefined
            : p => (
                <Button size="sm" variant="ghost" className={styles.removeButton} icon={<Delete20Regular />} aria-label={`Remove ${p.product}`} pending={removal.pendingKey === p.id} pendingLabel="Removing…" onClick={() => void remove(p)}>Remove</Button>
              )
        }
      />
      <div className={styles.totalBar}>
        <Body1 className={styles.muted}>Total amount</Body1>
        <Body1Strong className={styles.amount}>{formatCurrency(productsTotal(opp), { cents: true })}</Body1Strong>
      </div>
      {!readOnly && (
        <AddProductModal
          opportunityId={opp.id}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onChange={onChange}
          onAdded={name => status.show(`Added ${name}.`)}
        />
      )}
    </Panel>
  )
}

function AddProductModal({
  opportunityId,
  open,
  onClose,
  onChange,
  onAdded,
}: {
  opportunityId: string
  open: boolean
  onClose: () => void
  onChange: OpportunityWrite
  onAdded: (productName: string) => void
}) {
  const styles = useStyles()
  const empty = { kind: 'existing' as 'existing' | 'writein', existing: '', writeIn: '', unit: '', quantity: '1', price: '' }
  const [draft, setDraft] = useState(empty)
  const [errors, setErrors] = useState<FormError[]>([])
  const close = () => {
    setDraft(empty)
    setErrors([])
    onClose()
  }

  const save = async () => {
    const qty = draft.quantity.trim()
    const price = draft.price.trim()
    const errs = fieldErrors({
      'prod-existing': draft.kind === 'existing' && !draft.existing && 'Select a product',
      'prod-writein': draft.kind === 'writein' && !draft.writeIn.trim() && 'Enter a product name',
      'prod-unit': !draft.unit && 'Select a unit',
      'prod-qty': qty === '' ? 'Enter a quantity' : !(Number(qty) > 0) && 'Enter a quantity of 1 or more',
      'prod-price': price === '' ? 'Enter a price per unit' : (Number.isNaN(Number(price)) || Number(price) < 0) && 'Enter a price of 0 or more',
    })
    setErrors(errs)
    if (errs.length) return
    const product: OpportunityProduct = {
      id: newId('op'),
      product: draft.kind === 'existing' ? draft.existing : draft.writeIn.trim(),
      writeIn: draft.kind === 'writein',
      unit: draft.unit,
      quantity: Number(qty),
      pricePerUnit: Number(price),
    }
    const ok = await onChange(
      o => {
        o.products.push(product)
      },
      () => addProduct(opportunityId, { product: product.product, writeIn: product.writeIn, unit: product.unit, quantity: product.quantity, pricePerUnit: product.pricePerUnit }),
    )
    if (!ok) return
    onAdded(product.product)
    close()
  }

  const err = (id: string) => fieldErrorFor(errors, '', id)

  return (
    <FormPanel
      open={open}
      title="Add product"
      dirty={JSON.stringify(draft) !== JSON.stringify(empty)}
      onClose={close}
      submitLabel="Add product"
      submitIcon={<Add20Regular />}
      submitPendingLabel="Adding…"
      onSubmit={save}
    >
      <ValidationSummary errors={errors} />
      <Field label="Product type" className="mb-4">
        <RadioGroup layout="horizontal" value={draft.kind} onChange={(_, data) => setDraft(d => ({ ...d, kind: data.value as 'existing' | 'writein' }))}>
          <Radio value="existing" label="From catalog" />
          <Radio value="writein" label="Write-in product" />
        </RadioGroup>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {draft.kind === 'existing' ? (
          <FormField id="prod-existing" label="Product" required error={err('prod-existing')} className="sm:col-span-2">
            <Select
              id="prod-existing"
              value={draft.existing}
              placeholder="Select a product"
              options={PRODUCT_CATALOG.map(p => p.name)}
              onChange={e => {
                const p = PRODUCT_CATALOG.find(x => x.name === e.target.value)
                setDraft(d => ({ ...d, existing: e.target.value, unit: p?.unit ?? d.unit, price: p ? String(p.price) : d.price }))
              }}
            />
          </FormField>
        ) : (
          <FormField id="prod-writein" label="Product name" required error={err('prod-writein')} className="sm:col-span-2">
            <TextInput id="prod-writein" value={draft.writeIn} onChange={e => setDraft(d => ({ ...d, writeIn: e.target.value }))} />
          </FormField>
        )}
        <FormField id="prod-unit" label="Unit" required error={err('prod-unit')}>
          <Select id="prod-unit" value={draft.unit} placeholder="Select a unit" options={UNITS} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))} />
        </FormField>
        <FormField id="prod-qty" label="Quantity" required error={err('prod-qty')}>
          <TextInput id="prod-qty" type="number" min={1} step="1" value={draft.quantity} onChange={e => setDraft(d => ({ ...d, quantity: e.target.value }))} />
        </FormField>
        <FormField id="prod-price" label="Price per unit" required hint={CURRENCY.hint} error={err('prod-price')}>
          <TextInput id="prod-price" type="number" min={0} step="0.01" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} />
        </FormField>
        <div className="self-start">
          <Text as="p" className={styles.extAmountLabel}>
            Extended amount
          </Text>
          <Body1Strong as="p" className={styles.amount} aria-live="polite">
            {formatCurrency((Number(draft.quantity) || 0) * (Number(draft.price) || 0), { cents: true })}
          </Body1Strong>
        </div>
      </div>
    </FormPanel>
  )
}

function CustomerContactsPanel({
  opp,
  readOnly,
  lookups,
  onChange,
}: {
  opp: Opportunity
  readOnly: boolean
  lookups?: WorkspaceLookups
  onChange: OpportunityWrite
}) {
  const { db, session, mode } = useApp()
  const live = mode === 'live'
  const styles = useStyles()
  const [pick, setPick] = useState('')
  const status = useInlineFeedback()
  const action = usePendingAction()
  const linked = opp.customerContactIds.map(id => db.contacts.find(c => c.id === id)).filter((c): c is Contact => !!c)
  const available = (live ? (lookups?.customerContacts ?? []) : customerContacts(db, session))
    .filter(c => c.active && !opp.customerContactIds.includes(c.id))
    .sort((a, b) => Number(b.parentAccountId === opp.customerId) - Number(a.parentAccountId === opp.customerId) || fullName(a).localeCompare(fullName(b)))

  const remove = (c: Contact) => action.run(async () => {
    const index = opp.customerContactIds.indexOf(c.id)
    const ok = await onChange(
      o => {
        o.customerContactIds = o.customerContactIds.filter(x => x !== c.id)
      },
      () => unlinkCustomerContact(opp.id, c.id),
    )
    if (!ok) return
    if (live) {
      status.show(`Removed ${fullName(c)}.`, 'info')
      return
    }
    status.show(`Removed ${fullName(c)}.`, 'info', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const restored = await onChange(
            o => {
              if (o.customerContactIds.includes(c.id)) return
              o.customerContactIds.splice(Math.min(index, o.customerContactIds.length), 0, c.id)
            },
            async () => {},
          )
          if (restored) status.show(`${fullName(c)} restored.`)
        },
      },
    })
  }, c.id)

  const columns: Column<Contact>[] = [
    { key: 'name', header: 'Full name', render: c => <Text weight="medium">{fullName(c)}</Text> },
    { key: 'title', header: 'Job title', render: c => c.jobTitle ?? '—' },
    { key: 'email', header: 'Email', render: c => c.email ?? '—' },
    { key: 'phone', header: 'Business phone', render: c => c.phone ?? '—' },
    createdOnColumn<Contact>(),
  ]

  return (
    <Panel title="Customer contacts" bodyClassName="p-0">
      {!readOnly && (
        <form
          className={`flex flex-wrap items-end gap-2 px-5 py-4 ${styles.dividerBottom}`}
          aria-label="Add customer contact"
          onSubmit={e => {
            e.preventDefault()
            if (!pick) return
            const contactId = pick
            void action.run(async () => {
              const ok = await onChange(
                o => {
                  o.customerContactIds.push(contactId)
                },
                () => linkCustomerContact(opp.id, contactId),
              )
              if (!ok) return
              status.show('The contact has been added.')
              setPick('')
            }, ADD_KEY)
          }}
        >
          <FormField id="cc-add" label="Add an existing contact" className="flex-1 min-w-56">
            <Select
              id="cc-add"
              value={pick}
              onChange={e => setPick(e.target.value)}
              placeholder="Select a customer contact"
              options={available.map(c => ({ value: c.id, label: `${fullName(c)} · ${accountName(db, c.parentAccountId)}` }))}
            />
          </FormField>
          <Button type="submit" icon={<PersonAdd20Regular />} disabled={!pick} pending={action.pendingKey === ADD_KEY} pendingLabel="Adding…">
            Add contact
          </Button>
        </form>
      )}
      <InlineFeedback feedback={status.feedback} className={status.feedback ? styles.sectionStatus : undefined} />
      <DataTable
        bare
        caption="Customer contacts"
        columns={columns}
        rows={linked}
        rowKey={c => c.id}
        empty={{
          title: 'No customer contacts yet',
          body: readOnly ? 'No customer contacts were linked to this opportunity.' : "Link the people you're working with at the customer.",
        }}
        actions={
          readOnly
            ? undefined
            : c => (
                <Button size="sm" variant="ghost" className={styles.removeButton} icon={<Delete20Regular />} aria-label={`Remove ${fullName(c)}`} pending={action.pendingKey === c.id} pendingLabel="Removing…" onClick={() => void remove(c)}>Remove</Button>
              )
        }
      />
    </Panel>
  )
}

function PartnerContactPanel({ opp }: { opp: Opportunity }) {
  const { db } = useApp()
  const styles = useStyles()
  const c = db.contacts.find(x => x.id === opp.partnerContactId)
  return (
    <Panel title="Assigned to">
      {c ? (
        <div className="flex gap-3">
          <Avatar name={fullName(c)} initials={`${c.firstName[0]}${c.lastName[0]}`} color="brand" size={40} aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <Body1Strong as="p" className={styles.contactName}>
              {fullName(c)}
            </Body1Strong>
            {(c.jobTitle || c.partnerRole) && (
              <Body1 as="p" className={styles.contactLine}>
                {[c.jobTitle, c.partnerRole && <RoleText key="role" role={c.partnerRole} />].filter(Boolean).reduce<ReactNode[]>(
                  (acc, part, i) => (i ? [...acc, ' · ', part] : [part]),
                  [],
                )}
              </Body1>
            )}
            {c.email && (
              <p className="break-all">
                <FluentLink href={`mailto:${c.email}`} inline>
                  {c.email}
                </FluentLink>
              </p>
            )}
            {c.phone && (
              <Body1 as="p" className={styles.contactLine}>
                {c.phone}
              </Body1>
            )}
          </div>
        </div>
      ) : (
        <Body1 as="p" className={styles.muted}>
          No partner contact is assigned.
        </Body1>
      )}
      <FieldList
        className={styles.partnerList}
        items={[
          { label: 'Partner', value: accountName(db, opp.partnerId) },
          ...(opp.collaboration ? [{ label: 'Collaborating partners', value: opp.collaboratingPartnerIds.map(p => accountName(db, p)).join(', ') }] : []),
        ]}
      />
    </Panel>
  )
}

/** Live only (A-11): partner contacts this opportunity is shared with (adx_internal_collaboration). */
function SharedContactsPanel({ opp, lookups, onChange }: { opp: Opportunity; lookups?: WorkspaceLookups; onChange: OpportunityWrite }) {
  const { db } = useApp()
  const styles = useStyles()
  const [pick, setPick] = useState('')
  const status = useInlineFeedback()
  const sharedIds = opp.sharedContactIds ?? []
  const shared = sharedIds.map(id => db.contacts.find(c => c.id === id)).filter((c): c is Contact => !!c)
  const available = (lookups?.partnerContacts ?? []).filter(c => c.active && c.partnerRole && !sharedIds.includes(c.id))
  const action = usePendingAction()

  const add = () => action.run(async () => {
    if (!pick) return
    const contactId = pick
    const ok = await onChange(
      o => {
        o.sharedContactIds = [...(o.sharedContactIds ?? []), contactId]
      },
      () => shareOpportunity(opp.id, contactId),
    )
    if (!ok) return
    status.show('The partner contact has been added.')
    setPick('')
  }, ADD_KEY)

  const remove = (c: Contact) => action.run(async () => {
    const ok = await onChange(
      o => {
        o.sharedContactIds = (o.sharedContactIds ?? []).filter(x => x !== c.id)
      },
      () => unshareOpportunity(opp.id, c.id),
    )
    if (ok) status.show(`Removed ${fullName(c)}.`, 'info')
  }, c.id)

  return (
    <Panel title="Partner contacts" bodyClassName="p-0">
      <form
        className={`flex flex-wrap items-end gap-2 px-5 py-4 ${styles.dividerBottom}`}
        aria-label="Add partner contact"
        onSubmit={e => {
          e.preventDefault()
          void add()
        }}
      >
        <FormField id="pc-share" label="Add partner contact" className="flex-1 min-w-56">
          <Select
            id="pc-share"
            value={pick}
            onChange={e => setPick(e.target.value)}
            placeholder="Select a partner contact"
            options={available.map(c => ({ value: c.id, label: `${fullName(c)} (${c.partnerRole})` }))}
          />
        </FormField>
        <Button type="submit" icon={<PersonAdd20Regular />} disabled={!pick} pending={action.pendingKey === ADD_KEY} pendingLabel="Adding…">
          Add
        </Button>
      </form>
      <InlineFeedback feedback={status.feedback} className={status.feedback ? styles.sectionStatus : undefined} />
      {shared.length === 0 ? (
        <Body1 as="p" className={`px-5 py-4 ${styles.muted}`}>
          This opportunity isn't shared with other partner contacts.
        </Body1>
      ) : (
        <ul>
          {shared.map(c => (
            <li key={c.id} className={`flex items-center justify-between gap-3 ${styles.regItem}`}>
              <Body1 className={styles.strong}>{fullName(c)}</Body1>
              <Button size="sm" variant="ghost" className={styles.removeButton} icon={<Delete20Regular />} aria-label={`Remove ${fullName(c)}`} pending={action.pendingKey === c.id} pendingLabel="Removing…" onClick={() => void remove(c)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function RegistrationPanel({
  regs,
  allowSimulation,
  emptyKind,
  onRegister,
}: {
  regs: DealRegistration[]
  allowSimulation: boolean
  emptyKind: 'register' | 'distributed' | 'none'
  onRegister: () => void
}) {
  const { db, mutate } = useApp()
  const styles = useStyles()
  const status = useInlineFeedback()
  const simulate = (r: DealRegistration) => {
    const today = todayIso()
    mutate(d => {
      const x = d.dealRegistrations.find(y => y.id === r.id)
      if (!x) return
      if (x.status === 'New') x.status = 'Under Review'
      else if (x.status === 'Under Review') {
        x.status = 'Approved'
        x.startDate = today
        x.expirationDate = addDays(today, 180)
      }
    })
    status.show(r.status === 'New' ? 'Simulated: registration moved to Under Review.' : 'Simulated: registration approved for 180 days.', 'info')
  }

  return (
    <Panel title="Deal registration" bodyClassName="p-0">
      <InlineFeedback feedback={status.feedback} className={status.feedback ? styles.sectionStatus : undefined} />
      {regs.length === 0 ? (
        emptyKind === 'register' ? (
          <EmptyState
            bare
            title="Not registered yet"
            body="Register this deal to protect it with Zava. Zava reviews each request before approving it."
            action={
              <Button icon={<ShieldCheckmark20Regular />} onClick={onRegister}>
                Register deal
              </Button>
            }
          />
        ) : emptyKind === 'distributed' ? (
          <EmptyState bare title="Registration not needed" body="Opportunities distributed by Zava are already protected, so they don't need deal registration." />
        ) : (
          <EmptyState bare title="No registrations" body="This opportunity has no deal registrations." />
        )
      ) : (
        <ol>
          {regs.map(r => (
            <li key={r.id} className={styles.regItem}>
              <div className="flex items-start justify-between gap-3">
                <Body1Strong as="h3" className={styles.regTitle}>
                  {r.name}
                </Body1Strong>
                <StatusBadge status={r.status} />
              </div>
              <dl className={styles.regList}>
                {(
                  [
                    ['Submitted', formatDate(r.submissionDate)],
                    ['Start date', formatDate(r.startDate)],
                    ['Expiration date', formatDate(r.expirationDate)],
                    ['Submitted by', contactName(db, r.partnerContactId)],
                  ] as const
                ).map(([term, value]) => [
                  <dt key={`${term}-t`} className={styles.regTerm}>
                    {term}
                  </dt>,
                  <dd key={`${term}-d`} className={styles.regValue}>
                    {value}
                  </dd>,
                ])}
              </dl>
              {r.reasonForRegistering && (
                <Text as="p" className={styles.regNote}>
                  <Text weight="semibold" className={styles.strong}>
                    Reason for registering:
                  </Text>{' '}
                  {r.reasonForRegistering}
                </Text>
              )}
              {r.renewalReason && (
                <Text as="p" className={styles.regNote}>
                  <Text weight="semibold" className={styles.strong}>
                    Renewal reason:
                  </Text>{' '}
                  {r.renewalReason}
                </Text>
              )}
              {allowSimulation && (r.status === 'New' || r.status === 'Under Review') && (
                <div className={styles.simulation}>
                  <Caption1 as="p" className={styles.simulationLabel}>
                    Prototype only
                  </Caption1>
                  <Button size="sm" variant="ghost" icon={<Beaker20Regular />} className={styles.simulationButton} onClick={() => simulate(r)}>
                    Simulate vendor review ({r.status === 'New' ? 'move to Under Review' : 'approve'})
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function RegistrationModal({
  mode,
  opp,
  previous,
  reload,
  onClose,
}: {
  mode: 'register' | 'extend' | null
  opp: Opportunity
  previous?: DealRegistration
  reload: () => Promise<void>
  onClose: () => void
}) {
  const { session, perform, notify } = useApp()
  const styles = useStyles()
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<FormError[]>([])
  const extend = mode === 'extend'
  const label = extend ? 'Renewal reason' : 'Reason for registering'

  const close = () => {
    setReason('')
    setErrors([])
    onClose()
  }

  const submit = async () => {
    const errs = fieldErrors({ 'reg-reason': !reason.trim() && (extend ? 'Enter a reason for the renewal' : 'Enter a reason for registering this deal') })
    setErrors(errs)
    if (errs.length) return
    const today = todayIso()
    const text = reason.trim()
    const ok = await perform({
      mock: d => {
        if (extend && previous) {
          const old = d.dealRegistrations.find(r => r.id === previous.id)
          if (old) old.status = 'Closed'
        }
        d.dealRegistrations.push({
          id: newId('dr'),
          name: `${opp.topic} – ${extend ? 'renewal' : 'registration'}`,
          opportunityId: opp.id,
          partnerId: opp.partnerId ?? session.partnerId ?? '',
          partnerContactId: session.contact?.id ?? opp.partnerContactId,
          reasonForRegistering: extend ? previous?.reasonForRegistering : text,
          renewalReason: extend ? text : undefined,
          submissionDate: today,
          status: 'New',
        })
      },
      live: () => {
        if (!session.contact) throw new Error(PERMISSION_MESSAGE)
        return registerDeal(opp.id, session.contact.id, extend ? { renewalReason: text } : { reason: text })
      },
      refresh: reload,
    })
    if (!ok) return
    notify(extend ? 'Your renewal request has been sent to Zava for review.' : 'Your deal registration has been sent to Zava for review.')
    close()
  }

  const expiry = previous?.expirationDate
  const days = daysUntil(expiry)

  return (
    <FormPanel
      open={mode !== null}
      title={extend ? 'Extend deal registration' : 'Register deal'}
      dirty={reason !== ''}
      onClose={close}
      submitLabel={extend ? 'Submit renewal request' : 'Submit registration'}
      submitIcon={<Send20Regular />}
      submitPendingLabel="Submitting…"
      onSubmit={submit}
    >
      <ValidationSummary errors={errors} />
      <Body1 as="p" className={styles.intro}>
        {extend
          ? `${
              expiry
                ? `The current registration ${days !== undefined && days < 0 ? 'expired' : 'expires'} on ${formatDate(expiry)}${days !== undefined && days >= 0 ? ` (${daysLeftLabel(days)})` : ''}.`
                : 'The current registration is ending.'
            } Submitting closes it and sends a renewal request to Zava for review.`
          : 'Zava reviews each registration request. Once approved, the deal is protected for 180 days.'}
      </Body1>
      <FieldList
        items={[
          { label: 'Opportunity', value: opp.topic },
          { label: 'Reference code', value: <Text font="monospace">{opp.referenceCode}</Text> },
        ]}
      />
      <FormField
        id="reg-reason"
        label={label}
        required
        hint={
          extend
            ? 'Explain why you need more time, for example the customer decision moved to next quarter.'
            : 'Explain how you sourced this deal and your role, for example the customer engaged through our workshop.'
        }
        error={fieldErrorFor(errors, label, 'reg-reason')}
        className={styles.dialogField}
      >
        <TextArea id="reg-reason" value={reason} onChange={e => setReason(e.target.value)} />
      </FormField>
    </FormPanel>
  )
}

function CloseModal({
  mode,
  opp,
  onClose,
  onConfirm,
}: {
  mode: 'won' | 'lost' | null
  opp: Opportunity
  onClose: () => void
  onConfirm: (status: 'Won' | 'Lost', outcome: { actualRevenue?: number; actualCloseDate?: string; lossReason?: string }) => void
}) {
  const styles = useStyles()
  const won = mode === 'won'
  const initial = () => ({ revenue: String(opp.estRevenue ?? ''), date: todayIso(), reason: '' })
  const [draft, setDraft] = useState(initial)
  const [baseline, setBaseline] = useState(initial)
  const [errors, setErrors] = useState<FormError[]>([])
  const [wasOpen, setWasOpen] = useState(false)
  if (mode !== null && !wasOpen) {
    setWasOpen(true)
    const next = initial()
    setDraft(next)
    setBaseline(next)
    setErrors([])
  } else if (mode === null && wasOpen) setWasOpen(false)

  const submit = () => {
    const revenue = draft.revenue.trim()
    const errs = won
      ? fieldErrors({
          'close-revenue': revenue === '' ? 'Enter the actual revenue' : (Number.isNaN(Number(revenue)) || Number(revenue) < 0) && `Enter an actual revenue of 0 or more, ${CURRENCY.inWords}`,
          'close-date': !draft.date && 'Enter the actual close date',
        })
      : fieldErrors({ 'close-reason': !draft.reason && 'Select why the opportunity was lost' })
    setErrors(errs)
    if (errs.length) return
    if (won) onConfirm('Won', { actualRevenue: Number(revenue), actualCloseDate: draft.date })
    else onConfirm('Lost', { lossReason: draft.reason, actualCloseDate: todayIso() })
    onClose()
  }

  return (
    <FormPanel
      open={mode !== null}
      title={won ? 'Close opportunity as won' : 'Close opportunity as lost'}
      dirty={JSON.stringify(draft) !== JSON.stringify(baseline)}
      onClose={onClose}
      submitLabel={won ? 'Close as won' : 'Close as lost'}
      submitIcon={won ? <Trophy20Regular /> : <Dismiss20Regular />}
      destructive={!won}
      onSubmit={submit}
    >
      <ValidationSummary errors={errors} />
      <Body1 as="p" className={styles.intro}>
        Record the outcome for reporting. Any active deal registration will be closed. You can reopen the opportunity later if needed.
      </Body1>
      {won ? (
        <div className="space-y-4">
          <FormField id="close-revenue" label="Actual revenue" required hint={CURRENCY.hint} error={fieldErrorFor(errors, 'Actual revenue', 'close-revenue')}>
            <TextInput id="close-revenue" type="number" min={0} step="0.01" value={draft.revenue} onChange={e => setDraft(d => ({ ...d, revenue: e.target.value }))} />
          </FormField>
          <FormField id="close-date" label="Actual close date" required error={fieldErrorFor(errors, 'Actual close date', 'close-date')}>
            <TextInput id="close-date" type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
          </FormField>
        </div>
      ) : (
        <Field
          label="Why was the opportunity lost?"
          required
          validationState={fieldErrorFor(errors, '', 'close-reason') ? 'error' : 'none'}
          validationMessage={fieldErrorFor(errors, '', 'close-reason')}
        >
          <RadioGroup id="close-reason" value={draft.reason} onChange={(_, data) => setDraft(d => ({ ...d, reason: data.value }))}>
            {LOSS_REASONS.map(r => (
              <Radio key={r} value={r} label={r} />
            ))}
          </RadioGroup>
        </Field>
      )}
    </FormPanel>
  )
}

function ReturnModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const styles = useStyles()
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<FormError[]>([])
  const close = () => {
    setReason('')
    setErrors([])
    onClose()
  }
  const submit = async (allowNavigation: () => void) => {
    const errs = fieldErrors({ 'return-reason': !reason && 'Select a reason for returning the opportunity' })
    setErrors(errs)
    if (errs.length) return
    allowNavigation()
    await onConfirm(reason)
    close()
  }
  const message = fieldErrorFor(errors, '', 'return-reason')
  return (
    <FormPanel
      open={open}
      title="Return opportunity to Zava"
      dirty={reason !== ''}
      onClose={close}
      submitLabel="Return to Zava"
      submitIcon={<ArrowReply20Regular />}
      submitPendingLabel="Returning…"
      destructive
      onSubmit={submit}
    >
      <ValidationSummary errors={errors} />
      <Body1 as="p" className={styles.intro}>
        Your organization will no longer have access to this opportunity. This can't be undone.
      </Body1>
      <Field label="Reason for return" required validationState={message ? 'error' : 'none'} validationMessage={message}>
        <RadioGroup id="return-reason" value={reason} onChange={(_, data) => setReason(data.value)}>
          {RETURN_REASONS.map(r => (
            <Radio key={r} value={r} label={sentence(r)} />
          ))}
        </RadioGroup>
      </Field>
    </FormPanel>
  )
}

// Keeps mergeClasses referenced for future style composition in this module.
void mergeClasses
