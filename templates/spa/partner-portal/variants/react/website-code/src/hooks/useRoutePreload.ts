import { useCallback, useEffect, useRef, type FocusEvent, type PointerEvent } from 'react'
import { preloadRoute } from '../lib/routeModules'

export function useRoutePreload() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancel = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
  }, [])
  useEffect(() => cancel, [cancel])

  return useCallback((to: string) => ({
    onPointerEnter(event: PointerEvent<HTMLElement>) {
      if (event.defaultPrevented || event.pointerType !== 'mouse') return
      cancel()
      timer.current = setTimeout(() => {
        timer.current = undefined
        void preloadRoute(to)
      }, 100)
    },
    onPointerLeave: cancel,
    onFocus(event: FocusEvent<HTMLElement>) {
      if (event.defaultPrevented) return
      cancel()
      void preloadRoute(to)
    },
    onBlur: cancel,
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.defaultPrevented || event.button !== 0 || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return
      cancel()
      void preloadRoute(to)
    },
  }), [cancel])
}
