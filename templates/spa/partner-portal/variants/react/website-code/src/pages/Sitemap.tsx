import { Body1, Subtitle1, makeStyles, mergeClasses, tokens } from '@fluentui/react-components'
import { Container } from '../components/Layout'
import { AppLink, PageHeader } from '../components/ui'
import { useApp } from '../store/AppStore'
import { ROLE_LABELS } from '../lib/access'
import { visiblePages, type SitePage } from '../lib/sitePages'

const SELF = '/sitemap/'

const useStyles = makeStyles({
  sectionTitle: { display: 'block', margin: 0, marginBottom: tokens.spacingVerticalM, color: tokens.colorNeutralForeground1 },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, margin: 0, padding: 0, listStyleType: 'none' },
  nested: {
    marginTop: tokens.spacingVerticalM,
    paddingInlineStart: tokens.spacingHorizontalL,
    borderInlineStartWidth: tokens.strokeWidthThick,
    borderInlineStartStyle: 'solid',
    borderInlineStartColor: tokens.colorNeutralStroke2,
  },
  // Body 2 size; 24px line height keeps each stacked link a 24px target (WCAG 2.5.8).
  link: { fontSize: tokens.fontSizeBase400, lineHeight: '24px' },
  top: { fontWeight: tokens.fontWeightSemibold },
  desc: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
})

interface Section {
  title: string
  pages: SitePage[]
}

/** Top-level leaves go under "General", each branch gets its own section, sign-in pages go under "Your account". */
function buildSections(pages: SitePage[]): Section[] {
  const visible = pages.filter(p => p.path !== SELF)
  const general = visible.filter(p => !p.children?.length && !p.anonymousOnly)
  const branches = visible.filter(p => p.children?.length)
  const anonymous = visible.filter(p => p.anonymousOnly)
  const sections: Section[] = []
  if (general.length) sections.push({ title: 'General', pages: general })
  branches.forEach(p => sections.push({ title: p.group ?? p.title, pages: [p] }))
  if (anonymous.length) sections.push({ title: 'Your account', pages: anonymous })
  return sections
}

function PageList({ pages, depth }: { pages: SitePage[]; depth: number }) {
  const styles = useStyles()
  return (
    <ul className={mergeClasses(styles.list, depth > 0 && styles.nested)}>
      {pages.map(p => (
        <li key={p.path}>
          <AppLink to={p.path} className={mergeClasses(styles.link, depth === 0 && styles.top)}>
            {p.title}
          </AppLink>
          <Body1 as="p" className={styles.desc}>
            {p.description}
          </Body1>
          {p.children && p.children.length > 0 && <PageList pages={p.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  )
}

export default function Sitemap() {
  const { session } = useApp()
  const styles = useStyles()
  const sections = buildSections(visiblePages(session.role))
  return (
    <Container>
      <PageHeader title="Sitemap" breadcrumbs={[{ label: 'Sitemap' }]} description={`Pages available to your current role: ${ROLE_LABELS[session.role]}.`} />
      <nav aria-label="Sitemap" className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        {sections.map((s, i) => (
          <section key={s.title} aria-labelledby={`sitemap-${i}`}>
            <Subtitle1 as="h2" id={`sitemap-${i}`} className={styles.sectionTitle}>
              {s.title}
            </Subtitle1>
            <PageList pages={s.pages} depth={0} />
          </section>
        ))}
      </nav>
    </Container>
  )
}
