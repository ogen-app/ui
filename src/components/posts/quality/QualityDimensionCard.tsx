import type { ReactNode } from 'react'
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
}: {
  meta: QualityDimensionMeta
  dimension: QualityDimension | undefined
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
          {/* 40px, which is the height of the two-line label stack beside it,
              so the tile reads as the row's leading edge rather than as a
              badge floating in it. */}
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center bg-tertiary"
          >
            {/* Filled, but a step further back in the ramp: a solid glyph at
                20px carries enough weight on its own that the darker ink made
                it compete with the score for the eye. */}
            <Icon className="size-5 text-quaternary-foreground" weight="fill" />
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

        {/* CON-85 makes the model name a weakness for every dimension, even
            on a 10 — it is the counterweight to sycophantic scoring, not a
            finding. A warning triangle said "defect" about a line that is
            mandatory by design; a section label says what it actually is. */}
        {dimension.weakness && (
          <section className="flex flex-col gap-0.5">
            <SubHeader>WORTH TIGHTENING</SubHeader>
            <p className="text-sm/[1.5] text-secondary-foreground">{dimension.weakness}</p>
          </section>
        )}
      </div>

      {suggestions.length > 0 && (
        <Collapse
          // A plain string, so `Collapse` styles it as its own section
          // heading — this is a control the reader is meant to reach for,
          // not a label like the one above it.
          title={`${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`}
          // Collapsed: four cards' worth of open suggestions is a wall, and
          // the score plus the weakness is what most reads need.
          className="border-t border-border px-3"
        >
          {/* `Collapse`'s trigger only carries 8px of its own padding below
              the label, which left the first suggestion sitting on it. */}
          <ul className="flex flex-col gap-2.5 pt-1 pb-3">
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

/**
 * The card's section label. Matches the "NOTES" heading in the post preview
 * panel — the app's existing idiom for naming a block without competing with
 * what is in it. Written in capitals in the copy, so they survive a restyle;
 * small and heavy, with letterspacing to keep the caps legible at 11px, is
 * how a label reads as a label rather than as a quiet first line of the text.
 */
function SubHeader({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold tracking-[0.05em] text-tertiary-foreground">
      {children}
    </span>
  )
}
