import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { Sparkline } from './charts'
import { FigureTile } from './shell'
import {
  delta,
  formatDelta,
  formatMeasure,
  measureMeta,
  verdict,
  verdictIsGood,
  type Delta,
} from './format'
import type { MeasureReading } from './types'

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
  const meta = measureMeta(reading.measure)
  const d = delta(reading.measure, reading.value, reading.previous)
  const v = verdict(reading.value, reading.expected)

  return (
    <FigureTile selected={selected} onSelect={onSelect} className={className}>
      {/* The label names the number — it is read, not skimmed past. */}
      <span className="text-xs text-secondary-foreground truncate" title={meta.hint}>
        {meta.label}
      </span>

      {/*
        One size for every figure. The row is a comparison, and a bigger number
        on the left says "this one matters more" when what it actually means is
        "this one is first" — the selection outline and the chart underneath
        already say which one is being read.
      */}
      <span className="font-display text-2xl font-medium leading-none truncate">
        {formatMeasure(reading.measure, reading.value)}
      </span>

      {/*
        The comparison day is named once, in the card's header, and carried
        here as a tooltip. Five tiles each repeating "vs 15 Jul" is the same
        fact five times in a 740px column, and it crowds out the figures the
        row exists to make comparable.
      */}
      <div className="flex items-center gap-2">
        {d ? (
          <DeltaChip delta={d} title={comparedTo ? `vs ${comparedTo}` : undefined} />
        ) : (
          <span className="text-xs text-tertiary-foreground">nothing to compare</span>
        )}
      </div>

      {v && (
        // Short, because the sentence it summarises is already under the chart:
        // "184.9K so far, against the 120K–165K this workspace normally
        // reaches". Here it only has to say which side of usual this is on.
        <span
          className={cn(
            'text-xs',
            v === 'within'
              ? 'text-tertiary-foreground'
              : verdictIsGood(reading.measure, v)
                ? 'text-positive'
                : 'text-negative',
          )}
        >
          {v === 'within' ? 'Normal for you' : v === 'above' ? 'Above usual' : 'Below usual'}
        </span>
      )}

      {/*
        Every tile, not just the headline. A number with no shape behind it is
        a number someone has to take on trust: interactions at 9,310 could be
        one good day or four steady weeks, and those call for different work.
      */}
      {reading.series.length > 1 && (
        <Sparkline
          points={reading.series}
          direction={d?.direction ?? 'neutral'}
          className="mt-auto pt-2"
        />
      )}
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
      {formatDelta(d)}
    </span>
  )
}
