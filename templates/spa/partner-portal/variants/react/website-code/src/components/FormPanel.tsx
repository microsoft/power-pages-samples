import { useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { Modal, useConfirmationButtonStyles } from './Modal'
import { Alert, Button } from './ui'
import { useUnsavedChanges } from './UnsavedChanges'
import { useBusyIndicator, usePendingAction } from '../hooks/usePendingAction'

interface FormPanelProps {
  open: boolean
  title: string
  children: ReactNode
  dirty: boolean
  onClose: () => void
  submitLabel: string
  submitIcon?: ReactElement
  destructive?: boolean
  /** Short "-ing" label on the submit button while the submission runs, e.g. "Saving…". */
  submitPendingLabel?: string
  /**
   * Call allowNavigation after validation when a successful submission navigates away. Return the save
   * promise: while it runs the submit button shows its pending state and the panel can't be closed.
   */
  onSubmit: (allowNavigation: () => void) => unknown
}

export function FormPanel(props: FormPanelProps) {
  // Keep the last open render while the side sheet animates out, so titles and content derived from
  // state the parent clears on close (e.g. the selected record) do not flicker during the exit motion.
  const [lastOpen, setLastOpen] = useState(props)
  if (props.open && lastOpen !== props) setLastOpen(props)
  return props.open ? <PanelView {...props} /> : <PanelView {...lastOpen} open={false} dirty={false} />
}

function PanelView({ open, title, children, dirty, onClose, onSubmit, submitLabel, submitIcon, destructive, submitPendingLabel }: FormPanelProps) {
  const formId = useId()
  const [confirming, setConfirming] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) setConfirming(false)
  }
  const keepActions = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const guard = useUnsavedChanges(open && dirty, title)
  const buttonStyles = useConfirmationButtonStyles()
  const { pending, run } = usePendingAction()
  const busy = useBusyIndicator(pending)

  const keepEditing = () => {
    setConfirming(false)
    requestAnimationFrame(() => {
      if (previousFocus.current?.isConnected) previousFocus.current.focus()
    })
  }
  const requestClose = () => {
    if (pending) return
    if (confirming) { keepEditing(); return }
    if (!dirty) { onClose(); return }
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setConfirming(true)
  }
  useEffect(() => {
    if (confirming) keepActions.current?.querySelector('button')?.focus()
  }, [confirming])

  return (
    <Modal open={open} title={title} presentation="panel" onClose={requestClose}
      footer={confirming ? (
        <div className="w-full space-y-3">
          <Alert tone="warning" title="Discard changes?">Your unsaved changes to {title} will be lost. Previously saved information will remain.</Alert>
          <div ref={keepActions} className="flex flex-wrap justify-end gap-2">
            <Button variant="primary" onClick={keepEditing}>Keep editing</Button>
            <Button variant="danger" className={buttonStyles.danger} onClick={onClose}>Discard changes</Button>
          </div>
        </div>
      ) : (
        <>
          <Button disabledFocusable={busy} onClick={requestClose}>Cancel</Button>
          <Button type="submit" form={formId} variant={destructive ? 'dangerPrimary' : 'primary'} icon={submitIcon} pending={pending} pendingLabel={submitPendingLabel}>{submitLabel}</Button>
        </>
      )}>
      <form id={formId} noValidate inert={confirming || !open} aria-busy={pending || undefined} onSubmit={event => {
        event.preventDefault()
        // Panels can be launched inside a page form; portal events must not submit that parent.
        event.stopPropagation()
        void run(() => onSubmit(guard.allowNavigation))
      }}>
        {children}
      </form>
    </Modal>
  )
}
