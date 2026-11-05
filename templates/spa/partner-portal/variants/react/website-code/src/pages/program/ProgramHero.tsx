import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { Body1, Body1Strong, Caption1Strong, Card, Subtitle1, Title1, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components'
import { AppLink } from '../../components/ui'
import { ImageWithSkeleton } from '../../components/skeletons'
import { APPLICATION_REVIEW_TIME } from '../../lib/program'
import { HERO_NAVY, ON_NAVY_FG, SHELL_ACCENT, contosoBrand, onNavyFocusVars, withAlpha } from '../../theme/fluentTheme'

const UNSPLASH = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&h=700&fit=crop`

/** Navy used by the marketing heroes (re-exported from the theme for existing importers). */
export { HERO_NAVY }

/** Light focus ring for Fluent controls rendered on a navy hero. */
export const ON_NAVY_VARS = onNavyFocusVars(HERO_NAVY)

/**
 * Re-points the Skeleton stencil and image-error tokens for an ImageWithSkeleton on navy, so the
 * loading shimmer is a subtle light-on-navy band and the fallback box blends into the hero.
 */
export const ON_NAVY_IMAGE_VARS = {
  '--colorNeutralStencil1': withAlpha(ON_NAVY_FG, 0.08),
  '--colorNeutralStencil2': withAlpha(ON_NAVY_FG, 0.16),
  '--colorNeutralBackground3': withAlpha(ON_NAVY_FG, 0.06),
  '--colorNeutralForeground3': withAlpha(ON_NAVY_FG, 0.7),
} as CSSProperties

const HERO_FADE = `linear-gradient(to right, ${HERO_NAVY} 0%, ${withAlpha(HERO_NAVY, 0.96)} 40%, ${withAlpha(HERO_NAVY, 0.55)} 70%, ${withAlpha(HERO_NAVY, 0.25)} 100%)`
const HERO_GLOW = `radial-gradient(circle at center, ${withAlpha(contosoBrand[80], 0.18)} 0%, transparent 65%)`

const useHeroStyles = makeStyles({
  hero: { backgroundColor: HERO_NAVY },
  image: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '100%', '@media (min-width: 768px)': { width: '62%' } },
  imageFill: { width: '100%', height: '100%' },
  eyebrow: { display: 'block', margin: 0, color: contosoBrand[130] },
  rule: { width: '1px', height: '16px', backgroundColor: SHELL_ACCENT },
  title: { display: 'block', margin: 0, color: ON_NAVY_FG },
  body: { display: 'block', marginTop: tokens.spacingVerticalL, color: withAlpha(ON_NAVY_FG, 0.85), fontSize: tokens.fontSizeBase400, lineHeight: tokens.lineHeightBase400 },
  fade: { background: HERO_FADE },
  scrim: { backgroundColor: withAlpha(HERO_NAVY, 0.9) },
  glow: { top: '-30%', right: '-10%', width: '60%', height: '120%', background: HERO_GLOW },
  sectionEyebrow: {
    display: 'block',
    margin: 0,
    marginBottom: tokens.spacingVerticalXXS,
    color: tokens.colorNeutralForeground2,
  },
  sectionTitle: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
})

/** White-outline secondary button for use on navy backgrounds (pass as `className` to ButtonLink/Button). */
export const useOnNavyButtonStyles = makeStyles({
  outline: {
    backgroundColor: 'transparent',
    color: ON_NAVY_FG,
    ...shorthands.borderColor(withAlpha(ON_NAVY_FG, 0.7)),
    ':hover': { backgroundColor: withAlpha(ON_NAVY_FG, 0.1), color: ON_NAVY_FG, ...shorthands.borderColor(ON_NAVY_FG) },
    ':hover:active': { backgroundColor: withAlpha(ON_NAVY_FG, 0.16), color: ON_NAVY_FG, ...shorthands.borderColor(ON_NAVY_FG) },
  },
})

/** Navy marketing band with an Unsplash photo faded in on the right, in the style of the Figma landing hero. */
export function ProgramHero({
  eyebrow,
  title,
  children,
  imageId,
  alt,
  actions,
  headingLevel = 'h2',
}: {
  eyebrow: string
  title: string
  children?: ReactNode
  imageId: string
  alt: string
  actions?: ReactNode
  /** Render the title as the page h1 when the hero is the page header (no PageHeader above it). */
  headingLevel?: 'h1' | 'h2'
}) {
  const styles = useHeroStyles()
  return (
    <section className={mergeClasses('relative overflow-hidden mb-8', styles.hero)} style={ON_NAVY_VARS} aria-label={eyebrow}>
      <div className={styles.image} aria-hidden={alt === '' || undefined}>
        <ImageWithSkeleton src={UNSPLASH(imageId)} alt={alt} className={styles.imageFill} style={ON_NAVY_IMAGE_VARS} />
      </div>
      <div aria-hidden="true" className={mergeClasses('absolute inset-0 hidden md:block', styles.fade)} />
      <div aria-hidden="true" className={mergeClasses('absolute inset-0 md:hidden', styles.scrim)} />
      <div aria-hidden="true" className={mergeClasses('absolute', styles.glow)} />
      <div className="relative px-8 py-12 md:py-16 max-w-2xl">
        <div className="flex items-center gap-2.5 mb-5">
          <span aria-hidden="true" className={styles.rule} />
          <Body1Strong as="p" className={styles.eyebrow}>
            {eyebrow}
          </Body1Strong>
        </div>
        <Title1 as={headingLevel} className={styles.title}>
          {title}
        </Title1>
        {children && (
          <div className={styles.body}>{children}</div>
        )}
        {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  )
}

/** Small section title used between marketing blocks (h2 after the page h1). */
export function SectionTitle({ eyebrow, title, id }: { eyebrow?: string; title: string; id?: string }) {
  const styles = useHeroStyles()
  return (
    <div className="mb-4">
      {eyebrow && (
        <Caption1Strong as="p" className={styles.sectionEyebrow}>
          {eyebrow}
        </Caption1Strong>
      )}
      <Subtitle1 as="h2" id={id} className={styles.sectionTitle}>
        {title}
      </Subtitle1>
    </div>
  )
}

const useLinkCardStyles = makeStyles({
  card: {
    position: 'relative',
    height: '100%',
    rowGap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL),
    ':hover': { boxShadow: tokens.shadow8 },
    ':focus-within': { boxShadow: tokens.shadow8 },
  },
  icon: { color: tokens.colorBrandForeground1, fontSize: '24px', display: 'flex' },
  eyebrow: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  title: { display: 'block', margin: 0 },
  /** Stretches the heading link over the whole card so the card is a single click/tab target. */
  link: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    '::after': { content: '""', position: 'absolute', inset: 0 },
  },
  desc: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2, flexGrow: 1 },
  cta: { display: 'block', margin: 0, color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold },
})

/** Fluent Card whose heading link navigates client-side; the whole card is clickable. */
export function LinkCard({
  to,
  title,
  desc,
  eyebrow,
  cta,
  icon,
  headingLevel = 'h3',
  titleSize = 'md',
}: {
  to: string
  title: ReactNode
  desc: ReactNode
  eyebrow?: string
  cta?: string
  icon?: ReactElement
  headingLevel?: 'h2' | 'h3'
  titleSize?: 'md' | 'lg'
}) {
  const styles = useLinkCardStyles()
  const Heading = headingLevel
  return (
    <Card className={styles.card}>
      {icon && (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      )}
      {eyebrow && (
        <Caption1Strong as="p" className={styles.eyebrow}>
          {eyebrow}
        </Caption1Strong>
      )}
      <Heading className={styles.title} style={{ fontSize: titleSize === 'lg' ? tokens.fontSizeBase500 : tokens.fontSizeBase300, lineHeight: titleSize === 'lg' ? tokens.lineHeightBase500 : tokens.lineHeightBase300 }}>
        <AppLink to={to} className={styles.link}>
          {title}
        </AppLink>
      </Heading>
      <Body1 as="p" className={styles.desc}>
        {desc}
      </Body1>
      {cta && (
        <Body1 as="p" className={styles.cta} aria-hidden="true">
          {cta} →
        </Body1>
      )}
    </Card>
  )
}

export const PROGRAM_CRUMB = { label: 'Partner program', to: '/partner-program/' }

/** Program headline figures — shared wording for Home and Program home. */
export const PROGRAM_STATS = [
  { value: '4', label: 'Partner tiers' },
  { value: '180 days', label: 'Deal registration protection' },
  { value: APPLICATION_REVIEW_TIME, label: 'Typical application review (example)' },
  { value: 'Up to $50K', label: 'Co-marketing funds (Gold tier)' },
]
