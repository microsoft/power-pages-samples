import { useState, useCallback } from 'react'

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)

  const show = useCallback((msg: string) => {
    setMessage(msg)
  }, [])

  const dismiss = useCallback(() => {
    setMessage(null)
  }, [])

  return { message, show, dismiss }
}
