import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { Sparkbars, Sparkline } from './charts'
import { FigureTile } from './shell'
import {
  delta,
  drawnSeries,
  formatDelta,
  formatMeasure,
  measureCopy,
  measureMeta,
  verdict,
  verdictIsGood,
  type Delta,
  type Verdict,
} from './format'
import type { MeasureId, MeasureReading, PostMetric } from './types'

/**
 * One measure, with both halves of the temporal axis.
 *
 * The delta answers "different from before". The expectation answers "unusual
 * for us" — and the second is the one that earns someone's attention, because
 * a 20% rise in a workspace that swings 40% either way every month is not
 * news. Showing only the first is how dashboards train people to ignore them.
 */
export function MeasureTile({
  reading,
  comparedTo,
  selected,
  onSelect,
  className,
}: {
  reading: MeasureReading
  /** `15 Jul` — the day the delta is measured against, never a phrase. */
  comparedTo: string | null
  /** Whether the chart below the row is currently showing this measure. */
  selected?: boolean
  onSelect?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const meta = measureMeta(reading.measure)
  const copy = measureCopy(t, reading.measure)
  const d = delta(reading.measure, reading.value, reading.previous)
  const v = verdict(reading.value, reading.expected)

  // The shape the detail chart draws, from the one place that decides it. The
  // tile and the chart below are a single measure over a single window, and a
  // jagged daily shape above a monotone climb reads as one of the two being
  // wrong. It settles the tile with itself too: the label says "Cumulative
  // reach" and the figure is a period total, which left the sparkline the odd
  // one out inside its own tile.
  const columns = meta.chart === 'columns'
  const points = drawnSeries(meta, reading.series, reading.value)

  return (
    <FigureTile selected={selected} onSelect={onSelect} className={className}>
      {/*
        The label names the number — it is read, not skimmed past — and it names
        it the way this card is showing it. "Reach" and "Followers" in the same
        row invite both to be read as period totals; "Cumulative reach" beside
        "Current followers" costs a word and says which is which.
      */}
      {/* Wraps rather than truncates. The label is what makes the figure
          readable, and "Cumulative intera…" costs more than a second line. */}
      <span className="text-xs text-secondary-foreground" title={copy.hint}>
        {copy.periodLabel}
      </span>

      {/*
        One size for every figure. The row is a comparison, and a bigger number
        on the left says "this one matters more" when what it actually means is
        "this one is first" — the selection outline and the chart underneath
        already say which one is being read.
      */}
      <span className="font-display text-2xl font-medium leading-none truncate">
        {formatMeasure(t, reading.measure, reading.value)}
      </span>

      {/*
        The comparison day is named once, in the card's header, and carried
        here as a tooltip. Five tiles each repeating "vs 15 Jul" is the same
        fact five times in a 740px column, and it crowds out the figures the
        row exists to make comparable.
      */}
      <div className="flex items-center gap-2">
        {d ? (
          <DeltaChip
            delta={d}
            title={
              comparedTo
                ? t('analytics.tile.vsDay', { day: comparedTo })
                : undefined
            }
          />
        ) : (
          <span className="text-xs text-tertiary-foreground">
            {t('analytics.tile.nothingToCompare')}
          </span>
        )}
      </div>

      <VerdictLine measure={reading.measure} verdict={v} />

      {/*
        Every tile, not just the headline. A number with no shape behind it is
        a number someone has to take on trust: interactions at 9,310 could be
        one good day or four steady weeks, and those call for different work.
      */}
      {points.length > 1 &&
        (columns ? (
          <Sparkbars
            points={points}
            direction={d?.direction ?? 'neutral'}
            className="mt-auto pt-2"
          />
        ) : (
          <Sparkline
            points={points}
            direction={d?.direction ?? 'neutral'}
            className="mt-auto pt-2"
          />
        ))}
    </FigureTile>
  )
}

export function DeltaChip({
  delta: d,
  title,
  className,
}: {
  delta: Delta
  /** `vs 15 Jul` — which day the movement is measured against. */
  title?: string
  className?: string
}) {
  const { t } = useTranslation()
  const Icon =
    d.direction === 'up'
      ? ArrowUpRightIcon
      : d.direction === 'down'
        ? ArrowDownRightIcon
        : ArrowRightIcon

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        d.direction === 'flat'
          ? 'text-tertiary-foreground'
          : d.good
            ? 'text-positive'
            : 'text-negative',
        className,
      )}
    >
      <Icon className="size-3 shrink-0" weight="bold" aria-hidden />
      {formatDelta(t, d)}
    </span>
  )
}

/**
 * The same tile, on a single post.
 *
 * Deliberately the same anatomy as {@link MeasureTile} — label, figure,
 * comparison, which side of usual — because the post card is the campaign card
 * asked about one post, and two visual languages for one idea is two things to
 * learn. Only what is compared differs: a period has a *previous period*, a post
 * has *a typical post of yours*, and neither is the other.
 *
 * The plain label, not the period one. "Cumulative reach" names a total earned
 * across a window; on one post the number is just its reach, and borrowing the
 * period word would imply a window that isn't there.
 *
 * Not selectable, unlike the period tile. On the campaign card selection is
 * what lets five figures share one chart; on a post every measure already has a
 * card of its own with its own history under it, so a tile that could be pressed
 * would be a second way to reach something already on screen.
 */
export function PostMeasureTile({
  metric,
  ageCorrected,
  className,
}: {
  metric: PostMetric
  /**
   * Whether `typical` is what a typical post had earned *by this age* rather
   * than what one finishes on. It changes only the tooltip, but it is the
   * difference between an honest comparison and the age lie.
   */
  ageCorrected: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const copy = measureCopy(t, metric.measure)
  const d = delta(metric.measure, metric.value, metric.typical ?? null)
  const v = verdict(metric.value, metric.expected ?? null)

  return (
    <FigureTile className={className}>
      <span className="text-xs text-secondary-foreground" title={copy.hint}>
        {copy.label}
      </span>

      <span className="font-display text-2xl font-medium leading-none truncate">
        {formatMeasure(t, metric.measure, metric.value)}
      </span>

      <div className="flex items-center gap-2">
        {d ? (
          <DeltaChip
            delta={d}
            title={
              ageCorrected
                ? t('analytics.tile.vsTypicalAtAge')
                : t('analytics.tile.vsTypical')
            }
          />
        ) : (
          // Not "nothing to compare": on a post the thing missing is a history
          // to compare *against*, and saying so is the difference between a
          // young workspace and a broken card.
          <span className="text-xs text-tertiary-foreground">
            {t('analytics.tile.noTypicalYet')}
          </span>
        )}
      </div>

      <VerdictLine measure={metric.measure} verdict={v} />
    </FigureTile>
  )
}

/**
 * Which side of usual a figure falls on — the one line both tiles share.
 *
 * Short, because the range it summarises is drawn behind the chart on the
 * campaign card and named in the note on the post card. Here it only has to say
 * which side of usual this is on, and colour it the way the measure runs.
 *
 * Exported because the post's measure cards carry the same line beside a figure
 * that is too big to sit in a tile — one sentence, one wording, one place it can
 * be argued with.
 */
export function VerdictLine({
  measure,
  verdict: v,
}: {
  measure: MeasureId
  verdict: Verdict | null
}) {
  const { t } = useTranslation()
  if (!v) return null
  return (
    <span
      className={cn(
        'text-xs',
        v === 'within'
          ? 'text-tertiary-foreground'
          : verdictIsGood(measure, v)
            ? 'text-positive'
            : 'text-negative',
      )}
    >
      {v === 'within'
        ? t('analytics.tile.verdictWithin')
        : v === 'above'
          ? t('analytics.tile.verdictAbove')
          : t('analytics.tile.verdictBelow')}
    </span>
  )
}
