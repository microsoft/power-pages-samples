import { Body1, Body1Strong, Title2, makeStyles, tokens } from '@fluentui/react-components'
import { DocumentSearch24Regular, Home20Regular, Map20Regular } from '@fluentui/react-icons'
import { Container } from '../components/Layout'
import { AppLink, ButtonLink, usePageTitle } from '../components/ui'

const useStyles = makeStyles({
  icon: { display: 'inline-flex', color: tokens.colorNeutralForeground3, fontSize: '48px' },
  code: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalM, color: tokens.colorNeutralForeground2 },
  title: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalS, color: tokens.colorNeutralForeground1 },
  body: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalS, fontSize: tokens.fontSizeBase400, lineHeight: tokens.lineHeightBase400, color: tokens.colorNeutralForeground1 },
  help: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalXL, color: tokens.colorNeutralForeground2 },
})

export default function NotFound() {
  usePageTitle('Page Not Found')
  const styles = useStyles()
  return (
    <Container>
      <div className="max-w-xl py-16">
        <span aria-hidden="true" className={styles.icon}>
          <DocumentSearch24Regular fontSize={48} />
        </span>
        <Body1Strong as="p" className={styles.code}>
          Error 404
        </Body1Strong>
        <Title2 as="h1" className={styles.title}>
          Page not found
        </Title2>
        <Body1 as="p" className={styles.body}>
          The page you are looking for does not exist or has been moved.
        </Body1>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink to="/" variant="primary" icon={<Home20Regular />}>
            Go to Home
          </ButtonLink>
          <ButtonLink to="/sitemap/" icon={<Map20Regular />}>
            View sitemap
          </ButtonLink>
        </div>
        <Body1 as="p" className={styles.help}>
          Looking for help? Try the{' '}
          <AppLink to="/partner-program/partner-program-FAQs/" inline>
            frequently asked questions
          </AppLink>
          .
        </Body1>
      </div>
    </Container>
  )
}
