import { useState } from 'react'
import { useApp } from '../../store/AppStore'
import type { Account } from '../../data/types'
import { setAccountActive } from '../../services/actions'
import { usePendingAction } from '../../hooks/usePendingAction'

/**
 * Deactivate (confirm + Undo notify; live: no Undo) / activate (immediate + notify) for customer accounts.
 * Returns the action and confirmation state; presentation is owned by AccountStatusDialog.
 * `refresh` re-runs the caller's loader after a live write. One status change runs at a time; `pendingId`
 * is the account it is changing.
 */
export function useAccountStatus(refresh?: () => Promise<unknown> | void) {
  const { mode, perform, notify } = useApp()
  const [pending, setPending] = useState<Account | null>(null)
  const action = usePendingAction()

  const setActive = (id: string, active: boolean) =>
    perform({
      mock: d => {
        const acc = d.accounts.find(x => x.id === id)
        if (acc) acc.active = active
      },
      live: () => setAccountActive(id, active),
      refresh,
    })

  const activate = (a: Account) =>
    action.run(async () => {
      if (await setActive(a.id, true)) notify(`${a.name} activated.`)
    }, a.id)

  const deactivate = (a: Account) =>
    action.run(async () => {
      if (!(await setActive(a.id, false))) return
      if (mode === 'live') {
        notify(`${a.name} deactivated.`)
        return
      }
      notify(`${a.name} deactivated.`, 'success', {
        action: {
          label: 'Undo',
          onClick: () => {
            void setActive(a.id, true)
            notify(`${a.name} is active again.`)
          },
        },
      })
    }, a.id)

  const change = (a: Account) => {
    if (action.pending) return
    if (a.active) setPending(a)
    else void activate(a)
  }

  return {
    change,
    pending,
    /** Account whose status change is running. */
    pendingId: action.pendingKey,
    confirm: () => (pending ? deactivate(pending) : undefined),
    cancel: () => setPending(null),
  }
}
