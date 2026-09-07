import { useState, useRef } from 'react'
import { MessageSquare, Send, ArrowRightCircle, Paperclip, X, FileText, ImageIcon, Loader2 } from 'lucide-react'
import type { Attachment, Comment, StatusHistoryEntry } from '../types'
import { getCurrentUser } from '../services/authService'
import { getCurrentMockUser } from '../data/mockData'

interface ActivityItem {
  id: string
  type: 'comment' | 'status'
  author: string
  authorInitials: string
  date: string
  text: string
  linkedAction?: string
  status?: string
  attachments?: Attachment[]
}

interface PendingFile {
  id: string
  file: File
  name: string
  size: string
}

export interface CommentFile {
  attachment: Attachment
  file: File
}

interface CommentSectionProps {
  comments: Comment[]
  statusHistory: StatusHistoryEntry[]
  onAddComment: (text: string, files?: CommentFile[]) => void
  isSubmitting?: boolean
  readOnly?: boolean
}

const MAX_COMMENT_LENGTH = 2000
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx|png|jpg|jpeg|gif|zip)$/i

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDateTime(dateStr: string): string {
  if (!dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getFileIcon(name: string) {
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return ImageIcon
  return FileText
}

function AttachmentChips({ attachments }: { attachments: Attachment[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {attachments.map((att) => {
        const Icon = getFileIcon(att.name)
        return (
          <span
            key={att.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              fontSize: '0.78rem',
              color: 'var(--color-text)',
            }}
          >
            <Icon size={12} color="var(--color-text-muted)" aria-hidden="true" />
            {att.name}
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{att.size}</span>
          </span>
        )
      })}
    </div>
  )
}

export default function CommentSection({ comments, statusHistory, onAddComment, isSubmitting, readOnly }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get current user dynamically (works in dev and production)
  const isDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const ppUser = getCurrentUser()
  const mockUser = isDev ? getCurrentMockUser() : null
  const userName = ppUser ? `${ppUser.firstName} ${ppUser.lastName}` : mockUser?.name ?? 'You'
  const userInitials = ppUser
    ? `${ppUser.firstName?.[0] ?? ''}${ppUser.lastName?.[0] ?? ''}`.toUpperCase()
    : mockUser?.initials ?? 'U'

  // Merge status history notes and comments into one chronological feed
  const activityItems: ActivityItem[] = []

  statusHistory.forEach((entry, i) => {
    if (entry.note || entry.author) {
      activityItems.push({
        id: `status-${i}`,
        type: 'status',
        author: entry.author || 'System',
        authorInitials: entry.authorInitials || 'SY',
        date: entry.date.includes('T') ? entry.date : `${entry.date}T00:00:00`,
        text: entry.note || '',
        status: entry.status,
      })
    }
  })

  comments.forEach((c) => {
    activityItems.push({
      id: c.id,
      type: 'comment',
      author: c.author,
      authorInitials: c.authorInitials,
      date: c.date,
      text: c.text,
      linkedAction: c.linkedAction,
      attachments: c.attachments,
    })
  })

  activityItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  function addFiles(fileList: FileList) {
    setFileError(null)
    const rejected: string[] = []
    const accepted: PendingFile[] = []

    for (const f of Array.from(fileList)) {
      if (!ALLOWED_EXTENSIONS.test(f.name)) {
        rejected.push(`${f.name}: unsupported type`)
      } else if (f.size > MAX_FILE_SIZE) {
        rejected.push(`${f.name}: exceeds 10 MB`)
      } else {
        accepted.push({
          id: crypto.randomUUID(),
          file: f,
          name: f.name,
          size: formatFileSize(f.size),
        })
      }
    }

    if (rejected.length > 0) setFileError(rejected.join('. '))
    if (accepted.length > 0) setPendingFiles(prev => [...prev, ...accepted])
  }

  function removePendingFile(id: string) {
    setPendingFiles(prev => prev.filter(f => f.id !== id))
  }

  const canSubmit = (newComment.trim() || pendingFiles.length > 0) && !isSubmitting

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const files: CommentFile[] | undefined = pendingFiles.length > 0
      ? pendingFiles.map(f => ({
        attachment: {
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.file.type || 'application/octet-stream',
        },
        file: f.file,
      }))
      : undefined

    onAddComment(newComment.trim(), files)
    setNewComment('')
    setPendingFiles([])
    setFileError(null)
  }

  return (
    <div
      className="animate-in animate-in-5"
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 28,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        marginTop: 24,
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.05rem',
          fontWeight: 600,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <MessageSquare size={18} color="var(--color-primary)" aria-hidden="true" />
        Activity & Comments
        {activityItems.length > 0 && (
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              background: 'var(--color-bg)',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            {activityItems.length}
          </span>
        )}
      </h2>

      {/* Activity Feed */}
      {activityItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
          {activityItems.map((item, i) => {
            const isLast = i === activityItems.length - 1
            const isCurrentUser = item.author === userName
            const bgColor = isCurrentUser
              ? 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'
              : 'var(--color-bg)'
            const textColor = isCurrentUser ? '#fff' : 'var(--color-text-muted)'

            return (
              <div key={item.id} style={{ display: 'flex', gap: 12 }}>
                {/* Timeline line + avatar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: textColor,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-heading)',
                      flexShrink: 0,
                      border: item.type === 'status' ? '2px solid var(--color-primary)' : 'none',
                    }}
                  >
                    {item.type === 'status' ? (
                      <ArrowRightCircle size={14} color="var(--color-primary)" aria-hidden="true" />
                    ) : (
                      item.authorInitials
                    )}
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        background: 'var(--color-border)',
                        minHeight: 16,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.author}</span>
                    {item.type === 'status' && item.status && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: 'var(--color-primary)',
                          background: 'var(--color-primary-light)',
                          padding: '1px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        {item.status}
                      </span>
                    )}
                    {item.type === 'comment' && item.linkedAction && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: 'var(--color-info)',
                          background: 'var(--color-info-light)',
                          padding: '1px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        on {item.linkedAction}
                      </span>
                    )}
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {formatDateTime(item.date)}
                    </span>
                  </div>
                  {item.text && (
                    <p
                      style={{
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        color: 'var(--color-text)',
                        marginTop: 4,
                      }}
                    >
                      {item.text}
                    </p>
                  )}
                  {/* Inline attachments */}
                  {item.attachments && item.attachments.length > 0 && (
                    <AttachmentChips attachments={item.attachments} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            marginBottom: 20,
          }}
        >
          <MessageSquare size={28} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            No comments yet. Add a comment to start the conversation.
          </p>
        </div>
      )}

      {/* Add Comment Form — hidden in read-only mode */}
      {readOnly ? (
        activityItems.length === 0 ? null : (
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Comments are closed for this record.
            </p>
          </div>
        )
      ) : (
      <form
        onSubmit={handleSubmit}
        style={{
          paddingTop: activityItems.length > 0 ? 16 : 0,
          borderTop: activityItems.length > 0 ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 600,
              fontFamily: 'var(--font-heading)',
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Text input row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                aria-label="Add a comment"
                maxLength={MAX_COMMENT_LENGTH}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    if (canSubmit) {
                      handleSubmit(e)
                    }
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-body)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  resize: 'vertical',
                  minHeight: 44,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach file"
                  title="Attach file"
                  style={{
                    padding: 9,
                    borderRadius: 'var(--radius)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Paperclip size={15} aria-hidden="true" />
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  aria-label={isSubmitting ? 'Sending...' : 'Send comment'}
                  title={isSubmitting ? 'Sending...' : 'Send comment (Ctrl+Enter)'}
                  style={{
                    padding: 9,
                    borderRadius: 'var(--radius)',
                    background: canSubmit ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: canSubmit ? '#fff' : 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSubmitting ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>
            <div className={`char-counter${newComment.length > MAX_COMMENT_LENGTH * 0.9 ? (newComment.length >= MAX_COMMENT_LENGTH ? ' char-counter--limit' : ' char-counter--warn') : ''}`}>
              {newComment.length} / {MAX_COMMENT_LENGTH}
            </div>

            {/* Pending files */}
            {pendingFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pendingFiles.map((f) => {
                  const Icon = getFileIcon(f.name)
                  return (
                    <span
                      key={f.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        background: 'var(--color-primary-light)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.78rem',
                        color: 'var(--color-primary-dark)',
                      }}
                    >
                      <Icon size={12} aria-hidden="true" />
                      <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{f.size}</span>
                      <button
                        type="button"
                        onClick={() => removePendingFile(f.id)}
                        aria-label={`Remove ${f.name}`}
                        style={{
                          background: 'transparent',
                          padding: 1,
                          display: 'flex',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* File error */}
            {fileError && (
              <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.78rem' }}>
                {fileError}
              </p>
            )}

            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Ctrl+Enter to send &middot; PDF, images, or documents up to 10 MB
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </form>
      )}
    </div>
  )
}
