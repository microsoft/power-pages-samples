import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface ActionDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  noteRequired?: boolean
  notePlaceholder?: string
  onConfirm: (note: string) => Promise<void> | void
  onCancel: () => void
}

export default function ActionDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  noteRequired = false,
  notePlaceholder = 'Add a note (optional)...',
  onConfirm,
  onCancel,
}: ActionDialogProps) {
  const [note, setNote] = useState('')
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
      setVisible(true)
      setClosing(false)
      setIsLoading(false)
      setNote('')
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  const restoreFocus = useCallback(() => {
    const previousFocus = previousFocusRef.current
    previousFocusRef.current = null
    requestAnimationFrame(() => previousFocus?.focus())
  }, [])

  const startClose = useCallback(() => {
    if (isLoading) return // Prevent closing while processing
    setClosing(true)
    setTimeout(() => {
      setVisible(false)
      setClosing(false)
      onCancel()
      restoreFocus()
    }, 150)
  }, [onCancel, isLoading, restoreFocus])

  // Close on Escape + focus trap
  useEffect(() => {
    if (!visible) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { startClose(); return }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [visible, startClose])

  if (!visible) return null

  const canConfirm = !isLoading && (!noteRequired || note.trim().length > 0)

  async function handleConfirm() {
    if (!canConfirm) return
    setIsLoading(true)
    try {
      await onConfirm(note.trim())
      restoreFocus()
      // onConfirm succeeded -- close the dialog
      setClosing(true)
      setTimeout(() => {
        setVisible(false)
        setClosing(false)
        setIsLoading(false)
      }, 150)
    } catch {
      // onConfirm failed -- keep dialog open so user can retry
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={startClose}
        aria-hidden="true"
        className={closing ? 'dialog-backdrop-exit' : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26, 43, 30, 0.5)',
          animation: closing ? undefined : 'fadeIn 0.15s ease-out',
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        aria-describedby="action-dialog-description"
        className={closing ? 'dialog-exit' : undefined}
        style={{
          position: 'relative',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
          width: '100%',
          maxWidth: 440,
          animation: closing ? undefined : 'scaleIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h3
            id="action-dialog-title"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.05rem',
              fontWeight: 600,
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={startClose}
            disabled={isLoading}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              padding: 4,
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p id="action-dialog-description" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            {description}
          </p>

          <label
            htmlFor="action-note"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Note {noteRequired ? <span style={{ color: 'var(--color-error)' }}>*</span> : '(optional)'}
          </label>
          <textarea
            ref={textareaRef}
            id="action-note"
            rows={3}
            placeholder={notePlaceholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isLoading}
            aria-required={noteRequired}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-body)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              resize: 'vertical',
              opacity: isLoading ? 0.6 : 1,
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={startClose}
            disabled={isLoading}
            className="btn-outline-sm"
            style={{ opacity: isLoading ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary-sm'}
            style={{
              opacity: canConfirm ? 1 : 0.5,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading && <span className="btn-spinner" aria-hidden="true" />}
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
