import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components'
import { BotSparkle16Regular, BotSparkle20Regular, BotSparkle24Regular } from '@fluentui/react-icons'

/**
 * The single Partner assistant identity used across the app: the BotSparkle icon, shown on the brand primary
 * (teal) with on-brand foreground wherever it appears as a mark (FAB, chat header/avatars, search suggestions).
 */
export function AssistantIcon({ size = 20 }: { size?: 16 | 20 | 24 }) {
  if (size === 16) return <BotSparkle16Regular />
  if (size === 24) return <BotSparkle24Regular />
  return <BotSparkle20Regular />
}

const useStyles = makeStyles({
  mark: {
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  s28: { width: '28px', height: '28px' },
  s32: { width: '32px', height: '32px' },
  s40: { width: '40px', height: '40px' },
  s48: { width: '48px', height: '48px' },
})

/** Circular assistant mark (decorative): brand primary background with the assistant icon. */
export function AssistantMark({ size = 32, className }: { size?: 28 | 32 | 40 | 48; className?: string }) {
  const s = useStyles()
  return (
    <span className={mergeClasses(s.mark, s[`s${size}`], className)} aria-hidden="true">
      <AssistantIcon size={size >= 48 ? 24 : size >= 32 ? 20 : 16} />
    </span>
  )
}
