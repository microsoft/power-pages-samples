import { useEffect, useRef, useState } from 'react'
import {
  listFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  validateFile,
  formatSize,
  isSignedIn,
  SIGN_IN_URL,
  MAX_FILE_BYTES,
  ALLOWED_LABEL,
  ACCEPT_ATTR,
  type UploadedFile,
} from './blobFileService'

// One screen: pick a file, upload it (to Azure Blob), see your files, download
// or delete them. All the Web API work lives in blobFileService.ts.
export default function App() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Files are stored against the signed-in user's contact, so everything here
  // requires authentication. Gate the UI on it and offer a way to sign in.
  const signedIn = isSignedIn()

  async function refresh() {
    try {
      setFiles(await listFiles())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load files.')
    }
  }

  useEffect(() => {
    if (signedIn) refresh()
  }, [signedIn])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    // Guard before touching the network.
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setBusy(true)
    setProgress(0)
    try {
      await uploadFile(file, setProgress)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    setBusy(true)
    setError('')
    try {
      await deleteFile(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!signedIn) {
    return (
      <main className="card">
        <h1>My documents</h1>
        <p className="subtitle">
          Files are stored in Azure Blob storage and tracked on your own record.
          Sign in to upload and manage your files.
        </p>
        <a className="upload" href={SIGN_IN_URL}>
          Sign in
        </a>
      </main>
    )
  }

  return (
    <main className="card">
      <h1>My documents</h1>
      <p className="subtitle">
        Files are uploaded to <strong>Azure Blob storage</strong> through the
        Power Pages file-management Web API, and fenced to the record you own.
      </p>

      <label className={`upload ${busy ? 'disabled' : ''}`}>
        {busy ? 'Working…' : '＋ Upload a file'}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleFile}
          disabled={busy}
          hidden
        />
      </label>
      <p className="hint">{ALLOWED_LABEL} · up to {formatSize(MAX_FILE_BYTES)}</p>

      {progress !== null && (
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      {error && <p className="error">⚠️ {error}</p>}

      {files.length === 0 ? (
        <p className="empty">No files yet.</p>
      ) : (
        <ul className="files">
          {files.map(f => (
            <li key={f.id}>
              <div>
                <span className="name">{f.filename}</span>
                <span className="meta">{formatSize(f.filesize)}</span>
              </div>
              <div className="actions">
                <button onClick={() => downloadFile(f.id)} disabled={busy}>
                  Download
                </button>
                <button
                  className="danger"
                  onClick={() => handleDelete(f.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
