import type { ReactNode } from 'react'
import { Body1Strong, Caption1, Text, makeStyles, tokens } from '@fluentui/react-components'
import { Alert, AppLink, StatusBadge } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { daysUntil } from './oppUtils'

const useStyles = makeStyles({
  daysLeft: { color: tokens.colorNeutralForeground2 },
  numeric: { fontVariantNumeric: 'tabular-nums' },
})

/** Explains why an opportunity can't be shown and offers a way back. */
export function NoAccess({
  backTo,
  backLabel,
  title = "You can't view this opportunity",
  message = "It may have been removed, or it isn't shared with your organization. Ask your partner admin if you need access.",
}: {
  backTo: string
  backLabel: string
  title?: string
  message?: ReactNode
}) {
  return (
    <Alert tone="info" title={title}>
      <p>{message}</p>
      <p className="mt-2">
        <AppLink to={backTo} inline>
          {backLabel}
        </AppLink>
      </p>
    </Alert>
  )
}

/** Respond-by date; highlights opportunities expiring within 3 days. */
export function ExpiryCell({ date }: { date?: string }) {
  const styles = useStyles()
  const days = daysUntil(date)
  if (!date || days === undefined) return <span>—</span>
  if (days < 0)
    return (
      <span className="inline-flex flex-col gap-1">
        <span>{formatDate(date)}</span>
        <StatusBadge status="Past due" tone="red" />
      </span>
    )
  if (days <= 3)
    return (
      <span className="inline-flex flex-col gap-1">
        <Body1Strong>{formatDate(date)}</Body1Strong>
        <StatusBadge status={days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`} tone="amber" />
      </span>
    )
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span>{formatDate(date)}</span>
      <Caption1 className={styles.daysLeft}>{days} days left</Caption1>
    </span>
  )
}

/** Tabular figures for currency/quantity cells so columns of numbers align. */
export function Numeric({ children, strong }: { children: ReactNode; strong?: boolean }) {
  const styles = useStyles()
  return (
    <Text weight={strong ? 'semibold' : undefined} className={styles.numeric}>
      {children}
    </Text>
  )
}
