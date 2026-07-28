import { WarningIcon } from '@phosphor-icons/react'
import { Collapse } from '@/components/ui/collapse'
import { BAND_TEXT, BAND_FILL, DIMENSION_ICON } from './tokens.ts'
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
  const Icon = DIMENSION_ICON[meta.key]

  return (
    <section className="flex flex-col border border-border">
      <header className="flex items-start justify-between gap-3 px-3 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center bg-secondary"
          >
            <Icon className="size-4 text-secondary-foreground" weight="regular" />
          </span>
          <div className="min-w-0">
            {/* The name is the quieter line. What the reader needs is what the
                number is a verdict *on* — "true and well-formed" — and the
                dimension's name is only the filing label for it. */}
            <p className="text-xs text-tertiary-foreground">
              {meta.label}
              {meta.platformAware && ' · this channel'}
            </p>
            <h3 className="text-sm font-medium text-foreground">{meta.blurb}</h3>
          </div>
        </div>
        <p className="shrink-0 tabular-nums">
          <span className={cn('text-lg font-display font-medium', BAND_TEXT[band])}>{score}</span>
          <span className="text-xs text-tertiary-foreground">/10</span>
        </p>
      </header>

      <div className="px-3 pb-3 flex flex-col gap-2">
        <div className="h-1 w-full bg-quinary">
          <div
            className={cn('h-full', BAND_FILL[band])}
            style={{ width: `${(Math.min(10, Math.max(0, score)) / 10) * 100}%` }}
          />
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
