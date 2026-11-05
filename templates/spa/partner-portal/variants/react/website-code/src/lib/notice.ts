import type { NavigateOptions } from 'react-router-dom'

/**
 * Navigation options for a redirect that follows an outcome (e.g. "Account created" → edit page): the current page
 * notice is carried to the destination instead of being cleared. Back/Forward never carry a notice.
 */
export const KEEP_NOTICE: NavigateOptions = { state: { keepNotice: true } }

export function keepsNotice(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { keepNotice?: unknown }).keepNotice === true
}
