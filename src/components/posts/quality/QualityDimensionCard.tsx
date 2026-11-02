import { BAND_TEXT, BAND_FILL, DIMENSION_ICON } from './tokens.ts'
import { cn } from '@/lib'
import { scoreBand, type QualityDimensionMeta } from '@/lib/postQuality.ts'
import type { QualityDimension } from '@/types/quality'

/**
 * One dimension's card: the score, and the model's one- or two-sentence
 * verdict on it (CON-438).
 *
 * The suggestions used to live here too, two or three to a card behind a
 * disclosure, with a mandatory "worth tightening" line above them. With at
 * most five across the whole post most cards would hold one line or none, so
 * they moved into one list under the cards (`QualitySuggestionList`) and the
 * card is back to answering a single question: how did this dimension do.
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
            <h3 className="text-sm font-medium text-foreground">
              {meta.blurb}
            </h3>
          </div>
        </div>
        <p className="shrink-0 tabular-nums">
          <span
            className={cn('text-lg font-display font-medium', BAND_TEXT[band])}
          >
            {score}
          </span>
          <span className="text-xs text-tertiary-foreground">/10</span>
        </p>
      </header>

      <div className="px-3 pb-3 flex flex-col gap-2">
        <div className="h-1 w-full bg-quinary">
          <div
            className={cn('h-full', BAND_FILL[band])}
            style={{
              width: `${(Math.min(10, Math.max(0, score)) / 10) * 100}%`,
            }}
          />
        </div>

        {dimension.verdict && (
          <p className="text-sm/[1.5] text-secondary-foreground">
            {dimension.verdict}
          </p>
        )}
      </div>
    </section>
  )
}
