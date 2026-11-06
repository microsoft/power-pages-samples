import { useLayoutEffect, useId, useRef, type ReactNode } from 'react'
import Icon from './Icon'

export default function Dialog({ open, onClose, title, children, id, eyebrow, actions, variant }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; id: string
  eyebrow?: string; actions?: ReactNode; variant?: 'drawer' | 'popover'
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !open) return
    const previous = document.activeElement
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [open])
  return <dialog ref={dialogRef} id={id} className={`modal${variant ? ` ${variant}` : ''}`} aria-labelledby={headingId} onClose={() => { if (open) onClose() }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0)
      const first = controls[0], last = controls[controls.length - 1]
      if (!controls.some(element => element === document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
    <div className="dialog-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={headingId} tabIndex={-1}>{title}</h2></div><div className="dialog-actions">{actions}<button type="button" className="icon-button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}><Icon name="close" /></button></div></div>
    <div className="dialog-body">{children}</div>
  </dialog>
}
