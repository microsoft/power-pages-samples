import { useEffect, useState } from 'react'

export interface BottomObstruction {
  /** Height (px) of visible bottom-anchored bars marked `data-fab-avoid` (e.g. a fixed save bar). */
  inset: number
  /** True while a modal surface (dialog, drawer) other than the assistant is open. */
  modalOpen: boolean
}

function measure(): BottomObstruction {
  const vh = window.innerHeight
  let inset = 0
  document.querySelectorAll<HTMLElement>('[data-fab-avoid]').forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.height > 0 && r.bottom >= vh - 1 && r.top < vh) inset = Math.max(inset, vh - r.top)
  })
  const modalOpen = !!document.querySelector('[role="dialog"][aria-modal="true"]:not([data-assistant-surface]), [role="alertdialog"]')
  return { inset: Math.round(inset), modalOpen }
}

/**
 * The floating assistant (FAB and chat window) sits above fixed bottom bars and steps aside for modal surfaces,
 * as Material 3 places FABs above bottom app bars and below dialogs.
 */
export function useBottomObstruction(): BottomObstruction {
  const [state, setState] = useState<BottomObstruction>({ inset: 0, modalOpen: false })
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = measure()
        setState(prev => (prev.inset === next.inset && prev.modalOpen === next.modalOpen ? prev : next))
      })
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fab-avoid', 'aria-modal', 'hidden'] })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
  return state
}
