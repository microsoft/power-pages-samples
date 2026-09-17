// src/hooks/useSendReviewerReminder.ts
// React hook wrapping the "Send an email notification" cloud-flow trigger so
// components get loading + error state without repeating try/catch boilerplate.

import { useCallback, useRef, useState } from 'react'
import {
  sendEmailNotification,
  CloudFlowError,
  type SendEmailNotificationPayload,
} from '../services/cloudFlowService'

export interface UseSendReviewerReminderResult {
  isSending: boolean
  error: string | null
  lastSentAt: Date | null
  send: (payload: SendEmailNotificationPayload) => Promise<boolean>
  reset: () => void
}

export function useSendReviewerReminder(): UseSendReviewerReminderResult {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null)
  const inFlightRef = useRef(false)

  const send = useCallback(
    async (payload: SendEmailNotificationPayload): Promise<boolean> => {
      // Debounce duplicate clicks — the flow is fire-and-forget so two calls in
      // quick succession would email the reviewer twice.
      if (inFlightRef.current) return false
      inFlightRef.current = true
      setIsSending(true)
      setError(null)
      try {
        await sendEmailNotification(payload)
        setLastSentAt(new Date())
        return true
      } catch (err) {
        if (err instanceof CloudFlowError) {
          setError(
            err.status === 403
              ? 'You are not authorised to send this reminder.'
              : `Couldn't send reminder: ${err.message}`,
          )
        } else {
          setError(err instanceof Error ? err.message : 'Failed to send reminder.')
        }
        return false
      } finally {
        inFlightRef.current = false
        setIsSending(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setError(null)
    setLastSentAt(null)
  }, [])

  return { isSending, error, lastSentAt, send, reset }
}
