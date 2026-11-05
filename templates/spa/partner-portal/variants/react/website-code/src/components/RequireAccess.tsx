import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Body1, Title2, makeStyles, tokens } from '@fluentui/react-components'
import { Home20Regular, LockClosed48Regular } from '@fluentui/react-icons'
import { useApp } from '../store/AppStore'
import { can, type Capability } from '../lib/access'
import { ButtonLink, usePageTitle } from './ui'
import { Container } from './Layout'
import { PageSkeleton, skeletonVariantForPath } from './skeletons'

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
  icon: { color: tokens.colorNeutralForeground3 },
  title: { margin: 0 },
  text: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    color: tokens.colorNeutralForeground2,
  },
  action: { marginTop: tokens.spacingVerticalS },
})

export function AccessDeniedContent() {
  usePageTitle('Access denied')
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <LockClosed48Regular aria-hidden="true" className={styles.icon} />
      <Title2 as="h1" className={styles.title}>
        Access denied
      </Title2>
      <Body1 as="p" className={styles.text}>
        You don&apos;t have access to this page. Ask your Partner Admin if you need access.
      </Body1>
      <div className={styles.action}>
        <ButtonLink to="/" variant="primary" icon={<Home20Regular />}>
          Go to home
        </ButtonLink>
      </div>
    </div>
  )
}

/**
 * Route gate: anonymous users are sent to /login?ReturnUrl=…; signed-in users without the
 * capability get the in-place Access Denied view. Protected data never renders first.
 */
export function RequireAccess({ cap, children }: { cap: Capability; children: ReactNode }) {
  const { session, sessionReady } = useApp()
  const location = useLocation()
  // Live mode: the signed-in contact and web roles are still loading; never redirect before we know.
  if (!sessionReady) return <PageSkeleton variant={skeletonVariantForPath(location.pathname, true)} />
  if (session.role === 'anonymous') {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?ReturnUrl=${returnUrl}`} replace />
  }
  if (!can(session.role, cap))
    return (
      <Container>
        <AccessDeniedContent />
      </Container>
    )
  return <>{children}</>
}
