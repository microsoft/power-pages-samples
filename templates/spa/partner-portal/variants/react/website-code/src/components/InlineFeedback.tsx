import { Link, makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components'
import { CheckmarkCircle16Filled, ErrorCircle16Filled, Info16Filled } from '@fluentui/react-icons'
import type { InlineFeedbackMessage, InlineFeedbackTone } from '../hooks/useInlineFeedback'

const useStyles = makeStyles({
  region: { display: 'inline-flex', minWidth: 0 },
  message: { display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', columnGap: tokens.spacingHorizontalS, rowGap: tokens.spacingVerticalXXS },
  text: { display: 'inline-flex', alignItems: 'flex-start', gap: tokens.spacingHorizontalXS, color: tokens.colorNeutralForeground1 },
  icon: { flexShrink: 0, marginTop: '2px' },
  success: { color: tokens.colorStatusSuccessForeground1 },
  info: { color: tokens.colorNeutralForeground3 },
  error: { color: tokens.colorStatusDangerForeground1 },
  action: {
    fontWeight: tokens.fontWeightSemibold,
    '@media (pointer: coarse)': { minHeight: '44px', minWidth: '44px' },
  },
  enter: {
    animationName: { from: { opacity: 0, transform: 'translateY(2px)' }, to: { opacity: 1, transform: 'none' } },
    animationDuration: tokens.durationNormal,
    animationTimingFunction: tokens.curveDecelerateMid,
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
})

const ICONS: Record<InlineFeedbackTone, typeof CheckmarkCircle16Filled> = {
  success: CheckmarkCircle16Filled,
  info: Info16Filled,
  error: ErrorCircle16Filled,
}

/**
 * Renders `useInlineFeedback()` output beside the control or section it describes. The live region is always
 * mounted so each new message is announced; an optional action (e.g. Undo) follows the text.
 */
export function InlineFeedback({ feedback, className }: { feedback: InlineFeedbackMessage | null; className?: string }) {
  const styles = useStyles()
  const Icon = feedback ? ICONS[feedback.tone] : null
  return (
    <div role="status" className={mergeClasses(styles.region, className)}>
      {feedback && Icon && (
        <span key={feedback.id} className={mergeClasses(styles.message, styles.enter)}>
          <Text size={300} className={styles.text}>
            <Icon aria-hidden="true" className={mergeClasses(styles.icon, styles[feedback.tone])} />
            <span>{feedback.message}</span>
          </Text>
          {feedback.action && (
            <Link as="button" className={styles.action} onClick={feedback.action.onClick}>
              {feedback.action.label}
            </Link>
          )}
        </span>
      )}
    </div>
  )
}
