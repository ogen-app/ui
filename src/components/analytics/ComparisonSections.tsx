import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import {
  ColumnChart,
  EmptyChart,
  MultiSeriesChart,
  publicationsWithin,
  RankBar,
  ToneDot,
  TrendChart,
} from './charts'
import { DeltaChip, MeasureTile } from './MeasureTile'
import { Basis, FigureGrid, NotYet, SectionCard } from './shell'
import {
  accumulate,
  delta,
  drawnSeries,
  formatDay,
  formatMeasure,
  measureCopy,
  measureMeta,
  periodPhrase,
  supports,
} from './format'
import type { Insight, MeasureId, NowView, SideBySideView } from './types'

/* ------------------------------------------------------------------ now -- */

/**
 * The temporal axis: this sleeve, now against before.
 *
 * The card flow (see `FigureGrid`): every measure as a key figure, the
 * selected one drawn out underneath, then what we make of it, then the notes.
 * Ordered that way because that is the order the question arrives in — a chart
 * shows that something moved, and a sentence says what moved it.
 *
 * The figures are selectable rather than the chart being pinned to the
 * headline. Reach is the first question, not the only one, and "engagement
 * rate slipped while reach rose" is a sentence the reader should be able to
 * check rather than take from us.
 */
export function NowSection({
  view,
  initialMeasure,
  everyPlatform = false,
}: {
  view: NowView
  /** Which tab opens. Omit for the headline measure. */
  initialMeasure?: MeasureId
  /** Whether a platform filter above this card reaches it. See `SectionCard`. */
  everyPlatform?: boolean
}) {
  const { t } = useTranslation()
  const headline = view.readings[0]
  const [selectedMeasure, setSelectedMeasure] = useState<MeasureId | null>(
    initialMeasure ?? null,
  )

  const window = periodPhrase(t, view.period)

  // Nothing has reported. The frame stays and the plot is empty — a flat line
  // along the floor of an axis is a picture of *no reach*, and what is true is
  // *no numbers yet*. Keeping the frame also keeps the card the size it will be
  // once the figures land, rather than growing a chart under the reader an hour
  // later.
  if (view.coverage.measured === 0) {
    return (
      <SectionCard
        title={t('analytics.now.title')}
        qualifier={window}
        scope="lens"
        everyPlatform={everyPlatform}
      >
        <EmptyChart />
        <p className="text-[13px] text-secondary-foreground">
          {view.coverage.published === 0
            ? t('analytics.now.noDataNothingOut')
            : t('analytics.now.noDataNotReported', {
                count: view.coverage.published,
              })}
        </p>
        <Freshness at={view.coverage.lastRefreshedAt} />
      </SectionCard>
    )
  }

  if (!headline) return null

  // Named days, not "the period before". The reader should never have to do
  // subtraction to work out what the number on the left is being held against.
  const anchor = view.comparedToDate ? formatDay(view.comparedToDate) : null

  // Falls back rather than resetting: switching period can retire a measure,
  // and a card that empties itself because of that is worse than one that
  // quietly returns to the headline.
  const reading =
    view.readings.find((r) => r.measure === selectedMeasure) ?? headline
  const meta = measureMeta(reading.measure)
  const copy = measureCopy(t, reading.measure)

  // A flow accumulates into a period total and is drawn as progress; a level
  // is already the number on the day, and summing it would invent a quantity
  // that doesn't exist. See `MeasureMeta.kind`. Decided in `drawnSeries` rather
  // than here, because the tiles above have to draw the same shape.
  const flow = meta.kind === 'flow'
  const columns = meta.chart === 'columns'
  const series = drawnSeries(meta, reading.series, reading.value)
  // A ghost of the previous stretch works behind a line and not behind columns
  // — two sets of bars at the same dates read as a comparison of two things on
  // the same day, which is the one thing they are not.
  // Decided once, on the dates the chart is actually drawn over, so the legend
  // and the rail can never disagree about whether anything went out.
  const publications = publicationsWithin(reading.series, view.publications)
  const previousSeries =
    columns || !reading.previousSeries
      ? undefined
      : flow
        ? reading.previous !== null
          ? accumulate(reading.previousSeries, reading.previous)
          : undefined
        : reading.previousSeries

  return (
    <SectionCard
      title={t('analytics.now.title')}
      qualifier={window}
      scope="lens"
      everyPlatform={everyPlatform}
    >
      <FigureGrid>
        {view.readings.map((r) => (
          <MeasureTile
            key={r.measure}
            reading={r}
            comparedTo={anchor}
            selected={r.measure === reading.measure}
            onSelect={() => setSelectedMeasure(r.measure)}
          />
        ))}
      </FigureGrid>

      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {/*
            The chart's own name, a step up in size, because it is the answer to
            "which of those tiles am I looking at" — a question the reader asks
            after every switch. The window is not repeated here: it is in the
            title, and the dates are on the axis.
          */}
          <h3 className="font-display text-base font-medium">
            {copy.periodLabel}
          </h3>
          <Legend
            columns={columns}
            hasPrevious={Boolean(previousSeries)}
            hasBand={Boolean(reading.expected)}
            hasPublications={publications.length > 0}
            anchor={anchor}
          />
        </div>
        {columns ? (
          <ColumnChart
            series={series}
            band={reading.expected ?? undefined}
            publications={publications}
            endLabel={t('analytics.charts.today')}
            formatValue={(v) => formatMeasure(t, reading.measure, v)}
          />
        ) : (
          <TrendChart
            series={series}
            previousSeries={previousSeries}
            band={reading.expected ?? undefined}
            bandShape={flow ? 'cone' : 'flat'}
            publications={publications}
            endLabel={t('analytics.charts.today')}
            formatValue={(v) => formatMeasure(t, reading.measure, v)}
            // The legend's own wording. The hover card names the same two lines
            // the key above it does, and two names for one line is two lines.
            previousLabel={
              anchor
                ? t('analytics.charts.legendStretchTo', { day: anchor })
                : t('analytics.charts.legendStretchBefore')
            }
          />
        )}
      </div>

      {/*
        No prose under the chart. The tile above already says which side of
        usual this is on, the band draws the range it is being held against,
        and a paragraph restating both in words was the third telling of one
        fact. What is left here is what the chart cannot say for itself.
      */}
      {view.insights.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {view.insights.map((i) => (
            <li key={i.id}>
              <InsightLine insight={i} />
            </li>
          ))}
        </ul>
      )}

      <Freshness at={view.coverage.lastRefreshedAt} />
    </SectionCard>
  )
}

/**
 * When these numbers last moved.
 *
 * The whole of the card's footnote. Everything a reader has to be told about a
 * figure belongs beside the figure — the tile says whether it is unusual, the
 * empty state says when there is nothing — which leaves the foot of the card
 * for the one fact that applies to all of it at once.
 */
function Freshness({ at }: { at?: string }) {
  const { t } = useTranslation()
  if (!at) return null
  return <Basis>{t('analytics.now.updated', { when: at })}</Basis>
}

function Legend({
  columns = false,
  hasPrevious,
  hasBand,
  hasPublications,
  anchor,
}: {
  /** Whether the chart is drawn as columns — the key has to match the ink. */
  columns?: boolean
  hasPrevious: boolean
  hasBand: boolean
  /** Whether the rail of publication marks is under the plot. */
  hasPublications: boolean
  anchor: string | null
}) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-wrap items-center gap-3 text-xs text-tertiary-foreground">
      <li className="flex items-center gap-1.5">
        {columns ? (
          <span
            className="h-2.5 w-1.5 rounded-[1px] bg-quaternary-foreground"
            aria-hidden
          />
        ) : (
          <span className="h-0.5 w-4 rounded-full bg-foreground" aria-hidden />
        )}
        {columns
          ? t('analytics.charts.legendEachDay')
          : t('analytics.charts.legendThisStretch')}
      </li>
      {hasPrevious && (
        <li className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 rounded-full bg-quinary-foreground"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 5px)',
            }}
            aria-hidden
          />
          {anchor
            ? t('analytics.charts.legendStretchTo', { day: anchor })
            : t('analytics.charts.legendStretchBefore')}
        </li>
      )}
      {hasBand && (
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-[2px] bg-quaternary" aria-hidden />
          {t('analytics.charts.legendUsualRange')}
        </li>
      )}
      {hasPublications && (
        <li className="flex items-center gap-1.5">
          {/* The mark itself, at its own size. A key that redraws a hairline as
              a swatch teaches the reader to look for the wrong ink. */}
          <span
            className="h-2.5 w-[1.5px] bg-tertiary-foreground"
            aria-hidden
          />
          {t('analytics.charts.legendPublication')}
        </li>
      )}
    </ul>
  )
}

/** One sentence the surface is willing to say, with its receipts underneath. */
export function InsightLine({ insight }: { insight: Insight }) {
  return (
    <div className="flex gap-2.5 rounded-md bg-secondary px-3.5 py-2.5">
      <span
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          insight.tone === 'positive'
            ? 'bg-positive'
            : insight.tone === 'negative'
              ? 'bg-negative'
              : 'bg-quaternary-foreground',
        )}
        aria-hidden
      />
      {/*
        A finding and nothing else. The "see those two posts" links that used to
        sit here were writing cheques the app can't cash yet — every one of them
        needs a filtered destination that doesn't exist, and a dead link under a
        finding costs more trust than the link would have saved.
      */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm">{insight.text}</p>
        {insight.basis && (
          <p className="text-xs text-tertiary-foreground">{insight.basis}</p>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- side by side -- */

/**
 * The sleeve axis: several sleeves, one period, ranked.
 *
 * This is the "where do I put my energy" question, so the per-post column is
 * not optional decoration — a platform can lead on totals purely because it
 * received three times as many posts, and the totals column alone would send
 * someone to double down on their worst-performing channel.
 */
export function SideBySideSection({ view }: { view: SideBySideView }) {
  const { t } = useTranslation()
  const copy = measureCopy(t, view.measure)
  const rows = [...view.rows].sort((a, b) => b.value - a.value)
  const leader = rows[0]?.value ?? 0
  const thin = rows.filter((r) => !supports(r.sleeve.sample, 'rank'))

  if (rows.length < 2) {
    return (
      <SectionCard title={t('analytics.sideBySide.title')} scope="lens">
        <NotYet title={t('analytics.sideBySide.nothingTitle')}>
          {t('analytics.sideBySide.nothingBody', {
            dimension: t(`analytics.sleeves.${view.dimension}` as const),
          })}
        </NotYet>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title={t('analytics.sideBySide.title')}
      scope="lens"
      status={
        <span className="text-xs text-secondary-foreground">{copy.label}</span>
      }
    >
      <ul className="flex flex-col">
        <li className="flex items-center gap-3 border-b border-border pb-1.5 text-xs text-tertiary-foreground">
          <span className="flex-1">
            {t(`analytics.sleeves.${view.dimension}` as const)}
          </span>
          <span className="w-20 text-right">{copy.label}</span>
          <span className="w-16 text-right">
            {t('analytics.sideBySide.perPost')}
          </span>
          <span className="w-16 text-right">
            {t('analytics.sideBySide.vsBefore')}
          </span>
        </li>
        {rows.map((row) => {
          const d = delta(view.measure, row.value, row.previous)
          const weak = !supports(row.sleeve.sample, 'rank')
          return (
            <li
              key={row.sleeve.id}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <ToneDot tone={row.sleeve.tone} />
                  <span
                    className={cn(
                      'truncate text-sm',
                      weak && 'text-tertiary-foreground',
                    )}
                  >
                    {row.sleeve.label}
                  </span>
                  <span className="shrink-0 text-xs text-tertiary-foreground">
                    {t('analytics.units.posts', { count: row.sleeve.sample })}
                  </span>
                </div>
                <RankBar
                  fraction={leader === 0 ? 0 : row.value / leader}
                  tone={row.sleeve.tone ?? 1}
                />
              </div>
              <span className="w-20 text-right text-sm tabular-nums">
                {formatMeasure(t, view.measure, row.value)}
              </span>
              <span className="w-16 text-right text-sm tabular-nums text-secondary-foreground">
                {formatMeasure(t, view.measure, row.perPost)}
              </span>
              <span className="flex w-16 justify-end">
                {d ? (
                  <DeltaChip delta={d} />
                ) : (
                  <span className="text-xs text-tertiary-foreground">
                    {t('analytics.units.none')}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      {/*
        One chart, one scale. Stacked sparklines each normalised to their own
        range drew Video at the same height as Carousel while it earned a third
        as much — the section's entire job, rendered backwards.
      */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">
            {t('analytics.sideBySide.dayByDay', { measure: copy.label })}
          </h3>
          <ul className="flex flex-wrap items-center gap-3 text-xs text-secondary-foreground">
            {rows.map((row) => (
              <li key={row.sleeve.id} className="flex items-center gap-1.5">
                <ToneDot tone={row.sleeve.tone} />
                {row.sleeve.label}
              </li>
            ))}
          </ul>
        </div>
        <MultiSeriesChart
          series={rows.map((row) => ({
            id: row.sleeve.id,
            label: row.sleeve.label,
            tone: row.sleeve.tone ?? 1,
            points: row.series,
          }))}
        />
      </div>

      {view.verdict ? (
        <InsightLine insight={view.verdict} />
      ) : (
        <NotYet title={t('analytics.sideBySide.noCallTitle')}>
          {t('analytics.sideBySide.noCallBody')}
        </NotYet>
      )}

      {thin.length > 0 && (
        <Basis>
          {t('analytics.sideBySide.thin', {
            count: thin.length,
            sleeves: thin.map((r) => r.sleeve.label).join(', '),
          })}
        </Basis>
      )}
    </SectionCard>
  )
}
