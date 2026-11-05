import { useId, useMemo, useState, type ReactNode } from 'react'
import {
  Button,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components'
import { ArrowSort16Regular, ChevronLeft20Regular, ChevronRight20Regular } from '@fluentui/react-icons'
import { EmptyState, useIsNarrow } from './ui'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Enables header sorting when provided. */
  sortValue?: (row: T) => string | number
  /** `text-right` marks a numeric column (right-aligned cell and header). */
  className?: string
}

export interface DataTableEmpty {
  title: string
  body?: ReactNode
  action?: ReactNode
}

const useStyles = makeStyles({
  container: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    minWidth: 0,
  },
  bare: {
    border: 'none',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalM,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  scroller: {
    overflowX: 'auto',
    ':focus-visible': {
      outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '-2px',
    },
  },
  table: {
    width: '100%',
    tableLayout: 'auto',
  },
  headerRow: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  headerCell: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalM,
  },
  headerButtonEnd: {
    justifyContent: 'flex-end',
  },
  restSortIcon: {
    color: tokens.colorNeutralForeground3,
    display: 'inline-flex',
  },
  actionsHeader: {
    textAlign: 'end',
  },
  cell: {
    verticalAlign: 'top',
    paddingTop: tokens.spacingVerticalMNudge,
    paddingBottom: tokens.spacingVerticalMNudge,
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground1,
  },
  numeric: {
    textAlign: 'end',
    fontVariantNumeric: 'tabular-nums',
  },
  actionsCell: {
    textAlign: 'end',
    whiteSpace: 'nowrap',
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
  },
  emptyCell: {
    textAlign: 'start',
    verticalAlign: 'middle',
    padding: 0,
  },
  emptyText: {
    display: 'block',
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
    paddingInlineStart: tokens.spacingHorizontalL,
    paddingInlineEnd: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground2,
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalS,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground2,
  },
  pager: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
  pagerButton: {
    '@media (pointer: coarse)': { minHeight: '44px' },
  },
  /* Card layout (narrow screens) */
  sortBar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalM,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  sortLabel: { color: tokens.colorNeutralForeground2, whiteSpace: 'nowrap' },
  sortSelect: { flexGrow: 1, minWidth: 0 },
  cardList: { listStyleType: 'none', margin: 0, padding: 0 },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalM,
    ':not(:first-child)': { borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
    minWidth: 0,
  },
  cardTitle: {
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    overflowWrap: 'anywhere',
  },
  cardFields: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
    margin: 0,
  },
  cardTerm: {
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  cardValue: {
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground1,
    overflowWrap: 'anywhere',
    minWidth: 0,
  },
  cardActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
  },
})

const isNumeric = (c: { className?: string }) => !!c.className?.includes('text-right')

/**
 * Entity list grid: sortable headers (neutral sort affordance at rest), paging, record count, row actions,
 * an optional toolbar slot and an explanatory empty state. Below 640px rows render as stacked cards by
 * default (`responsive="cards"`): first column = card title, other columns as label/value, actions at the bottom.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  pageSize = 10,
  initialSort,
  actions,
  emptyText = 'There are no records to display.',
  empty,
  responsive = 'cards',
  bare = false,
  toolbar,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  caption: string
  pageSize?: number
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  actions?: (row: T) => ReactNode
  /** Simple empty message (kept for compatibility); prefer `empty`. */
  emptyText?: ReactNode
  /** Empty state with a reason and a next step, e.g. `{ title, body, action: <ButtonLink …/> }`. */
  empty?: DataTableEmpty
  /** Layout below 640px: stacked `cards` (default) or horizontal `scroll`. */
  responsive?: 'scroll' | 'cards'
  /** No outer border/radius — use when the table sits inside a Panel. */
  bare?: boolean
  /** Slot rendered above the table (search, filters, export…). */
  toolbar?: ReactNode
}) {
  const styles = useStyles()
  const narrow = useIsNarrow()
  const sortId = useId()
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(0)
  const rowSet = new Set(rows.map(rowKey))
  const [previousRowSet, setPreviousRowSet] = useState(rowSet)
  if (rowSet.size !== previousRowSet.size || rows.some(row => !previousRowSet.has(rowKey(row)))) {
    setPreviousRowSet(rowSet)
    setPage(0)
  }

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find(c => c.key === sort.key)
    if (!col?.sortValue) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize)
  const sortableCols = columns.filter(c => c.sortValue)
  const sortable = sortableCols.length > 0
  const asCards = responsive === 'cards' && narrow

  const emptyContent = empty ? (
    <EmptyState bare title={empty.title} body={empty.body} action={empty.action} />
  ) : (
    <Text className={styles.emptyText}>{emptyText}</Text>
  )

  const total = sorted.length
  const countText = `${total} ${total === 1 ? 'record' : 'records'}`

  const footer = (
    <div className={styles.footer}>
      <span role="status" aria-live="polite" aria-atomic="true">
        {total > pageSize ? `${current * pageSize + 1}–${Math.min(total, (current + 1) * pageSize)} of ${countText}` : countText}
      </span>
      {total > pageSize && (
        <div className={styles.pager}>
          <Button
            appearance="subtle"
            className={styles.pagerButton}
            icon={<ChevronLeft20Regular />}
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </Button>
          <Button
            appearance="subtle"
            className={styles.pagerButton}
            icon={<ChevronRight20Regular />}
            iconPosition="after"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )

  const sortValue = sort ? `${sort.key}:${sort.dir}` : ''

  return (
    <div className={mergeClasses(styles.container, bare && styles.bare)}>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      {asCards ? (
        <section aria-label={caption}>
          {sortable && total > 1 && (
            <div className={styles.sortBar}>
              <label htmlFor={sortId} className={styles.sortLabel}>
                <Text weight="semibold">Sort by</Text>
              </label>
              <Select
                id={sortId}
                className={styles.sortSelect}
                value={sortValue}
                onChange={(_, data) => {
                  if (!data.value) return setSort(undefined)
                  const [key, dir] = data.value.split(':')
                  setSort({ key, dir: dir as 'asc' | 'desc' })
                }}
              >
                {!sort && <option value="">Default order</option>}
                {sortableCols.flatMap(c => [
                  <option key={`${c.key}:asc`} value={`${c.key}:asc`}>
                    {c.header} (ascending)
                  </option>,
                  <option key={`${c.key}:desc`} value={`${c.key}:desc`}>
                    {c.header} (descending)
                  </option>,
                ])}
              </Select>
            </div>
          )}
          {visible.length === 0 ? (
            emptyContent
          ) : (
            <ul className={styles.cardList}>
              {visible.map(row => {
                const [first, ...rest] = columns
                return (
                  <li key={rowKey(row)} className={styles.card}>
                    {first && <div className={styles.cardTitle}>{first.render(row)}</div>}
                    {rest.length > 0 && (
                      <dl className={styles.cardFields}>
                        {rest.map(c => (
                          <div key={c.key} style={{ display: 'contents' }}>
                            <dt className={styles.cardTerm}>{c.header}</dt>
                            <dd className={styles.cardValue}>{c.render(row)}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {actions && <div className={styles.cardActions}>{actions(row)}</div>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : (
        /* Keyboard users must be able to scroll wide tables on narrow screens (WCAG scrollable-region-focusable). */
        <div className={styles.scroller} tabIndex={0} role="region" aria-label={caption}>
          <Table sortable={sortable} className={styles.table}>
            <caption className="sr-only">{caption}</caption>
            <TableHeader>
              <TableRow className={styles.headerRow}>
                {columns.map(c => {
                  const isSortable = !!c.sortValue
                  const active = isSortable && sort?.key === c.key
                  return (
                    <TableHeaderCell
                      key={c.key}
                      scope="col"
                      sortable={isSortable}
                      sortDirection={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      sortIcon={isSortable && !active ? { className: styles.restSortIcon, children: <ArrowSort16Regular aria-hidden="true" /> } : undefined}
                      onClick={isSortable ? () => setSort(s => ({ key: c.key, dir: s?.key === c.key && s.dir === 'asc' ? 'desc' : 'asc' })) : undefined}
                      button={isNumeric(c) ? { className: styles.headerButtonEnd } : undefined}
                      className={mergeClasses(styles.headerCell, isNumeric(c) && styles.numeric, c.className)}
                    >
                      {c.header}
                    </TableHeaderCell>
                  )
                })}
                {actions && (
                  <TableHeaderCell scope="col" sortable={false} className={mergeClasses(styles.headerCell, styles.actionsHeader)}>
                    <span className="sr-only">Actions</span>
                  </TableHeaderCell>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} className={styles.emptyCell}>
                    {emptyContent}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map(row => (
                  <TableRow key={rowKey(row)}>
                    {columns.map(c => (
                      <TableCell key={c.key} className={mergeClasses(styles.cell, isNumeric(c) && styles.numeric, c.className)}>
                        {c.render(row)}
                      </TableCell>
                    ))}
                    {actions && <TableCell className={mergeClasses(styles.cell, styles.actionsCell)}>{actions(row)}</TableCell>}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {footer}
    </div>
  )
}
