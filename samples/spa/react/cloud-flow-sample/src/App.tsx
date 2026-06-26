import { useState } from 'react'
import { requestCallback, type CallbackResponse } from './cloudFlowClient'

// One screen, one button. The UI exists only to demonstrate the flow call in
// cloudFlowClient.ts and to render its three states: loading, error, result.
export default function App() {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('Account help')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [result, setResult] = useState<CallbackResponse | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    setResult(null)
    try {
      const response = await requestCallback({ name, topic })
      setResult(response)
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <main className="card">
      <h1>Request a callback</h1>
      <p className="subtitle">
        Submitting this form calls a Power Automate cloud flow and shows what it
        returns.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Your name
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Jordan Avery"
          />
        </label>

        <label>
          Topic
          <select value={topic} onChange={e => setTopic(e.target.value)}>
            <option>Account help</option>
            <option>Billing question</option>
            <option>Technical support</option>
          </select>
        </label>

        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Calling flow…' : 'Request callback'}
        </button>
      </form>

      {status === 'error' && <p className="error">⚠️ {error}</p>}

      {result && (
        <div className="result">
          <h2>Flow response</h2>
          <dl>
            <dt>Ticket</dt>
            <dd>{result.ticketNumber}</dd>
            <dt>Message</dt>
            <dd>{result.message}</dd>
            <dt>Estimated callback</dt>
            <dd>{result.estimatedCallback}</dd>
          </dl>
        </div>
      )}
    </main>
  )
}
