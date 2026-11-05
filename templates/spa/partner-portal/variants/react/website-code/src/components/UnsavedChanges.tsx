import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router-dom'
import { Modal, useConfirmationButtonStyles } from './Modal'
import { Button } from './ui'
import { GuardContext, type DraftGuard } from './UnsavedChangesContext'

/** One router blocker coordinates page and panel drafts; React Router supports only one active blocker. */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [guards] = useState(() => new Map<symbol, DraftGuard>())
  const hasChanges = () => [...guards.values()].some(guard => guard.isDirty())
  const blocker = useBlocker(hasChanges)
  const descriptionId = useId()
  const buttonStyles = useConfirmationButtonStyles()
  const labels = [...new Set([...guards.values()].filter(guard => guard.isDirty()).map(guard => guard.label()))]

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (![...guards.values()].some(guard => guard.isDirty())) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [guards])

  return (
    <GuardContext.Provider value={guards}>
      {children}
      <Modal
        open={blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        size="sm"
        descriptionId={descriptionId}
        onClose={() => { if (blocker.state === 'blocked') blocker.reset() }}
        footer={<>
          <Button variant="primary" onClick={() => { if (blocker.state === 'blocked') blocker.reset() }}>Keep editing</Button>
          <Button variant="danger" className={buttonStyles.danger} onClick={() => { if (blocker.state === 'blocked') blocker.proceed() }}>Discard changes</Button>
        </>}
      >
        <div id={descriptionId}>
          <p>You have unsaved changes in:</p>
          <ul className="list-disc ps-5 my-2">
            {labels.map(label => <li key={label}>{label}</li>)}
          </ul>
          <p>Leaving will discard these changes. Previously saved information will remain.</p>
        </div>
      </Modal>
    </GuardContext.Provider>
  )
}

export function useUnsavedChanges(when: boolean, label: string) {
  const guards = useContext(GuardContext)
  if (!guards) throw new Error('UnsavedChangesProvider is required for draft protection.')
  const key = useRef(Symbol('draft'))
  const dirty = useRef(when)
  const labelRef = useRef(label)
  const bypass = useRef(false)
  // The router blocker reads these at navigation time; sync after commit (refs must not be written during render).
  useLayoutEffect(() => {
    dirty.current = when
    labelRef.current = label
  })
  useEffect(() => { bypass.current = false }, [when])
  useEffect(() => {
    const id = key.current
    guards.set(id, { isDirty: () => dirty.current && !bypass.current, label: () => labelRef.current })
    return () => { guards.delete(id) }
  }, [guards])
  return {
    allowNavigation: () => { bypass.current = true },
    // Retain the existing hook API; the coordinator now renders the single navigation confirmation.
    dialog: null,
  }
}

/** Tracks only an in-memory snapshot; never persists drafts or credentials in browser storage. */
export function useFormGuard(value: unknown, label: string, enabled = true) {
  const snapshot = JSON.stringify(value)
  const [saved, setSaved] = useState(snapshot)
  const guard = useUnsavedChanges(enabled && snapshot !== saved, label)
  return {
    dialog: guard.dialog,
    markSaved: () => {
      setSaved(snapshot)
      guard.allowNavigation()
    },
  }
}
