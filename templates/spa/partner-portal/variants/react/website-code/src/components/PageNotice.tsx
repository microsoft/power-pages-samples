import { useEffect, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { Button as FluentButton, MessageBar, MessageBarActions, MessageBarBody, MessageBarGroup, makeStyles, tokens } from '@fluentui/react-components'
import { Dismiss20Regular } from '@fluentui/react-icons'
import { useApp, useNotice, type Notice } from '../store/AppStore'
import { keepsNotice } from '../lib/notice'

const useStyles = makeStyles({
  // Same gutters as the page Container, so the message lines up with the breadcrumbs and heading below it. Sticks
  // under the sticky 56px app header so a notice raised from far down the page is still seen.
  region: {
    position: 'sticky',
    top: '56px',
    zIndex: 40,
    maxWidth: '1440px',
    marginInline: 'auto',
    paddingInline: tokens.spacingHorizontalXXL,
    pointerEvents: 'none',
  },
  bar: { marginTop: tokens.spacingVerticalXL, boxShadow: tokens.shadow8, pointerEvents: 'auto' },
  body: { fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300 },
  action: {
    fontWeight: tokens.fontWeightSemibold,
    '@media (pointer: coarse)': { minHeight: '44px', minWidth: '44px' },
  },
})

/** Which location the current notice belongs to; `key: null` means it expired when the user left that page. */
type Binding = { id: number; key: string | null }

/**
 * Tracks the notice across navigation: it belongs to the page it was raised on, follows a push/replace navigation
 * that asked to keep it (`KEEP_NOTICE`), and expires on any other navigation. Derived during render, so an expired
 * notice is never painted on the next page.
 */
function useVisibleNotice(): Notice | null {
  const notice = useNotice()
  const { dismissNotice } = useApp()
  const location = useLocation()
  const navigationType = useNavigationType()
  const [binding, setBinding] = useState<Binding | null>(null)

  let next = binding
  if (notice && binding?.id !== notice.id) next = { id: notice.id, key: location.key }
  else if (binding && binding.key !== null && binding.key !== location.key) {
    next = { id: binding.id, key: navigationType !== 'POP' && keepsNotice(location.state) ? location.key : null }
  }
  if (next !== binding) setBinding(next)

  const visible = notice && next?.id === notice.id && next.key === location.key ? notice : null

  // Release an expired notice so its action (e.g. an Undo closure) isn't kept alive.
  useEffect(() => {
    if (notice && !visible) dismissNotice(notice.id)
  }, [notice, visible, dismissNotice])

  return visible
}

/**
 * Page-level outcome message (Fluent MessageBar) shown above the routed page. Success/info messages are announced
 * politely, errors assertively; nothing auto-dismisses, so messages can be read at any pace (WCAG 2.2.1).
 */
export function PageNotice({ onDismissed }: { onDismissed: () => void }) {
  const styles = useStyles()
  const notice = useVisibleNotice()
  const { dismissNotice } = useApp()

  const dismiss = (n: Notice) => {
    dismissNotice(n.id)
    // The focused button is about to unmount; return focus to the page rather than <body>.
    onDismissed()
  }
  const runAction = (n: Notice) => {
    dismiss(n)
    n.action?.onClick()
  }

  const bar = (n: Notice) => (
    <MessageBar key={n.id} intent={n.tone} layout="auto" className={styles.bar} aria-labelledby={undefined}>
      <MessageBarBody className={styles.body}>{n.message}</MessageBarBody>
      <MessageBarActions
        containerAction={<FluentButton appearance="transparent" aria-label="Dismiss message" icon={<Dismiss20Regular />} onClick={() => dismiss(n)} />}
      >
        {n.action && (
          <FluentButton appearance="secondary" size="small" className={styles.action} onClick={() => runAction(n)}>
            {n.action.label}
          </FluentButton>
        )}
      </MessageBarActions>
    </MessageBar>
  )

  const polite = notice && notice.tone !== 'error' ? notice : null
  const assertive = notice?.tone === 'error' ? notice : null

  // Both live regions stay mounted so screen readers pick up a message as soon as it is inserted.
  return (
    <div className={styles.region}>
      <div role="status">
        <MessageBarGroup animate="both">{polite ? [bar(polite)] : []}</MessageBarGroup>
      </div>
      <div role="alert">
        <MessageBarGroup animate="both">{assertive ? [bar(assertive)] : []}</MessageBarGroup>
      </div>
    </div>
  )
}
