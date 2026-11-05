import { useEffect, useState, type ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  ToggleButton,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { Table20Regular } from '@fluentui/react-icons'
import { Panel } from './ui'
import { CHART_HEIGHT, ChartSkeleton } from './skeletons'

export { CHART_HEIGHT }

export interface ChartTableData {
  columns: string[]
  rows: string[][]
}

const useStyles = makeStyles({
  card: { alignSelf: 'stretch', minWidth: 0 },
  header: {
    flexWrap: 'wrap',
    rowGap: tokens.spacingVerticalS,
    '& > h2': { minWidth: 0 },
    '& > div': { flexShrink: 0 },
    '@media (max-width: 639.98px)': { flexDirection: 'column', alignItems: 'flex-start' },
  },
  toggle: { whiteSpace: 'nowrap', minHeight: '32px' },
  figure: { margin: 0 },
  chart: {
    width: '100%',
    minHeight: `${CHART_HEIGHT}px`,
    // Fluent's chart callout uses autoSize, which can make the transient tooltip a non-focusable scroll region.
    '& .fui-PopoverSurface': { overflow: 'visible !important', maxHeight: 'none !important' },
    '& .tick text': { fontSize: `${tokens.fontSizeBase200} !important` },
    // The panel heading already names the chart; the SVG keeps its accessible name.
    '& .fui-donut__chartTitle': { display: 'none' },
    '& .fui-donut-pie__insideDonutString': { fontSize: `${tokens.fontSizeBase500} !important`, fontWeight: tokens.fontWeightSemibold },
  },
  tableWrap: { minHeight: `${CHART_HEIGHT}px`, overflowX: 'auto' },
  numeric: { textAlign: 'end', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  numericHead: { textAlign: 'end', '& .fui-TableHeaderCell__button': { justifyContent: 'flex-end' } },
})

/** Tracks the content-box width of an element so charts can re-render to fit their card. */
export function useElementWidth<T extends HTMLElement>() {
  const [el, ref] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!el) return
    const update = () => setWidth(Math.floor(el.getBoundingClientRect().width))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])
  return [ref, width] as const
}

/**
 * Panel that hosts a Fluent chart inside a <figure> with a screen-reader summary, plus an
 * optional "Show data table" toggle that swaps the chart for an accessible table.
 * `children` receives the measured width so the chart can size itself to the card.
 */
export function ChartCard({
  title,
  summary,
  children,
  table,
}: {
  title: string
  summary: string
  children: (size: { width: number; height: number }) => ReactNode
  table?: ChartTableData
}) {
  const styles = useStyles()
  const [showTable, setShowTable] = useState(false)
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const tableShown = showTable && !!table
  return (
    <Panel
      title={title}
      className={styles.card}
      headerClassName={styles.header}
      actions={
        table && (
          <ToggleButton className={styles.toggle} size="small" appearance="subtle" icon={<Table20Regular />} checked={showTable} onClick={() => setShowTable(v => !v)}>
            Show data table
          </ToggleButton>
        )
      }
    >
      <figure className={styles.figure}>
        {tableShown ? (
          // Focusable labelled region so keyboard users can scroll a wide table on narrow screens.
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={`${title} data table`}>
            <Table size="small">
              <caption className="sr-only">{title}</caption>
              <TableHeader>
                <TableRow>
                  {table.columns.map((c, i) => (
                    <TableHeaderCell key={c} scope="col" className={i > 0 ? styles.numericHead : undefined}>
                      {c}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map(r => (
                  <TableRow key={r.join('|')}>
                    {r.map((cell, i) => (
                      <TableCell key={i} className={i > 0 ? styles.numeric : undefined}>
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div ref={ref} className={styles.chart}>
            {width > 0 ? children({ width, height: CHART_HEIGHT }) : <ChartSkeleton height={CHART_HEIGHT} />}
          </div>
        )}
        <figcaption className="sr-only">{summary}</figcaption>
      </figure>
    </Panel>
  )
}
