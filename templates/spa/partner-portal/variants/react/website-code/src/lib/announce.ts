let region: HTMLElement | null = null
let clearTimer = 0

/**
 * Announces a short status ("Saving…") to screen readers through one shared, visually hidden polite live
 * region. It lives outside React so it is in the document before the text changes, as live regions require.
 */
export function announce(message: string) {
  if (typeof document === 'undefined') return
  if (!region?.isConnected) {
    region = document.createElement('div')
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', 'polite')
    region.dataset.announcer = ''
    region.className = 'sr-only'
    document.body.append(region)
  }
  const target = region
  window.clearTimeout(clearTimer)
  target.textContent = ''
  // A fresh text node after a tick makes repeated identical messages announce again.
  window.setTimeout(() => {
    target.textContent = message
  }, 50)
  clearTimer = window.setTimeout(() => {
    target.textContent = ''
  }, 5000)
}
