import { WarningIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import {
  bandLabel,
  QUALITY_DIMENSIONS,
  isAssessmentStale,
  overallBand,
  overallPct,
  scoreBand,
  type QualityDimensionMeta,
} from '@/lib/postQuality.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import type { PostEvaluation } from '@/types/quality'
import { Button } from '@/components/ui/button.tsx'
import { ScoreRing } from './ScoreRing.tsx'
import { BAND_TEXT, DIMENSION_ICON } from './tokens.ts'

type Props = {
  assessment: PostEvaluation
  /** The live post's `updated_at` — what the staleness check reads. */
  postUpdatedAt: string
  onOpenPanel: () => void
}

/**
 * The quality score as it appears inside the expanded checks bar (CON-183).
 *
 * Three columns: the overall with everything that qualifies it, then the four
 * dimensions two to a column. The rail's composition bar is not repeated —
 * the ring already draws the overall, and two pictures of one number is the
 * same fact twice.
 *
 * A digest, not a second panel. Everything that needs reading rather than
 * glancing — the model's reasoning, the named weakness, the suggestions
 * themselves — stays in the rail, which this links to. Two full breakdowns
 * would be two things to keep in step and twice the height above the editor.
 *
 * Only ever rendered against a stored assessment. The states around one —
 * never scored, running, failed, switched off — belong to the bar's header,
 * where they stay reachable without expanding anything.
 */
export function QualityInlineSummary({
  assessment,
  postUpdatedAt,
  onOpenPanel,
}: Props) {
  const { t } = useTranslation()
  const pct = overallPct(assessment)
  const band = overallBand(pct)
  const stale = isAssessmentStale(assessment, postUpdatedAt)
  const scored = relativeTime(assessment.updated_at)

  return (
    // The rule and the space around it are what separate this from the
    // requirements list above — matching the `pt-5` that opens that one, so
    // both sections stand off their neighbours by the same amount.
    <section className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
      {/* The app's section-label typography — `AppSidebar`'s `SectionLabel`
          recipe. This region sits inside a bar that is already about the post,
          so it needs to say which of the two questions it answers, and a
          heading in the same voice as the sidebar's says "new section" without
          competing with anything in the editor. */}
      <h3 className="font-grotesk text-xs/4 font-medium uppercase text-tertiary-foreground">
        Post content quality
      </h3>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
        <div className="flex items-center gap-3">
          <ScoreRing pct={pct} band={band} />
          {/* The verdict and its date, and nothing else. Anything further
              beside the ring makes a three-line column against two-line ones
              and drags the grid out of alignment for a fact that reads just as
              well below it. */}
          <div className="flex min-w-0 flex-col">
            {/* The band alone. "Overall quality:" repeated the heading two
                rows up, and the ring beside it already says this is the
                overall — the label was only there to introduce a word that
                needs no introduction. */}
            <p className="text-sm font-medium text-foreground">
              {bandLabel(t, band)}
            </p>
            <p className="text-sm text-tertiary-foreground">
              {scored ? `Scored ${scored}` : 'Scored'}
            </p>
          </div>
        </div>

        {/* Two per column in the order CON-85 defines them, so the pairing
            matches the rail's list rather than inventing a second order. The
            last column drops the gutter its scores would otherwise sit on:
            there is no next column for them to collide with, and keeping it
            left the row's right edge ragged against the section's. */}
        <DimensionColumn
          assessment={assessment}
          metas={QUALITY_DIMENSIONS.slice(0, 2)}
        />
        <DimensionColumn
          assessment={assessment}
          metas={QUALITY_DIMENSIONS.slice(2)}
          last
        />
      </div>

      {stale && (
        <p className="flex items-start gap-1.5 text-sm/[1.5] text-secondary-foreground">
          <WarningIcon
            aria-hidden
            weight="regular"
            className="mt-[3px] size-4 shrink-0 text-warning"
          />
          <span>
            This post has been edited since it was scored — re-assess to see
            where it stands now.
          </span>
        </p>
      )}

      {/* Its own row under everything it summarises: the button is the one
          thing here that does something, and beside the ring it was competing
          with the score for the same corner of the eye.

          `-ml-3` cancels the ghost's own left padding so the label starts on
          the section's left edge rather than inside it — the padding is there
          for the hover surface, not for indentation. `uppercase` matches every
          other button in the quality rail. */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenPanel}
          className="-ml-3 uppercase"
        >
          See the full breakdown
        </Button>
      </div>
    </section>
  )
}

function DimensionColumn({
  assessment,
  metas,
  last = false,
}: {
  assessment: PostEvaluation
  metas: QualityDimensionMeta[]
  /** The rightmost column, which needs no gutter against a next one. */
  last?: boolean
}) {
  return (
    <ul className="flex flex-col justify-center gap-1.5">
      {metas.map((meta) => {
        const dimension = assessment.result?.[meta.key]
        // A dimension missing from the payload is a shape we don't understand;
        // drawing a zero would assert a score the model never gave.
        if (!dimension) return null
        const score = dimension.score ?? 0
        const Icon = DIMENSION_ICON[meta.key]
        return (
          <li key={meta.key} className="flex items-center gap-2 text-sm">
            <Icon
              aria-hidden
              weight="fill"
              className="size-4 shrink-0 text-quaternary-foreground"
            />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {meta.label}
            </span>
            {/* `pr-4` on top of the grid's column gap: the score sits on the
                column's right edge, which is otherwise the next column's left
                edge, and "10/10" ended up touching "Engagement". The last
                column has nothing to its right, so it goes without. */}
            <span
              className={cn('shrink-0 text-xs tabular-nums', !last && 'pr-4')}
            >
              <span
                className={cn(
                  'font-display font-medium',
                  BAND_TEXT[scoreBand(score)],
                )}
              >
                {score}
              </span>
              <span className="text-tertiary-foreground">/10</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
