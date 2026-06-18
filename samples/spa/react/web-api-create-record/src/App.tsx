import FeedbackForm from './components/FeedbackForm'

export default function App() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Share your feedback</h1>
        <p>
          This sample shows one thing: how to <strong>create a Dataverse record</strong>{' '}
          from a Power Pages code site using the Web API (HTTP <code>POST</code>).
        </p>
      </header>

      <FeedbackForm />

      <footer className="page-footer">
        <p>
          The submit handler calls <code>createFeedback()</code> in{' '}
          <code>src/api/webApi.ts</code>, which fetches an anti-forgery token and{' '}
          <code>POST</code>s to <code>/_api/sample_feedbacks</code>.
        </p>
        <p className="hint">
          Running locally with <code>npm run dev</code> simulates a successful
          create so you can explore the UI without a deployed site.
        </p>
      </footer>
    </main>
  )
}
