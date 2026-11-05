import { useState } from 'react'
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Body1,
  Card,
  Link as FluentLink,
  Subtitle1,
  makeStyles,
  shorthands,
  tokens,
  type AccordionToggleEventHandler,
} from '@fluentui/react-components'
import { ArrowMaximizeVertical20Regular, ArrowMinimizeVertical20Regular, DocumentText20Regular, Home20Regular, PersonAdd20Regular } from '@fluentui/react-icons'
import { isPartnerOrgRole } from '../../lib/access'
import { useApp } from '../../store/AppStore'
import { Container } from '../../components/Layout'
import { Button, ButtonLink, PageHeader } from '../../components/ui'
import { PROGRAM_CRUMB } from './ProgramHero'
import { FAQS } from '../../lib/program'

const PARTNER_TEAM_EMAIL = 'partners@zava.com'



const useStyles = makeStyles({
  card: { maxWidth: '56rem', ...shorthands.padding('0'), rowGap: '0' },
  item: { ':not(:last-child)': { borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` } },
  header: { margin: 0 },
  headerButton: {
    minHeight: '56px',
    paddingInline: tokens.spacingHorizontalL,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  panel: { marginInlineStart: 0, marginInlineEnd: 0 },
  answer: {
    display: 'block',
    margin: 0,
    maxWidth: '65ch',
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalL,
    paddingBottom: tokens.spacingVerticalXL,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    color: tokens.colorNeutralForeground1,
  },
  next: { maxWidth: '56rem', marginTop: tokens.spacingVerticalXXXL },
  nextTitle: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  nextBody: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalS, maxWidth: '65ch', color: tokens.colorNeutralForeground1 },
})

export default function ProgramFAQs() {
  const { session } = useApp()
  const styles = useStyles()
  const [open, setOpen] = useState<number[]>([0])
  const onToggle: AccordionToggleEventHandler<number> = (_, data) => setOpen(data.openItems)
  const allOpen = open.length === FAQS.length
  const isPartner = isPartnerOrgRole(session.role)

  return (
    <Container>
      <PageHeader
        title="Frequently asked questions"
        description="Answers about the program, deal registration, distributed opportunities and partner roles."
        breadcrumbs={[PROGRAM_CRUMB, { label: 'Frequently asked questions' }]}
        actions={
          <Button
            size="sm"
            icon={allOpen ? <ArrowMinimizeVertical20Regular /> : <ArrowMaximizeVertical20Regular />}
            onClick={() => setOpen(allOpen ? [] : FAQS.map((_, i) => i))}
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        }
      />

      <Card className={styles.card}>
        <Accordion multiple collapsible openItems={open} onToggle={onToggle}>
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={i} className={styles.item}>
              <AccordionHeader as="h2" className={styles.header} button={{ className: styles.headerButton }} expandIconPosition="end" size="large">
                {f.q}
              </AccordionHeader>
              <AccordionPanel className={styles.panel}>
                <Body1 as="p" className={styles.answer}>
                  {f.a}
                </Body1>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <section aria-labelledby="faq-next" className={styles.next}>
        <Subtitle1 as="h2" id="faq-next" className={styles.nextTitle}>
          Still have a question?
        </Subtitle1>
        <Body1 as="p" className={styles.nextBody}>
          Email the partner team at <FluentLink href={`mailto:${PARTNER_TEAM_EMAIL}`} inline>{PARTNER_TEAM_EMAIL}</FluentLink> and the Zava channel team will get back to you.
        </Body1>
        <div className="mt-4 flex flex-wrap gap-2">
          {isPartner ? (
            <ButtonLink to="/" variant="primary" icon={<Home20Regular />}>
              Go to dashboard
            </ButtonLink>
          ) : (
            <ButtonLink to="/partner-program/become-a-partner/" variant="primary" icon={<PersonAdd20Regular />}>
              Become a partner
            </ButtonLink>
          )}
          <ButtonLink to="/partner-program/partner-program-details/" icon={<DocumentText20Regular />}>
            View program details
          </ButtonLink>
        </div>
      </section>
    </Container>
  )
}
