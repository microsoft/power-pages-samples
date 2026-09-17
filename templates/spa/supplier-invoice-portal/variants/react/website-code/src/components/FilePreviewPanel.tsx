import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Download, FileText, Image as ImageIcon, FileArchive, Loader } from 'lucide-react'
import type { Attachment } from '../types'

function isPreviewable(type: string, name: string): 'pdf' | 'image' | false {
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf'
  if (
    type.startsWith('image/') ||
    /\.(png|jpe?g|gif|svg|webp|bmp)$/i.test(name)
  )
    return 'image'
  return false
}

function getFileIcon(type: string, name: string) {
  const kind = isPreviewable(type, name)
  if (kind === 'pdf') return FileText
  if (kind === 'image') return ImageIcon
  return FileArchive
}

interface Props {
  attachment: Attachment | null
  onClose: () => void
  onDownload?: (att: Attachment) => void
}

export default function FilePreviewPanel({ attachment, onClose, onDownload }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentBlobUrl = useRef<string | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Fetch real file content when attachment changes
  useEffect(() => {
    // Revoke previous blob URL to prevent memory leak
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current)
      currentBlobUrl.current = null
    }

    if (!attachment) {
      setPreviewUrl(null)
      setError(null)
      return
    }

    const kind = isPreviewable(attachment.type, attachment.name)
    if (!kind) {
      setPreviewUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    import('../services/invoiceAttachmentService')
      .then(({ downloadAttachmentFile }) => downloadAttachmentFile(attachment.id, attachment.type))
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (url) {
          currentBlobUrl.current = url
          setPreviewUrl(url)
        } else {
          setError('File not found')
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load preview')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current)
        currentBlobUrl.current = null
      }
    }
  }, [attachment?.id])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])'
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
    },
    [onClose]
  )

  useEffect(() => {
    if (attachment) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
      requestAnimationFrame(() => closeButtonRef.current?.focus())
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        previousFocusRef.current?.focus()
        previousFocusRef.current = null
      }
    }
  }, [attachment, handleKeyDown])

  if (!attachment) return null

  const kind = isPreviewable(attachment.type, attachment.name)
  const Icon = getFileIcon(attachment.type, attachment.name)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="preview-panel-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26, 43, 30, 0.35)',
          zIndex: 60,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview: ${attachment.name}`}
        className="preview-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '50vw',
          maxWidth: '100vw',
          background: 'var(--color-surface)',
          boxShadow: '-8px 0 32px rgba(26, 43, 30, 0.15)',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius)',
              background: kind === 'pdf'
                ? 'var(--color-error-light)'
                : kind === 'image'
                  ? 'var(--color-info-light)'
                  : 'var(--color-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon
              size={18}
              color={kind === 'pdf'
                ? 'var(--color-error)'
                : kind === 'image'
                  ? 'var(--color-primary)'
                  : 'var(--color-text-muted)'}
              aria-hidden="true"
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                fontFamily: 'var(--font-heading)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {attachment.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {attachment.size}
            </div>
          </div>
          {onDownload && (
            <button
              onClick={() => onDownload(attachment)}
              className="btn-outline-sm"
              style={{ flexShrink: 0 }}
            >
              <Download size={14} aria-hidden="true" /> Download
            </button>
          )}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="btn-ghost"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Preview body */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: 'var(--color-text-muted)',
              }}
            >
              <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              <span style={{ fontSize: '0.875rem' }}>Loading preview...</span>
            </div>
          ) : error ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: 40,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={32} color="var(--color-text-muted)" aria-hidden="true" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
                  {error}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: 280 }}>
                  Try downloading the file instead.
                </p>
              </div>
              {onDownload && (
                <button onClick={() => onDownload(attachment)} className="btn-primary">
                  <Download size={16} aria-hidden="true" /> Download File
                </button>
              )}
            </div>
          ) : kind === 'pdf' && previewUrl ? (
            <iframe
              src={previewUrl}
              title={`PDF preview: ${attachment.name}`}
              style={{ flex: 1, border: 'none', width: '100%', minHeight: 0 }}
            />
          ) : kind === 'image' && previewUrl ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                background: 'var(--color-bg)',
              }}
            >
              <img
                src={previewUrl}
                alt={attachment.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            </div>
          ) : (
            /* No preview available (non-previewable file type) */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: 40,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={32} color="var(--color-text-muted)" aria-hidden="true" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
                  Preview not available
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: 280 }}>
                  This file type can't be previewed in the browser. Download it to view the contents.
                </p>
              </div>
              {onDownload && (
                <button onClick={() => onDownload(attachment)} className="btn-primary">
                  <Download size={16} aria-hidden="true" /> Download File
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
