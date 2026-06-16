import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFeedback } from '../api/webApi'

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; id: string }
  | { kind: 'error'; message: string }

export default function FeedbackForm() {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [comments, setComments] = useState('')
  const [state, setState] = useState<SubmitState>({ kind: 'idle' })

  const submitting = state.kind === 'submitting'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState({ kind: 'submitting' })

    try {
      const id = await createFeedback({
        sample_name: name.trim(),
        sample_rating: rating,
        sample_comments: comments.trim(),
      })

      setState({ kind: 'success', id })
      setName('')
      setRating(5)
      setComments('')
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong.',
      })
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          type="text"
          value={name}
          required
          disabled={submitting}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="rating">Rating</label>
        <select
          id="rating"
          value={rating}
          disabled={submitting}
          onChange={(event) => setRating(Number(event.target.value))}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} {value === 1 ? 'star' : 'stars'}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="comments">Comments</label>
        <textarea
          id="comments"
          rows={4}
          value={comments}
          required
          disabled={submitting}
          onChange={(event) => setComments(event.target.value)}
        />
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit feedback'}
      </button>

      {state.kind === 'success' && (
        <p className="message success" role="status">
          Thanks! Your feedback was created.
          <br />
          New record id: <code>{state.id || '(unavailable)'}</code>
        </p>
      )}

      {state.kind === 'error' && (
        <p className="message error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  )
}
