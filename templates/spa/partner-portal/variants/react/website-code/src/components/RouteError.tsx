import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Body1, Button as FluentButton, Title2, makeStyles, mergeClasses, tokens } from '@fluentui/react-components'
import { ArrowClockwise20Regular, ErrorCircle48Regular, Home20Regular } from '@fluentui/react-icons'
import { Button, ButtonLink, usePageTitle } from './ui'
import { Container } from './Layout'

const useStyles = makeStyles({
  root: {
    maxWidth: '36rem',
    paddingTop: tokens.spacingVerticalXXXL,
    paddingBottom: tokens.spacingVerticalXXXL,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalM,
  },
  standalone: { marginInline: 'auto', paddingInline: tokens.spacingHorizontalXXL },
  icon: { color: tokens.colorPaletteRedForeground1 },
  title: { margin: 0 },
  text: { margin: 0, fontSize: tokens.fontSizeBase400, lineHeight: tokens.lineHeightBase400, color: tokens.colorNeutralForeground2 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalS },
})

/** A lazy route chunk that no longer exists (e.g. after a redeploy replaced the hashed bundles) or failed to download. */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return /dynamically imported module|module script failed|Loading chunk|Failed to fetch/i.test(message)
}

function describe(error: unknown): { title: string; message: string } {
  if (isChunkLoadError(error)) {
    return { title: 'This page couldn’t load', message: 'The portal may have been updated, or the connection dropped. Reload the page to try again.' }
  }
  if (isRouteErrorResponse(error) && error.status === 404) {
    return { title: 'Page not found', message: 'The page you are looking for does not exist or has been moved.' }
  }
  return { title: 'Something went wrong', message: 'An unexpected error stopped this page from loading. Reload the page, or go back to the home page.' }
}

function useReportError(error: unknown) {
  useEffect(() => {
    // Keeps the original error visible to developers and monitoring; the UI shows a safe summary.
    console.error('Route error:', error)
  }, [error])
}

/** Error boundary for routed screens: renders inside the shell, so navigation stays available. */
export function RouteError() {
  const error = useRouteError()
  const styles = useStyles()
  const { title, message } = describe(error)
  usePageTitle(title)
  useReportError(error)
  return (
    <Container>
      <div className={styles.root} role="alert">
        <ErrorCircle48Regular aria-hidden="true" className={styles.icon} />
        <Title2 as="h1" className={styles.title}>
          {title}
        </Title2>
        <Body1 as="p" className={styles.text}>
          {message}
        </Body1>
        <div className={styles.actions}>
          <Button variant="primary" icon={<ArrowClockwise20Regular />} onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <ButtonLink to="/" icon={<Home20Regular />}>
            Go to home
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}

/** Last-resort boundary when the shell itself fails; depends on nothing but the theme. */
export function RootError() {
  const error = useRouteError()
  const styles = useStyles()
  const { title, message } = describe(error)
  usePageTitle(title)
  useReportError(error)
  return (
    <main className={mergeClasses(styles.root, styles.standalone)} role="alert">
      <ErrorCircle48Regular aria-hidden="true" className={styles.icon} />
      <Title2 as="h1" className={styles.title}>
        {title}
      </Title2>
      <Body1 as="p" className={styles.text}>
        {message}
      </Body1>
      <div className={styles.actions}>
        <FluentButton appearance="primary" icon={<ArrowClockwise20Regular />} onClick={() => window.location.reload()}>
          Reload page
        </FluentButton>
        {/* A full page load resets any broken in-memory state. */}
        <FluentButton as="a" href="/" icon={<Home20Regular />}>
          Go to home
        </FluentButton>
      </div>
    </main>
  )
}
