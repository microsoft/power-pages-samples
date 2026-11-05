import { Field, SearchBox, makeStyles } from '@fluentui/react-components'
import { Button } from '../../components/ui'
import { FormField, Select } from '../../components/forms'
import { useSearchParams } from 'react-router-dom'

export type StatusFilter = 'active' | 'inactive' | 'all'

export function useCustomerListFilters() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const rawStatus = params.get('status')
  const status: StatusFilter = rawStatus === 'all' || rawStatus === 'inactive' ? rawStatus : 'active'
  const update = (q: string, s: StatusFilter) => {
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    if (s !== 'active') next.set('status', s)
    else next.delete('status')
    setParams(next, { replace: true, flushSync: true })
  }
  return { query, status, setQuery: (q: string) => update(q, status), setStatus: (s: StatusFilter) => update(query, s), showAll: () => update('', 'all') }
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
]

const useStyles = makeStyles({
  search: { flexGrow: 1, minWidth: '12rem', maxWidth: '28rem' },
  searchBox: { width: '100%', maxWidth: '100%' },
  status: { width: '10rem' },
})

export const matchesStatus = (active: boolean, filter: StatusFilter) => filter === 'all' || (filter === 'active' ? active : !active)

export const matchesQuery = (query: string, ...values: (string | undefined)[]) => {
  const q = query.trim().toLowerCase()
  return !q || values.some(v => v?.toLowerCase().includes(q))
}

/** Search + Active/Inactive/All filter rendered in the DataTable toolbar slot. */
export function ListToolbar({
  idPrefix,
  searchLabel,
  query,
  onQuery,
  status,
  onStatus,
}: {
  idPrefix: string
  searchLabel: string
  query: string
  onQuery: (q: string) => void
  status: StatusFilter
  onStatus: (s: StatusFilter) => void
}) {
  const styles = useStyles()
  return (
    <>
      <Field label={searchLabel} className={styles.search}>
        <SearchBox id={`${idPrefix}-search`} className={styles.searchBox} value={query} onChange={(_, d) => onQuery(d.value)} />
      </Field>
      <FormField id={`${idPrefix}-status`} label="Status" className={styles.status}>
        <Select id={`${idPrefix}-status`} value={status} options={STATUS_OPTIONS} onChange={e => onStatus(e.target.value as StatusFilter)} />
      </FormField>
    </>
  )
}

/** Empty-state copy for a filtered list; `showAll` should clear the search and set the status filter to All. */
export function noMatches(noun: string, showAll: () => void) {
  return {
    title: `No ${noun} match your search`,
    body: 'Try a different name or email, or change the status filter.',
    action: <Button onClick={showAll}>Show all {noun}</Button>,
  }
}
