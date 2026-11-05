import {
  Badge,
  Body1,
  Caption1,
  Card,
  Subtitle1,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { ArrowRight16Regular, Checkmark16Regular, CheckmarkCircle20Regular, Dismiss16Regular, PersonAdd20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { ButtonLink, PageHeader } from '../../components/ui'
import { CRITERIA, TIER_BENEFITS, TIERS, type TierCell, type TierRow } from '../../lib/program'
import { useApp } from '../../store/AppStore'
import { can, isPartnerOrgRole } from '../../lib/access'
import { ON_NAVY_FG, SHELL_NAVY, withAlpha } from '../../theme/fluentTheme'
import { ON_NAVY_VARS, PROGRAM_CRUMB, SectionTitle } from './ProgramHero'

const RESPONSIBILITIES = [
  'Keep your partner account, contacts and partner contact roles up to date in Parent account and Manage access.',
  'Respond to distributed opportunities before they expire, and return those you can’t pursue so Zava can redistribute them.',
  'Register only opportunities you sourced, and keep status, estimated revenue and close dates current.',
  'Maintain the certified-staff, revenue and customer-satisfaction criteria for your tier.',
  'Protect customer data and follow Zava brand and co-marketing guidelines.',
]

const useStyles = makeStyles({
  scrollHint: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, marginBottom: tokens.spacingVerticalS, color: tokens.colorNeutralForeground2 },
  tableCard: { ...shorthands.padding('0'), overflowX: 'auto' },
  table: { minWidth: '680px' },
  sticky: {
    position: 'sticky',
    left: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: `inset -${tokens.strokeWidthThin} 0 0 ${tokens.colorNeutralStroke2}`,
  },
  corner: { width: '30%', color: tokens.colorNeutralForeground2, fontWeight: tokens.fontWeightSemibold },
  tierHead: { verticalAlign: 'bottom', fontSize: tokens.fontSizeBase400, fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground1 },
  tierHeadInner: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: tokens.spacingVerticalXXS, paddingTop: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalS },
  groupRow: { backgroundColor: tokens.colorNeutralBackground2, ':hover': { backgroundColor: tokens.colorNeutralBackground2 } },
  groupHead: { fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground1 },
  groupLabel: { position: 'sticky', left: tokens.spacingHorizontalM },
  rowHead: { verticalAlign: 'top', paddingTop: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalS },
  rowLabel: { display: 'block', fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground1 },
  rowDesc: { display: 'block', marginTop: tokens.spacingVerticalXXS, fontWeight: tokens.fontWeightRegular, color: tokens.colorNeutralForeground2 },
  cell: { verticalAlign: 'top', paddingTop: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalS, color: tokens.colorNeutralForeground1 },
  mark: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  included: { display: 'inline-flex', color: tokens.colorPaletteGreenForeground1 },
  excluded: { color: tokens.colorNeutralForeground2 },
  respList: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, margin: 0, padding: 0, listStyleType: 'none' },
  respItem: { display: 'flex', gap: tokens.spacingHorizontalM },
  respIcon: { display: 'flex', flexShrink: 0, color: tokens.colorNeutralForeground2, fontSize: '20px', paddingTop: '2px' },
  respText: { maxWidth: '65ch', fontSize: tokens.fontSizeBase400, lineHeight: tokens.lineHeightBase400, color: tokens.colorNeutralForeground1 },
  cta: { backgroundColor: SHELL_NAVY, color: ON_NAVY_FG, ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL), display: 'flex', flexDirection: 'column' },
  ctaTitle: { display: 'block', margin: 0, color: ON_NAVY_FG },
  ctaBody: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalS, color: withAlpha(ON_NAVY_FG, 0.85), flexGrow: 1 },
})

function CellValue({ value }: { value: TierCell }) {
  const styles = useStyles()
  if (value === true)
    return (
      <span className={styles.mark}>
        <span aria-hidden="true" className={styles.included}>
          <Checkmark16Regular />
        </span>
        Included
      </span>
    )
  if (value === false)
    return (
      <span className={mergeClasses(styles.mark, styles.excluded)}>
        <Dismiss16Regular aria-hidden="true" />
        Not included
      </span>
    )
  return <>{value}</>
}

function TierRows({ group, rows }: { group: string; rows: TierRow[] }) {
  const styles = useStyles()
  return (
    <TableBody>
      <TableRow className={styles.groupRow}>
        <TableHeaderCell scope="colgroup" colSpan={TIERS.length + 1} className={styles.groupHead}>
          <span className={styles.groupLabel}>{group}</span>
        </TableHeaderCell>
      </TableRow>
      {rows.map(r => (
        <TableRow key={r.label}>
          <TableHeaderCell scope="row" className={mergeClasses(styles.sticky, styles.rowHead)}>
            <span>
              <span className={styles.rowLabel}>{r.label}</span>
              {r.desc && <Caption1 className={styles.rowDesc}>{r.desc}</Caption1>}
            </span>
          </TableHeaderCell>
          {r.values.map((v, i) => (
            <TableCell key={TIERS[i]} className={styles.cell}>
              <CellValue value={v} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

export default function ProgramDetails() {
  const { session } = useApp()
  const styles = useStyles()
  const isPartner = isPartnerOrgRole(session.role)
  const technician = can(session.role, 'work-orders')
  return (
    <Container>
      <PageHeader
        title="Program details"
        description="Every partner starts at Registered. Meet the certified-staff, revenue and customer-satisfaction criteria to move up a tier and unlock more benefits."
        breadcrumbs={[PROGRAM_CRUMB, { label: 'Program details' }]}
        actions={
          !isPartner && (
            <ButtonLink to="/partner-program/become-a-partner/" variant="primary" icon={<PersonAdd20Regular />}>
              Become a partner
            </ButtonLink>
          )
        }
      />

      <section aria-labelledby="tiers-heading" className="mb-10">
        <SectionTitle id="tiers-heading" title="Tier criteria and benefits" />
        <Caption1 as="p" className={mergeClasses(styles.scrollHint, 'lg:hidden')}>
          Scroll sideways to compare all four tiers
          <ArrowRight16Regular aria-hidden="true" />
        </Caption1>
        <Card className={styles.tableCard} tabIndex={0} role="region" aria-label="Comparison of partner tiers (scrollable)">
          <Table className={styles.table}>
            <caption className="sr-only">Comparison of partner tiers: criteria and benefits</caption>
            <TableHeader>
              <TableRow>
                <TableHeaderCell scope="col" className={mergeClasses(styles.sticky, styles.corner)}>
                  Tier
                </TableHeaderCell>
                {TIERS.map(t => (
                  <TableHeaderCell key={t} scope="col" className={styles.tierHead}>
                    <span className={styles.tierHeadInner}>
                      <span>{t}</span>
                      {t === 'Gold' && (
                        <Badge appearance="tint" color="informative" shape="rounded">
                          Most popular
                        </Badge>
                      )}
                    </span>
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TierRows group="Criteria" rows={CRITERIA} />
            <TierRows group="Benefits" rows={TIER_BENEFITS} />
          </Table>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <section aria-labelledby="resp-heading" className="lg:col-span-2">
          <SectionTitle id="resp-heading" title="Partner responsibilities" />
          <ul className={styles.respList}>
            {RESPONSIBILITIES.map(r => (
              <li key={r} className={styles.respItem}>
                <span aria-hidden="true" className={styles.respIcon}>
                  <CheckmarkCircle20Regular />
                </span>
                <Body1 className={styles.respText}>{r}</Body1>
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.cta} style={ON_NAVY_VARS} aria-labelledby="cta-heading">
          <Subtitle1 as="h2" id="cta-heading" className={styles.ctaTitle}>
            {isPartner ? 'You’re part of the program' : 'Ready to join?'}
          </Subtitle1>
          <Body1 as="p" className={styles.ctaBody}>
            {isPartner
              ? technician
                ? 'Your organization is already a Zava partner. Go to your workspace to see your work orders.'
                : 'Your organization is already a Zava partner. Go to your dashboard to work your opportunities.'
              : 'Zava reviews every application. Once approved, your first contact is assigned the Partner Admin role.'}
          </Body1>
          <div className="mt-5">
            {isPartner ? (
              <ButtonLink to="/" variant="primary">
                {technician ? 'Go to your workspace' : 'Go to dashboard'}
              </ButtonLink>
            ) : (
              <ButtonLink to="/partner-program/become-a-partner/" variant="primary">
                Start your application
              </ButtonLink>
            )}
          </div>
        </section>
      </div>
    </Container>
  )
}
