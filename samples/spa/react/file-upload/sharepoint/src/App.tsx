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
  type UploadedFile,
} from './sharePointService'

// One screen: pick a file, upload it (to SharePoint, via server logic), see
// your files, download or delete them. All the server-logic calls live in
// sharePointService.ts.
export default function App() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Files are stored in the signed-in user's own SharePoint folder, so
  // everything here requires authentication. Gate the UI and offer a sign-in.
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

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setBusy(true)
    try {
      await uploadFile(file)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
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
          Files are stored in your own SharePoint folder. Sign in to upload and
          manage your files.
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
        Files are stored in a <strong>SharePoint</strong> document library, reached
        from this code site through <strong>server logic</strong> + Microsoft Graph.
      </p>

      <label className={`upload ${busy ? 'disabled' : ''}`}>
        {busy ? 'Working…' : '＋ Upload a file'}
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,.json,.md,.html,.xml"
          onChange={handleFile}
          disabled={busy}
          hidden
        />
      </label>
      <p className="hint">Text documents: TXT, CSV, JSON, MD, HTML, XML · up to 2 MB</p>

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
