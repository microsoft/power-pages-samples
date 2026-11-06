import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import Article, { ArticleNotFound } from './pages/Article'
import Account from './pages/Account'
import { Link, useLocation } from 'react-router-dom'
import { usePageTitle } from './usePageTitle'
import { useSupport } from './SupportContext'

function HomeEntry() {
  const [params] = useSearchParams()
  const { articles, knowledgeReady } = useSupport()
  if (!params.has('id')) return <Home />
  if (!knowledgeReady) return null
  const ids = params.getAll('id')
  const id = ids.length === 1 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ids[0])
    ? ids[0].toLowerCase() : null
  const article = articles.find(item => item.id.toLowerCase() === id)
  if (!article) return <ArticleNotFound />
  const search = new URLSearchParams(params)
  search.delete('id')
  return <Navigate replace to={{ pathname: `/articles/${article.id}`, search: search.toString() }} />
}

function NotFound() {
  usePageTitle('Page not found')
  return <><h1>Page not found</h1><p>That page is not part of the support workspace.</p><Link className="button" to="/">Back to Ask Northwind</Link></>
}

export default function App() {
  const location = useLocation()
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeEntry />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail key={location.pathname} />} />
        <Route path="/articles/:id" element={<Article />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
