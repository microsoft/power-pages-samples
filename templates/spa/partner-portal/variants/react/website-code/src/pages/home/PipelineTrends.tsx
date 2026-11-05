import { Caption1, Subtitle1, makeStyles, shorthands, tokens } from '@fluentui/react-components'
import { VerticalStackedBarChart } from '@fluentui/react-charts'
import type { Opportunity } from '../../data/types'
import { ChartCard } from '../../components/charts'
import { CURRENCY, formatCompactCurrency, formatCurrency } from '../../lib/format'
import { closeDateOf, NEUTRAL_SERIES, OUTCOME_COLOR } from './pipeline'

const CHART_CULTURE = CURRENCY.locale
const CHART_MARGINS = { top: 16, bottom: 36, left: 64, right: 24 }
const MIDDOT = '\u00B7'

type Outcome = 'Won' | 'Open' | 'Lost' | 'Canceled'
const OUTCOMES: { name: Outcome; color: string }[] = [
  { name: 'Won', color: OUTCOME_COLOR.won },
  { name: 'Open', color: OUTCOME_COLOR.open },
  { name: 'Lost', color: OUTCOME_COLOR.lost },
  { name: 'Canceled', color: NEUTRAL_SERIES },
]

const outcomeOf = (o: Opportunity): Outcome => (o.status === 'Won' || o.status === 'Lost' || o.status === 'Canceled' ? o.status : 'Open')

const useStyles = makeStyles({
  head: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalL },
  title: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  sub: { color: tokens.colorNeutralForeground2 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: tokens.spacingHorizontalXXL,
    '@media (min-width: 1024px)': { gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)' },
  },
  bars: { display: 'grid', rowGap: tokens.spacingVerticalL, margin: 0, ...shorthands.padding(tokens.spacingVerticalXS, 0, 0), listStyle: 'none' },
  barTop: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalXS },
  barName: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground1 },
  barValue: { color: tokens.colorNeutralForeground2, fontVariantNumeric: 'tabular-nums' },
  track: {
    display: 'flex',
    height: '12px',
    overflow: 'hidden',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none' },
  },
  legend: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalL, marginTop: tokens.spacingVerticalL, color: tokens.colorNeutralForeground2 },
  swatch: { display: 'inline-block', width: '10px', height: '10px', marginInlineEnd: tokens.spacingHorizontalSNudge, borderRadius: tokens.borderRadiusSmall, '@media (forced-colors: active)': { forcedColorAdjust: 'none' } },
  empty: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
})

export function PipelineTrends({ rows, phrase }: { rows: Opportunity[]; phrase: string }) {
  const styles = useStyles()

  const monthMap = new Map<string, Record<Outcome, number>>()
  for (const o of [...rows].sort((a, b) => closeDateOf(a).localeCompare(closeDateOf(b)))) {
    const key = closeDateOf(o).slice(0, 7)
    const m = monthMap.get(key) ?? { Won: 0, Open: 0, Lost: 0, Canceled: 0 }
    m[outcomeOf(o)] += o.estRevenue
    monthMap.set(key, m)
  }
  const months = [...monthMap].map(([key, totals]) => ({
    key,
    label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    short: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    totals,
  }))
  const series = OUTCOMES.filter(s => months.some(m => m.totals[s.name] > 0))

  const territoryMap = new Map<string, { won: number; open: number }>()
  for (const o of rows) {
    const outcome = outcomeOf(o)
    if (outcome !== 'Won' && outcome !== 'Open') continue
    const t = territoryMap.get(o.territory) ?? { won: 0, open: 0 }
    if (outcome === 'Won') t.won += o.estRevenue
    else t.open += o.estRevenue
    territoryMap.set(o.territory, t)
  }
  const territories = [...territoryMap].map(([name, t]) => ({ name, ...t, total: t.won + t.open })).sort((a, b) => b.total - a.total)
  const maxTerritory = Math.max(1, ...territories.map(t => t.total))

  return (
    <section aria-labelledby="trends-heading">
      <div className={styles.head}>
        <Subtitle1 as="h2" id="trends-heading" className={styles.title}>
          Pipeline trends
        </Subtitle1>
        <Caption1 className={styles.sub}>Opportunities {phrase}</Caption1>
      </div>
      <div className={styles.grid}>
        <ChartCard
          title="Revenue by close month"
          summary={months.map(m => `${m.label}: ${series.map(s => `${s.name} ${formatCurrency(m.totals[s.name])}`).join(', ')}`).join('; ') || 'No data'}
          table={{ columns: ['Close month', ...series.map(s => s.name)], rows: months.map(m => [m.label, ...series.map(s => formatCurrency(m.totals[s.name]))]) }}
        >
          {size =>
            months.length === 0 ? (
              <Caption1 as="p" className={styles.empty}>
                No opportunities {phrase}.
              </Caption1>
            ) : (
              <VerticalStackedBarChart
                {...size}
                culture={CHART_CULTURE}
                margins={CHART_MARGINS}
                roundedTicks
                maxBarWidth={44}
                chartTitle="Revenue by close month"
                yAxisTickFormat={formatCompactCurrency}
                legendProps={{ enabledWrapLines: true }}
                data={months.map(m => ({
                  xAxisPoint: m.short,
                  xAxisCalloutData: m.label,
                  chartData: series.map(s => ({ legend: s.name, data: m.totals[s.name], color: s.color, yAxisCalloutData: formatCurrency(m.totals[s.name]) })),
                }))}
              />
            )
          }
        </ChartCard>

        <ChartCard
          title="Revenue by territory"
          summary={territories.map(t => `${t.name}: ${formatCurrency(t.total)} (${formatCurrency(t.won)} won)`).join('; ') || 'No data'}
          table={{ columns: ['Territory', 'Won', 'Open', 'Total'], rows: territories.map(t => [t.name, formatCurrency(t.won), formatCurrency(t.open), formatCurrency(t.total)]) }}
        >
          {() =>
            territories.length === 0 ? (
              <Caption1 as="p" className={styles.empty}>
                No open or won opportunities {phrase}.
              </Caption1>
            ) : (
              <>
                <ul className={styles.bars}>
                  {territories.map(t => (
                    <li key={t.name}>
                      <div className={styles.barTop}>
                        <span className={styles.barName}>{t.name}</span>
                        <Caption1 className={styles.barValue}>
                          {formatCompactCurrency(t.total)} {MIDDOT} {formatCompactCurrency(t.won)} won
                        </Caption1>
                      </div>
                      <div aria-hidden="true" className={styles.track}>
                        <span style={{ width: `${(t.won / maxTerritory) * 100}%`, backgroundColor: OUTCOME_COLOR.won }} />
                        <span style={{ width: `${(t.open / maxTerritory) * 100}%`, backgroundColor: OUTCOME_COLOR.open }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <div aria-hidden="true" className={styles.legend}>
                  <Caption1>
                    <span className={styles.swatch} style={{ backgroundColor: OUTCOME_COLOR.won }} />
                    Won
                  </Caption1>
                  <Caption1>
                    <span className={styles.swatch} style={{ backgroundColor: OUTCOME_COLOR.open }} />
                    Open
                  </Caption1>
                </div>
              </>
            )
          }
        </ChartCard>
      </div>
    </section>
  )
}
