import { useEffect, useState, useRef, useCallback } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  onClose: () => void
  duration?: number
  variant?: 'success' | 'error'
}

export default function Toast({ message, onClose, duration = 4000, variant = 'success' }: ToastProps) {
  const [closing, setClosing] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const startClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onCloseRef.current(), 300)
  }, [])

  useEffect(() => {
    const timer = setTimeout(startClose, duration)
    return () => clearTimeout(timer)
  }, [duration, startClose])

  const Icon = variant === 'error' ? XCircle : CheckCircle

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast${closing ? ' toast-exit' : ''}${variant === 'error' ? ' toast-error' : ''}`}
    >
      <Icon size={18} aria-hidden="true" />
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={startClose}
        aria-label="Dismiss notification"
        className="toast-dismiss"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
