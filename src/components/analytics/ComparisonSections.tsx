import { useState } from 'react'
import { cn } from '@/lib'
import { MultiSeriesChart, RankBar, ToneDot, TrendChart } from './charts'
import { DeltaChip, MeasureTile } from './MeasureTile'
import { Basis, FigureGrid, NotYet, SectionCard } from './shell'
import {
  accumulate,
  delta,
  formatDay,
  formatMeasure,
  measureMeta,
  supports,
} from './format'
import {
  SLEEVE_DIMENSIONS,
  type Insight,
  type MeasureId,
  type NowView,
  type SideBySideView,
} from './types'

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
export function NowSection({ view }: { view: NowView }) {
  const headline = view.readings[0]
  const [selectedMeasure, setSelectedMeasure] = useState<MeasureId | null>(null)
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

  // A flow accumulates into a period total and is drawn as progress; a level
  // is already the number on the day, and summing it would invent a quantity
  // that doesn't exist. See `MeasureMeta.kind`.
  const flow = meta.kind === 'flow'
  const series = flow ? accumulate(reading.series, reading.value) : reading.series
  const previousSeries = !reading.previousSeries
    ? undefined
    : flow
      ? reading.previous !== null
        ? accumulate(reading.previousSeries, reading.previous)
        : undefined
      : reading.previousSeries

  return (
    <SectionCard
      title="What happened"
      scope="lens"
      status={
        <span className="text-xs text-secondary-foreground">
          {anchor ? `Today vs ${anchor}` : view.period.label}
        </span>
      }
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
          <h3 className="text-sm font-medium">
            {flow
              ? `${meta.label} ${anchor ? `since ${anchor}` : `over ${view.period.label.toLowerCase()}`}`
              : `${meta.label} day by day`}
          </h3>
          <Legend
            hasPrevious={Boolean(previousSeries)}
            hasBand={Boolean(reading.expected)}
            anchor={anchor}
          />
        </div>
        <TrendChart
          series={series}
          previousSeries={previousSeries}
          band={reading.expected ?? undefined}
          bandShape={flow ? 'cone' : 'flat'}
          axis={{ left: anchor ?? view.period.label, right: 'Today' }}
        />
        {reading.expected && (
          // Not a footnote. This is the sentence that turns the headline number
          // into a judgement — "184.9K" on its own is unreadable, "184.9K
          // against the 120K–165K we usually reach" is the finding — so it is
          // set in the primary colour and a step above the supporting text.
          <Basis className="text-[13px] text-foreground">
            {formatMeasure(reading.measure, reading.value)}{' '}
            {flow ? 'so far' : 'today'}, against the{' '}
            {formatMeasure(reading.measure, reading.expected.low)}–
            {formatMeasure(reading.measure, reading.expected.high)} this workspace
            normally {flow ? `reaches across ${view.period.days} days` : 'sits at'}.{' '}
            {flow
              ? 'The line is a running total, so it ends on the figure above it.'
              : 'The line is where it stood each day, so it does not add up — it settles.'}
          </Basis>
        )}
      </div>

      {view.insights.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {view.insights.map((i) => (
            <li key={i.id}>
              <InsightLine insight={i} />
            </li>
          ))}
        </ul>
      )}

      <Basis>
        {view.coverage.measured === view.coverage.published
          ? `All ${view.coverage.published} published posts in this period are measured`
          : `${view.coverage.measured} of ${view.coverage.published} published posts are measured — the rest haven't reported yet`}
        {view.coverage.lastRefreshedAt && ` · updated ${view.coverage.lastRefreshedAt}`}
        {/* Saying when it comes back is what turns a stale-looking screen into
            a scheduled one. */}
        {view.coverage.nextRefreshIn && `, next ${view.coverage.nextRefreshIn}`}
      </Basis>
    </SectionCard>
  )
}

function Legend({
  hasPrevious,
  hasBand,
  anchor,
}: {
  hasPrevious: boolean
  hasBand: boolean
  anchor: string | null
}) {
  return (
    <ul className="flex flex-wrap items-center gap-3 text-xs text-tertiary-foreground">
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-foreground" aria-hidden />
        this stretch
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
          {anchor ? `the stretch to ${anchor}` : 'the stretch before'}
        </li>
      )}
      {hasBand && (
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-[2px] bg-quaternary" aria-hidden />
          usual range
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
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm">{insight.text}</p>
        {insight.basis && (
          <p className="text-xs text-tertiary-foreground">{insight.basis}</p>
        )}
        {insight.action && (
          <button
            type="button"
            className="mt-0.5 self-start text-xs font-medium text-foreground underline underline-offset-2"
          >
            {insight.action.label}
          </button>
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
  const meta = measureMeta(view.measure)
  const rows = [...view.rows].sort((a, b) => b.value - a.value)
  const leader = rows[0]?.value ?? 0
  const thin = rows.filter((r) => !supports(r.sleeve.sample, 'rank'))

  if (rows.length < 2) {
    return (
      <SectionCard title="Side by side" scope="lens">
        <NotYet title="Nothing to compare yet">
          There is only one {view.dimension} with measured posts, so there is no
          second thing to hold it against.
        </NotYet>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Side by side"
      scope="lens"
      status={<span className="text-xs text-secondary-foreground">{meta.label}</span>}
    >
      <ul className="flex flex-col">
        <li className="flex items-center gap-3 border-b border-border pb-1.5 text-xs text-tertiary-foreground">
          <span className="flex-1">{SLEEVE_DIMENSIONS[view.dimension]}</span>
          <span className="w-20 text-right">{meta.label}</span>
          <span className="w-16 text-right">per post</span>
          <span className="w-16 text-right">vs before</span>
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
                  <span className={cn('truncate text-sm', weak && 'text-tertiary-foreground')}>
                    {row.sleeve.label}
                  </span>
                  <span className="shrink-0 text-xs text-tertiary-foreground">
                    {row.sleeve.sample} {row.sleeve.sample === 1 ? 'post' : 'posts'}
                  </span>
                </div>
                <RankBar
                  fraction={leader === 0 ? 0 : row.value / leader}
                  tone={row.sleeve.tone ?? 1}
                />
              </div>
              <span className="w-20 text-right text-sm tabular-nums">
                {formatMeasure(view.measure, row.value)}
              </span>
              <span className="w-16 text-right text-sm tabular-nums text-secondary-foreground">
                {formatMeasure(view.measure, row.perPost)}
              </span>
              <span className="flex w-16 justify-end">
                {d ? <DeltaChip delta={d} /> : <span className="text-xs text-tertiary-foreground">—</span>}
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
            {meta.label} day by day
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
        <NotYet title="No call to make yet">
          These sleeves are too close, or too thinly sampled, to say one is
          beating another.
        </NotYet>
      )}

      {thin.length > 0 && (
        <Basis confidence="low">
          {thin.map((r) => r.sleeve.label).join(', ')}{' '}
          {thin.length === 1 ? 'has' : 'have'} fewer than five measured posts —
          shown, but not ranked against the rest.
        </Basis>
      )}
    </SectionCard>
  )
}
