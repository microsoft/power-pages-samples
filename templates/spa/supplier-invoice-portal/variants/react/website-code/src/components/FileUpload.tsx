import { useState, useRef } from 'react'
import { Upload, X, FileText, ImageIcon } from 'lucide-react'

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: string
}

interface FileUploadProps {
  onFilesChange?: (files: UploadedFile[]) => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx|png|jpg|jpeg|gif|zip)$/i

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function FileUpload({ onFilesChange }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(fileList: FileList) {
    setError(null)
    const rejected: string[] = []
    const accepted: UploadedFile[] = []

    for (const f of Array.from(fileList)) {
      if (!ALLOWED_EXTENSIONS.test(f.name)) {
        rejected.push(`${f.name}: unsupported file type`)
      } else if (f.size > MAX_FILE_SIZE) {
        rejected.push(`${f.name}: exceeds 10 MB limit`)
      } else {
        accepted.push({
          id: crypto.randomUUID(),
          file: f,
          name: f.name,
          size: formatSize(f.size),
        })
      }
    }

    if (rejected.length > 0) {
      setError(rejected.join('. '))
    }

    if (accepted.length > 0) {
      const updated = [...files, ...accepted]
      setFiles(updated)
      onFilesChange?.(updated)
    }
  }

  function removeFile(id: string) {
    const updated = files.filter((f) => f.id !== id)
    setFiles(updated)
    onFilesChange?.(updated)
  }

  function getIcon(name: string) {
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return ImageIcon
    return FileText
  }

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.85rem',
          fontWeight: 500,
          marginBottom: 6,
        }}
      >
        Supporting Documents
      </label>

      <div
        className="file-dropzone"
        role="button"
        tabIndex={0}
        aria-label="Upload files. Click or drag and drop documents here."
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
        }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--color-primary-light)' : 'var(--color-bg)',
          transition: 'all 0.2s ease',
        }}
      >
        <Upload
          size={24}
          color={dragOver ? 'var(--color-primary)' : 'var(--color-text-muted)'}
          aria-hidden="true"
          style={{ marginBottom: 8 }}
        />
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 500 }}>
          Drop files here or click to browse
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
          PDF, images, or documents up to 10 MB
        </p>
      </div>

      <input
        ref={inputRef}
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

      {error && (
        <p
          role="alert"
          style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: 8 }}
        >
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul style={{ listStyle: 'none', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((f) => {
            const Icon = getIcon(f.name)
            return (
              <li
                key={f.id}
                className="file-item-enter"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <Icon size={16} color="var(--color-text-muted)" aria-hidden="true" />
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {f.size}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(f.id)
                  }}
                  aria-label={`Remove ${f.name}`}
                  className="file-remove-btn"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
