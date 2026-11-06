import { Link, useLocation, useParams } from 'react-router-dom'
import { useState } from 'react'
import { formatNumber } from '../data'
import { errorMessage, useSupport } from '../SupportContext'
import { SignInLink } from '../components/SignIn'
import { usePageTitle } from '../usePageTitle'

export function ArticleNotFound() {
  usePageTitle('Article not found')
  return <><h1>Article not found</h1><p>That article is not available in the support library.</p><Link className="button" to="/#support-library">Browse articles</Link></>
}

export default function Article() {
  const { id } = useParams()
  const { articles, isDemo, saved, toggleSaved, feedback, saveArticleFeedback, signedIn } = useSupport()
  const location = useLocation()
  const here = location.pathname + location.search
  const article = articles.find(item => item.id === id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submitFeedback(label: string) {
    if (!id) return
    setSaving(true); setError('')
    try { await saveArticleFeedback(id, label) } catch (error) { setError(errorMessage(error)) }
    finally { setSaving(false) }
  }
  usePageTitle(article?.title ?? 'Article not found')
  if (!article) return <ArticleNotFound />
  return <>
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/#support-library">Support library</Link><span aria-hidden="true">/</span><bdi>{article.id}</bdi></nav>
    <header className="article-header"><div><span className="eyebrow">{article.label}</span><h1><bdi>{article.title}</bdi></h1><p className="muted"><bdi>{article.description}</bdi></p><span className="badge progress">{formatNumber(article.minutes)} min read · {isDemo ? 'Demonstration guidance' : 'Published knowledge'}</span></div><div className="stack"><button className="button secondary" aria-pressed={saved.includes(article.id)} onClick={() => toggleSaved(article.id)}>{saved.includes(article.id) ? 'Saved to bookmarks' : 'Save article'}</button><Link className="text-link" to="/?saved=1#support-library">View saved articles</Link>{!isDemo && <small>Bookmarks remain in this browser tab only.</small>}</div></header>
    <div className="article-layout">
      <aside className="panel article-aside"><h2>{isDemo ? 'Applies to' : 'Article details'}</h2>{isDemo ? <ul>{article.applies.map(item => <li key={item}>{item}</li>)}</ul> : <p><bdi>{article.number ?? article.id}</bdi></p>}<nav aria-label="On this page">{isDemo ? <><a href="#article-symptoms">When to use this</a><a href="#article-steps">Recommended steps</a><a href="#article-notes">Before you continue</a></> : <a href="#article-content">Article content</a>}<a href="#article-escalation">Contact support</a><a href="#article-feedback">Article feedback</a></nav></aside>
      <div className="article-body stack">
        {isDemo ? <><p className="notice">Demonstration content. Validate procedures against approved product documentation before operational use.</p>
        <section className="panel" id="article-symptoms"><h2>When to use this guidance</h2><ul>{article.symptoms.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section className="panel" id="article-steps"><h2>Recommended steps</h2><ol>{article.steps.map(item => <li key={item}>{item}</li>)}</ol></section>
        <section className="panel" id="article-notes"><h2>Before you continue</h2><ul>{article.notes.map(item => <li key={item}>{item}</li>)}</ul></section></>
          : <section className="panel" id="article-content"><h2>Article content</h2><div className="article-text" dir="auto">{article.content || 'This article has no body content.'}</div><p className="muted">For safety, article content is displayed as text without embedded scripts or external resources.</p></section>}
        <section className="panel" id="article-escalation"><span className="eyebrow">Need more help?</span><h2>When to contact support</h2><p>{article.escalation}</p>{signedIn
          ? <Link className="button secondary" to={`/account?context=${encodeURIComponent(`I reviewed ${article.id}: ${article.title}`)}#contact-support`}>Contact support</Link>
          : <SignInLink className="button secondary" to={`/account?context=${encodeURIComponent(`I reviewed ${article.id}: ${article.title}`)}#contact-support`}>Sign in to contact support</SignInLink>}</section>
        <section className="panel" id="article-feedback"><h2>Was this article helpful?</h2>{signedIn
          ? <><div className="actions">{['Yes, helpful', 'Not helpful'].map(label => <button className="button secondary" key={label} disabled={saving} aria-pressed={feedback[article.id] === label} onClick={() => void submitFeedback(label)}>{label}</button>)}</div>{feedback[article.id] && <p role="status">{isDemo ? 'Thanks for your feedback. Recorded in this browser tab only.' : 'Thanks. Your feedback was saved to Dataverse.'}</p>}<p className="error" role="alert">{error}</p></>
          : <><p className="muted">Sign in to rate this article. Feedback is saved with your support account.</p><SignInLink className="button secondary" to={here}>Sign in to give feedback</SignInLink></>}</section>
        <section className="panel"><h2>{isDemo ? 'Related articles' : 'More published articles'}</h2>{articles.filter(item => item.category === article.category && item.id !== article.id).map(item => <Link className="text-link" key={item.id} to={`/articles/${item.id}`}><bdi>{item.title}</bdi></Link>)}</section>
      </div>
    </div>
  </>
}
