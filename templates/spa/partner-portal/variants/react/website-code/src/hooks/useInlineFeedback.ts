import { useCallback, useState } from 'react'

export type InlineFeedbackTone = 'success' | 'info' | 'error'

export interface InlineFeedbackAction {
  label: string
  onClick: () => void
}

export interface InlineFeedbackMessage {
  id: number
  message: string
  tone: InlineFeedbackTone
  action?: InlineFeedbackAction
}

export interface InlineFeedbackOptions {
  action?: InlineFeedbackAction
  /** The watched value this message describes, when the caller has just changed it (defaults to the current value). */
  watch?: unknown
}

export interface InlineFeedback {
  /** The message to render, or null when there is none (or it went stale). */
  feedback: InlineFeedbackMessage | null
  show: (message: string, tone?: InlineFeedbackTone, options?: InlineFeedbackOptions) => void
  clear: () => void
}

let lastId = 0
const snapshotOf = (value: unknown) => (value === undefined ? '' : JSON.stringify(value))

/**
 * Feedback shown next to the control or section that caused it (e.g. "Saved" beside a Save button), rendered with
 * `<InlineFeedback>`. Pass the form value as `watch` and the message disappears as soon as the user edits again,
 * so a "Saved" confirmation never describes values that are no longer saved.
 */
export function useInlineFeedback(watch?: unknown): InlineFeedback {
  const snapshot = snapshotOf(watch)
  const [state, setState] = useState<{ feedback: InlineFeedbackMessage; snapshot: string } | null>(null)

  const show = useCallback(
    (message: string, tone: InlineFeedbackTone = 'success', options: InlineFeedbackOptions = {}) =>
      setState({
        feedback: { id: ++lastId, message, tone, action: options.action },
        snapshot: 'watch' in options ? snapshotOf(options.watch) : snapshot,
      }),
    [snapshot],
  )
  const clear = useCallback(() => setState(null), [])

  return { feedback: state && state.snapshot === snapshot ? state.feedback : null, show, clear }
}
