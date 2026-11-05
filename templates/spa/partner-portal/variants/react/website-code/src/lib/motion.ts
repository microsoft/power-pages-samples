import { createPresenceComponent, type AtomMotion } from '@fluentui/react-components'

/**
 * Material Design 3 motion tokens as published for the web (Material Web `md.sys.motion.*`).
 * On the web M3 approximates its emphasized path with cubic-bezier(0.2, 0, 0, 1): a soft start and a long
 * deceleration. It is used for both enter and exit here. The steeper emphasized-decelerate/-accelerate pair
 * jumped ~40% of the distance in the first frame on enter and barely moved for ~50ms on exit, which read as a
 * pop on open and lag on close.
 */
export const M3_EASING = {
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
} as const

/** Enters are at most 300ms; exits are shorter so a dismissed surface never holds up the next task. */
export const M3_DURATION = {
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
} as const

const isRtl = (element: HTMLElement) => getComputedStyle(element).direction === 'rtl'
const isCompact = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639.98px)').matches

const fade = (direction: 'enter' | 'exit', duration: number, delay = 0): AtomMotion => ({
  keyframes: direction === 'enter' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
  duration,
  delay,
  easing: M3_EASING.standard,
  fill: 'both',
})

const transform = (from: string, to: string, duration: number, transformOrigin?: string): AtomMotion => ({
  keyframes: transformOrigin
    ? [{ transform: from, transformOrigin }, { transform: to, transformOrigin }]
    : [{ transform: from }, { transform: to }],
  duration,
  easing: M3_EASING.emphasized,
  fill: 'both',
})

const SHEET = { enter: M3_DURATION.medium2, exit: M3_DURATION.short4 }
const DIALOG = { enter: M3_DURATION.medium1, exit: M3_DURATION.short3 }

/**
 * Side sheet: slides in from the inline-end edge it is attached to; full-screen on compact windows, where it
 * rises from the bottom like an M3 full-screen dialog. Fluent applies a 1ms duration for reduced motion.
 */
export const SideSheetMotion = createPresenceComponent(({ element }) => {
  const out = isCompact() ? 'translateY(100%)' : `translateX(${isRtl(element) ? '-100%' : '100%'})`
  return {
    enter: transform(out, 'none', SHEET.enter),
    exit: transform('none', out, SHEET.exit),
  }
})

/** Scrims fade in step with their surface, so the page never dims after (or brightens before) the surface. */
export const SideSheetScrimMotion = createPresenceComponent(() => ({
  enter: fade('enter', SHEET.enter),
  exit: fade('exit', SHEET.exit),
}))

export const DialogScrimMotion = createPresenceComponent(() => ({
  enter: fade('enter', DIALOG.enter),
  exit: fade('exit', DIALOG.exit),
}))

/** Basic (centered) dialog: quick fade with a slight grow on enter; fade-only, faster exit. */
export const DialogMotion = createPresenceComponent(() => ({
  enter: [fade('enter', M3_DURATION.short3), transform('scale(0.95)', 'none', DIALOG.enter)],
  exit: fade('exit', DIALOG.exit),
}))

/**
 * Floating chat window. It grows out of the FAB corner and shrinks back into it on Close. When expanding to
 * full screen it stays mounted and fades out, growing slightly, underneath the incoming full-screen surface,
 * so there is never a frame where neither surface is visible.
 */
export const ChatWindowMotion = createPresenceComponent<{ exitTo: string }>(({ element, exitTo }) => {
  const origin = isRtl(element) ? 'left bottom' : 'right bottom'
  return {
    enter: [fade('enter', M3_DURATION.short3), transform('scale(0.85)', 'none', M3_DURATION.medium1, origin)],
    exit: exitTo === 'full'
      ? [fade('exit', M3_DURATION.short4), transform('none', 'scale(1.04)', M3_DURATION.short4, origin)]
      : [fade('exit', M3_DURATION.short3), transform('none', 'scale(0.85)', M3_DURATION.short4, origin)],
  }
})

/**
 * Full-screen chat. From the floating window it expands out of the bottom-end corner (container transform);
 * from search it rises along the Y axis (shared axis). Exit is a quick fade so the next surface leads.
 */
export const ChatFullScreenMotion = createPresenceComponent<{ origin: string }>(({ element, origin }) => {
  const fromWindow = origin === 'panel'
  const transformOrigin = fromWindow ? (isRtl(element) ? 'left bottom' : 'right bottom') : 'center top'
  return {
    enter: [
      fade('enter', M3_DURATION.short4),
      transform(fromWindow ? 'scale(0.92)' : 'translateY(16px)', 'none', M3_DURATION.medium2, transformOrigin),
    ],
    exit: fade('exit', M3_DURATION.short3),
  }
})
