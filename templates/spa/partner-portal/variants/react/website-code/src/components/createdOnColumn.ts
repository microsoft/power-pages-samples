import type { Column } from './DataTable'
import { formatDate } from '../lib/format'

/**
 * Shared "Created on" column for record lists, from Dataverse's system `createdon` column (no data-model change).
 * Sorting uses the ISO value, so newest-first works for both dates and date-times.
 */
export function createdOnColumn<T extends { createdOn?: string }>(): Column<T> {
  return {
    key: 'createdOn',
    header: 'Created on',
    sortValue: row => row.createdOn ?? '',
    render: row => formatDate(row.createdOn),
    className: 'whitespace-nowrap',
  }
}
