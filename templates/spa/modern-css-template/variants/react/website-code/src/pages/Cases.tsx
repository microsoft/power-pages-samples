import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupport } from '../SupportContext'
import { formatDate, formatNumber, statusLabels } from '../data'
import Icon from '../components/Icon'
import { usePageTitle } from '../usePageTitle'

export default function Cases() {
  usePageTitle('My cases')
  const { cases, isDemo, setIssueOpen, notifications } = useSupport()
  const [filter, setFilter] = useState('all')
  const visible = cases.filter(item => filter === 'all' || item.status === filter)
  return <>
    <header className="page-header"><div><span className="eyebrow">Your support history</span><h1>My cases</h1><p>{isDemo ? 'Track progress, complete requested actions, and review each conversation. Local drafts have not been submitted.' : 'Track progress, respond when support needs details, and review every reply on cases where you are the customer.'}</p></div><button className="button" onClick={() => setIssueOpen(true)}>Report a new issue</button></header>
    <div className="filters" role="group" aria-label="Filter cases">{(isDemo
      ? [['all', 'All cases'], ['action', 'Action needed'], ['progress', 'In progress'], ['resolved', 'Resolved'], ['draft', 'Local drafts']]
      : [['all', 'All cases'], ['action', 'Action needed'], ['progress', 'In progress'], ['resolved', 'Resolved'], ['cancelled', 'Cancelled']]).map(([value, label]) =>
      <button className="filter-button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <p className="muted" role="status">{formatNumber(visible.length)} cases shown</p>
    <div className="case-grid">{visible.map(item => {
      const closed = item.status === 'resolved' || item.status === 'cancelled'
      const unread = notifications.filter(notice => notice.caseId === item.id && !notice.read).length
      return <article className="case-card" key={item.id}>
        <div className="case-card-top"><span className={`badge ${item.status}`}>{item.statusLabel ?? statusLabels[item.status]}</span><small className="case-meta"><bdi className="case-id">{item.number ?? item.id}</bdi> · {closed ? 'Closed' : 'Updated'} {formatDate(item.updated)}</small></div>
        <h2><bdi>{item.title}</bdi></h2><p><bdi>{item.summary}</bdi></p>
        <div className="next-step"><span>{item.status === 'action' ? 'Your next step' : closed ? 'Outcome' : 'Next step'}</span><strong>{item.nextStep}</strong></div>
        <div className="card-footer"><small className="muted">{unread ? `${formatNumber(unread)} unread ${unread === 1 ? 'update' : 'updates'}` : closed ? 'Closed' : 'No unread updates'}</small><Link className="text-link" to={`/cases/${item.id}`} aria-label={`Open ${item.title}`}>{item.status === 'action' ? 'Respond' : item.status === 'resolved' ? 'View resolution' : 'View case'} <Icon name="arrow" progression /></Link></div>
      </article>
    })}</div>
    {!visible.length && <div className="empty"><h2>No cases in this view</h2><p>{isDemo ? 'Try another filter or prepare a local issue draft.' : 'Try another filter or report a new issue.'}</p><button className="button secondary" onClick={() => setFilter('all')}>Show all cases</button></div>}
  </>
}
