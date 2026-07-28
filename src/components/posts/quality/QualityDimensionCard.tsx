import { WarningIcon } from '@phosphor-icons/react'
import { Collapse } from '@/components/ui/collapse'
import { BAND_TEXT, BAND_FILL, DIMENSION_FILL } from './tokens.ts'
import { cn } from '@/lib'
import { scoreBand, suggestionsOf, type QualityDimensionMeta } from '@/lib/postQuality.ts'
import type { QualityDimension, QualitySeverity } from '@/types/quality'

/**
 * Severity reads as a tag — the severity colour over a tenth-opacity wash of
 * itself. Matches the assistant's review findings, which use the same
 * high/medium/low vocabulary; they should not look like two different scales.
 */
const SEVERITY_CLASS: Record<QualitySeverity, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-tertiary-foreground/10 text-tertiary-foreground',
}

/**
 * One dimension's card: the score and what the weighting did with it, the
 * model's reasoning, the weakness it was made to name, and the suggestions
 * that fall out of both.
 */
export function QualityDimensionCard({
  meta,
  dimension,
  suggestionsOpen = false,
}: {
  meta: QualityDimensionMeta
  dimension: QualityDimension | undefined
  /** Starts the suggestion list expanded. For the design harness. */
  suggestionsOpen?: boolean
}) {
  // A dimension missing from the payload means a shape we don't understand;
  // drawing a zero would assert a score the model never gave.
  if (!dimension) return null

  const score = dimension.score ?? 0
  const band = scoreBand(score)
  const suggestions = suggestionsOf(dimension)

  return (
    <section className="flex flex-col border border-border">
      <header className="flex items-start justify-between gap-3 px-3 pt-2.5 pb-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {/* Ties this card to its slice of the composition bar above. */}
            <span
              aria-hidden
              className={cn('size-1.5 shrink-0 rounded-full', DIMENSION_FILL[meta.key])}
            />
            <span className="truncate">{meta.label}</span>
          </h3>
          <p className="text-xs text-tertiary-foreground">
            {meta.blurb}
            {meta.platformAware && ' · judged against this channel'}
          </p>
        </div>
        <p className="shrink-0 tabular-nums">
          <span className={cn('text-lg font-display font-medium', BAND_TEXT[band])}>{score}</span>
          <span className="text-xs text-tertiary-foreground">/10</span>
        </p>
      </header>

      <div className="px-3 pb-2.5 flex flex-col gap-2">
        <div>
          <div className="h-1 w-full bg-quinary">
            <div
              className={cn('h-full', BAND_FILL[band])}
              style={{ width: `${(Math.min(10, Math.max(0, score)) / 10) * 100}%` }}
            />
          </div>
          <p className="mt-1 flex justify-between text-xs text-tertiary-foreground tabular-nums">
            {/* The weight is why two posts with the same four scores can land
                on different overalls — it comes from the post's type. */}
            <span>{Math.round((dimension.weight ?? 0) * 100)}% of the overall</span>
            <span>+{(dimension.contribution ?? 0).toFixed(1)} pts</span>
          </p>
        </div>

        {dimension.rationale && (
          <p className="text-sm/[1.5] text-secondary-foreground">{dimension.rationale}</p>
        )}

        {dimension.weakness && (
          <p className="flex items-start gap-1.5 text-sm/[1.5] text-secondary-foreground">
            <WarningIcon
              aria-hidden
              weight="regular"
              className="mt-[3px] size-4 shrink-0 text-warning"
            />
            <span>{dimension.weakness}</span>
          </p>
        )}
      </div>

      {suggestions.length > 0 && (
        <Collapse
          // Collapsed by default: four cards' worth of open suggestions is a
          // wall, and the score plus the weakness is what most reads need.
          title={`${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`}
          defaultOpen={suggestionsOpen}
          className="border-t border-border px-3"
        >
          <ul className="flex flex-col gap-2.5 pb-3">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                    {suggestion.issue}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 px-[3px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.08em]',
                      SEVERITY_CLASS[suggestion.severity] ?? SEVERITY_CLASS.low,
                    )}
                  >
                    {suggestion.severity}
                  </span>
                </div>
                {suggestion.fix && (
                  <p className="text-sm/[1.5] text-secondary-foreground">→ {suggestion.fix}</p>
                )}
                {/* The quoted span is the point of a suggestion — it is what
                    makes "tighten the hook" into something you can act on. */}
                {suggestion.span && (
                  <p className="border-l-2 border-quinary pl-2 text-xs/[1.5] italic text-tertiary-foreground">
                    {suggestion.span}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Collapse>
      )}
    </section>
  )
}
