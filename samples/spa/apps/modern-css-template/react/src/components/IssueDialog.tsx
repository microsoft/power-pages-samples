import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage, useSupport } from '../SupportContext'
import { searchSupport } from '../data'
import Dialog from './Dialog'
import Field from './Field'

export default function IssueDialog() {
  const { issueOpen, setIssueOpen, cases, articles, products, isDemo, phase, submitCase } = useSupport()
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('')
  const [checked, setChecked] = useState(false)
  const [product, setProduct] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const results = searchSupport(description, cases, articles).slice(0, 3)
  function submit(event: FormEvent) { event.preventDefault(); setChecked(true) }
  async function save() {
    setSaving(true); setError('')
    try {
      const id = await submitCase(description.trim(), impact, product || undefined)
      setIssueOpen(false); setDescription(''); setImpact(''); setProduct(''); setChecked(false)
      navigate(`/cases/${id}`)
    } catch (error) { setError(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <Dialog id="issue-dialog" open={issueOpen} onClose={() => setIssueOpen(false)} title="Report an issue">
    <p className="notice">{isDemo ? 'Demo only. You can prepare a local draft, but no case is submitted to support. Do not include sensitive information.' : 'Submitting creates a case for your signed-in contact. Do not include passwords, payment-card details or sensitive identity information.'}</p>
    <form className="stack" onSubmit={submit}>
      <Field id="issue-description" label="What do you need help with?" value={description} required multiline placeholder="Describe the product, task and what happened"
        maxLength={isDemo ? undefined : 2000 - '\n\nBusiness impact: '.length - impact.length}
        hint={isDemo ? undefined : 'The case description and selected impact must fit within 2,000 characters.'}
        onChange={value => { setDescription(value); setChecked(false) }} />
      <div className="field"><label htmlFor="issue-impact">How is this affecting you?</label><select id="issue-impact" required value={impact} onChange={event => { setImpact(event.target.value); setChecked(false) }}>
        <option value="">Choose an impact</option><option>Work is blocked</option><option>Service is impaired</option><option>I have a question</option>
      </select></div>
      {!isDemo && products.length > 0 && <div className="field"><label htmlFor="issue-product">Product (optional)</label><select id="issue-product" value={product} onChange={event => setProduct(event.target.value)}><option value="">No product selected</option>{products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
      <div className="actions"><button className="button" type="submit" disabled={!description.trim() || !impact}>Check for matches</button><button className="button secondary" type="button" onClick={() => setIssueOpen(false)}>Cancel</button></div>
    </form>
    {checked && <section className="stack" aria-label="Related guidance">
      <h3>{isDemo ? 'Before preparing a new draft' : 'Before submitting a new case'}</h3>
      {results.length ? results.map(result => <Link className="text-link" to={result.path} key={result.id} onClick={() => setIssueOpen(false)}><bdi>{result.title}</bdi></Link>) : <p>No related cases or articles were found.</p>}
      <button className="button secondary" type="button" disabled={saving || phase !== 'ready'} onClick={() => void save()}>{saving ? 'Saving…' : isDemo ? 'Save local issue draft' : 'Submit case'}</button>
      <p className="error" role="alert">{error}</p>
    </section>}
  </Dialog>
}
