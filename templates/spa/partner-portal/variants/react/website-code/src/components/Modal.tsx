import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  Button as FluentButton,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { Dismiss24Regular } from '@fluentui/react-icons'
import { Button } from './ui'
import { useBusyIndicator, usePendingAction } from '../hooks/usePendingAction'
import { DialogMotion, DialogScrimMotion, SideSheetMotion, SideSheetScrimMotion } from '../lib/motion'

const useStyles = makeStyles({
  surface: { maxWidth: '100%' },
  sm: { width: '440px' },
  md: { width: '600px' },
  lg: { width: '820px' },
  compact: {
    display: 'flex',
    flexDirection: 'column',
    '&.fui-DialogSurface': { maxWidth: 'calc(100vw - 32px)' },
    maxHeight: 'calc(100dvh - 32px)',
    overflow: 'hidden',
  },
  compactBody: { position: 'relative', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, maxHeight: 'none', gap: '16px' },
  compactHeader: { flexShrink: 0, minHeight: '48px', paddingTop: '8px', paddingInlineEnd: '56px', overflowWrap: 'anywhere' },
  compactClose: { position: 'absolute', top: 0, insetInlineEnd: 0 },
  closeButton: { minWidth: '48px', minHeight: '48px' },
  content: {
    flex: '1 1 auto', minHeight: 0, maxHeight: 'none', margin: 0, padding: 0,
    overflowY: 'auto', overflowWrap: 'anywhere', overscrollBehavior: 'contain',
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  compactFooter: {
    flexShrink: 0,
    display: 'flex',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    width: '100%',
    justifyContent: 'flex-end',
    gap: '12px',
    '& > .fui-Button': { flex: '0 0 auto', minHeight: '48px', maxWidth: '100%', whiteSpace: 'nowrap' },
    '@media (max-width: 479.98px)': {
      flexDirection: 'column',
      '& > .fui-Button': { width: '100%', whiteSpace: 'normal' },
    },
  },
  message: { color: tokens.colorNeutralForeground2, overflowWrap: 'anywhere' },
  panel: {
    position: 'fixed',
    top: 'var(--form-panel-top, 0px)',
    insetInlineEnd: 0,
    bottom: 'auto',
    insetInlineStart: 'auto',
    margin: 0,
    padding: 0,
    width: '560px',
    maxWidth: '100vw',
    height: 'var(--form-panel-height, 100dvh)',
    maxHeight: 'none',
    borderRadius: 0,
    overflow: 'hidden',
    '@media (max-width: 639.98px)': { width: '100vw' },
  },
  panelBody: { position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'none', minHeight: 0, gap: 0 },
  panelHeader: {
    flexShrink: 0,
    paddingTop: 'max(24px, env(safe-area-inset-top))',
    paddingInlineEnd: '80px',
    paddingBottom: '24px',
    paddingInlineStart: '24px',
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  panelClose: { position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', insetInlineEnd: '16px' },
  panelContent: {
    flex: '1 1 auto',
    minHeight: 0,
    maxHeight: 'none',
    margin: 0,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    padding: '24px',
    scrollPaddingTop: '16px',
    scrollPaddingBottom: '16px',
  },
  panelFooter: {
    flexShrink: 0,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
    padding: '16px 24px max(16px, env(safe-area-inset-bottom))',
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    '@media (max-width: 639.98px)': { '& > button': { flex: '1 1 auto' } },
  },
})

/** Strong outlines are scoped to confirmation choices, not all page buttons. */
export const useConfirmationButtonStyles = makeStyles({
  secondary: {
    ...shorthands.borderColor(tokens.colorNeutralStrokeAccessible),
    ':hover': { ...shorthands.borderColor(tokens.colorNeutralStrokeAccessible) },
    ':active': { ...shorthands.borderColor(tokens.colorNeutralStrokeAccessible) },
  },
  danger: {
    ...shorthands.borderColor(tokens.colorPaletteRedForeground1),
    ':hover': { ...shorthands.borderColor(tokens.colorPaletteRedForeground1) },
    ':active': { ...shorthands.borderColor(tokens.colorPaletteRedForeground1) },
  },
})

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  presentation = 'dialog',
  descriptionId,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** FormPanel owns the responsive form contract; ordinary confirmations retain the default dialog. */
  presentation?: 'dialog' | 'panel'
  /** Associate only concise consequence/intro text, not a complex form's entire contents. */
  descriptionId?: string
}) {
  const styles = useStyles()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentOverflows, setContentOverflows] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const isPanel = presentation === 'panel'

  useEffect(() => {
    if (!open || isPanel) return
    const content = contentRef.current
    if (!content) return
    const update = () => setContentOverflows(content.scrollHeight > content.clientHeight + 1)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(content)
    if (content.firstElementChild) observer.observe(content.firstElementChild)
    return () => observer.disconnect()
  }, [open, isPanel])

  useEffect(() => {
    if (!open || !isPanel || !window.visualViewport) return
    const viewport = window.visualViewport
    const update = () => {
      if (viewport.scale !== 1) return
      surfaceRef.current?.style.setProperty('--form-panel-height', `${viewport.height}px`)
      surfaceRef.current?.style.setProperty('--form-panel-top', `${viewport.offsetTop}px`)
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [open, isPanel])

  // Dialogs here are opened programmatically (no DialogTrigger), so remember the opener for focus restore.
  // Layout effects run before Fluent moves focus into the surface (a passive effect), so the opener is still active.
  useLayoutEffect(() => {
    if (!open) return
    const active = document.activeElement
    if (active instanceof HTMLElement && !surfaceRef.current?.contains(active)) {
      const menuTrigger = active.closest('[role="menu"]')
        ? document.querySelector<HTMLElement>('[aria-haspopup="menu"][aria-expanded="true"]')
        : null
      returnFocus.current = menuTrigger ?? active
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const surface = surfaceRef.current
    return () => {
      const target = returnFocus.current
      // Keep the opener through StrictMode's setup/cleanup replay.
      // Wait for the exit transition to unmount the surface, then restore focus if it fell back to <body>.
      let tries = 0
      const restore = () => {
        if (surface?.isConnected && surface.getClientRects().length) {
          if (++tries < 40) window.setTimeout(restore, 25)
          return
        }
        // A navigation confirmation can sit above a form panel. Reactivate that panel, not its page.
        const panel = document.querySelector<HTMLElement>('[data-form-panel]')
        if (panel && panel !== surface && panel.getClientRects().length) {
          const next = target && panel.contains(target) ? target
            : panel.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])') ?? panel
          next.focus()
          return
        }
        const active = document.activeElement
        const inDialog = active instanceof HTMLElement && !!active.closest('.fui-DialogSurface')
        if (!target?.isConnected || (active && active !== document.body && !inDialog && document.contains(active))) return
        if (!inDialog) target.focus()
        else if (++tries < 40) window.setTimeout(restore, 25)
      }
      window.setTimeout(restore, 0)
    }
  }, [open])

  // Match the previous behaviour: initial focus goes to the first field/button rather than the title close button.
  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => {
      const target = surfaceRef.current?.querySelector<HTMLElement>(
        '[data-modal-body] :is(input, select, textarea, button):not([disabled]), [data-modal-footer] button:not([disabled])',
      )
      target?.focus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => !data.open && onClose()}
      surfaceMotion={{ children: (_, motion) => (isPanel ? <SideSheetMotion {...motion} /> : <DialogMotion {...motion} />) }}
    >
      <DialogSurface
        ref={surfaceRef}
        aria-describedby={descriptionId}
        data-form-panel={isPanel ? '' : undefined}
        backdropMotion={{ children: (_, motion) => (isPanel ? <SideSheetScrimMotion {...motion} /> : <DialogScrimMotion {...motion} />) }}
        className={mergeClasses(styles.surface, !isPanel && styles[size], isPanel ? styles.panel : styles.compact)}
      >
        <DialogBody className={isPanel ? styles.panelBody : styles.compactBody}>
          <DialogTitle
            className={isPanel ? styles.panelHeader : styles.compactHeader}
            action={{
              className: isPanel ? styles.panelClose : styles.compactClose,
              children: <FluentButton appearance="subtle" icon={<Dismiss24Regular />} aria-label="Close" className={!isPanel ? styles.closeButton : undefined} onClick={onClose} />,
            }}
          >
            {title}
          </DialogTitle>
          <DialogContent ref={contentRef} tabIndex={!isPanel && contentOverflows ? 0 : undefined} className={isPanel ? styles.panelContent : styles.content} data-modal-body="">
            {children}
          </DialogContent>
          {footer && <DialogActions className={isPanel ? styles.panelFooter : styles.compactFooter} data-modal-footer="">{footer}</DialogActions>}
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  tone = 'primary',
  cancelLabel = 'Cancel',
  pendingLabel,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  /** May return a promise: the dialog stays open with a pending confirm button until it settles, then closes. */
  onConfirm: () => unknown
  onClose: () => void
  /** `danger` renders a filled red confirm button; `success` is kept for compatibility (renders as primary). */
  tone?: 'primary' | 'danger' | 'success'
  cancelLabel?: string
  /** Short "-ing" label shown on the confirm button while it runs, e.g. "Accepting…". */
  pendingLabel?: string
}) {
  const styles = useStyles()
  const buttonStyles = useConfirmationButtonStyles()
  const descriptionId = useId()
  const { pending, run } = usePendingAction()
  const busy = useBusyIndicator(pending)
  const close = () => {
    if (!pending) onClose()
  }
  return (
    <Modal
      open={open}
      title={title}
      onClose={close}
      size="sm"
      descriptionId={descriptionId}
      footer={
        <>
          <Button className={buttonStyles.secondary} disabledFocusable={busy} onClick={close}>{cancelLabel}</Button>
          <Button
            variant={tone === 'danger' ? 'dangerPrimary' : 'primary'}
            pending={pending}
            pendingLabel={pendingLabel}
            onClick={() =>
              void run(async () => {
                try {
                  await onConfirm()
                } finally {
                  // Failures are reported by the action itself (page notice), so the dialog closes either way.
                  onClose()
                }
              })
            }
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div id={descriptionId} className={styles.message}>{message}</div>
    </Modal>
  )
}
