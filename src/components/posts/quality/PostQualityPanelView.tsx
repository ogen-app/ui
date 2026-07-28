import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowClockwiseIcon,
  GearSixIcon,
  SparkleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { QualityEmptyState } from './QualityEmptyState.tsx'
import {
  QUALITY_DIMENSIONS,
  isAssessmentStale,
  overallBand,
  overallPct,
  totalSuggestions,
  type QualityBand,
} from '@/lib/postQuality.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import { cn } from '@/lib'
import type { PostEvaluation } from '@/types/quality'
import { AssessProgress } from './AssessProgress.tsx'
import { QualityDimensionCard } from './QualityDimensionCard.tsx'
import { BAND_FILL, BAND_TEXT } from './tokens.ts'

export type PostQualityPanelViewProps = {
  /** `null` means never assessed; `undefined` means not loaded yet. */
  assessment: PostEvaluation | null | undefined
  /** The live post's `updated_at` — what the staleness check reads. */
  postUpdatedAt: string
  loading: boolean
  unavailable: boolean
  loadError: string | null
  onReload: () => void
  onAssess: () => void
  assessing: boolean
  steps: string[]
  cached: boolean
  assessError: string | null
  onClose?: () => void
}

/**
 * "Quality" for the right sidebar: the post scored across the four CON-85
 * dimensions, with the guidance that falls out of the scoring.
 *
 * The score is advisory and costs a model call to produce, so nothing here
 * runs on its own — the panel shows what is stored and the user asks for the
 * rest. What it does do is say when the stored score no longer describes the
 * post in the editor, which is the failure mode of a cached assessment.
 *
 * Presentational, and stays that way: every state it can be in is reachable
 * from props alone. `PostQualityPanel` is the container that feeds it from
 * the API.
 */
export function PostQualityPanelView({
  assessment,
  postUpdatedAt,
  loading,
  unavailable,
  loadError,
  onReload,
  onAssess,
  assessing,
  steps,
  cached,
  assessError,
  onClose,
}: PostQualityPanelViewProps) {
  const suggestions = assessment ? totalSuggestions(assessment) : 0

  return (
    <RailPanel
      title="Quality"
      onClose={onClose}
      className="h-full"
      // The empty states centre themselves in whatever height is left, so the
      // body has to claim it rather than hug its content.
      bodyClassName="flex-1"
      titleAdornment={
        assessment && suggestions > 0 ? (
          <span className="text-sm text-tertiary-foreground">
            {suggestions} suggestion{suggestions === 1 ? '' : 's'}
          </span>
        ) : undefined
      }
      // Pinned to the foot of the rail like the assistant's composer: the
      // action that runs the panel belongs at the bottom, in one place,
      // rather than moving as the body scrolls. Only once there is a result
      // — before that the call to action is the body, where it explains
      // itself.
      footer={
        assessment && !unavailable ? (
          <Button
            type="button"
            variant="outline"
            // `justify-center`: the button base is `inline-flex` with no
            // justification, so at full width the label would sit against the
            // left edge with the rest of the row empty.
            className="w-full justify-center uppercase"
            onClick={onAssess}
            loading={assessing}
            disabled={assessing}
          >
            <ArrowClockwiseIcon />
            <span>{assessing ? 'Assessing this post…' : 'Re-assess this post'}</span>
          </Button>
        ) : undefined
      }
      footerFade={12}
    >
      {unavailable ? (
        <QualityEmptyState
          lines={[
            'Scoring is switched off for this workspace.',
            'Someone with admin rights can turn it on in settings.',
          ]}
          action={
            <Button variant="outline" className="uppercase" asChild>
              <Link to="/workspace-settings">
                <GearSixIcon />
                <span>Go to workspace settings</span>
              </Link>
            </Button>
          }
        />
      ) : assessing ? (
        <AssessProgress steps={steps} />
      ) : loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : loadError ? (
        <QualityEmptyState
          lines={[
            'Oops, something broke.',
            "We couldn't fetch this post's score just now.",
          ]}
          action={
            <Button variant="outline" className="uppercase" onClick={onReload}>
              <ArrowClockwiseIcon />
              {/* Reload, not re-assess: the score may well be sitting there
                  intact, and a failed fetch is no reason to pay for a run. */}
              <span>Try again</span>
            </Button>
          }
        />
      ) : assessError && !assessment ? (
        <QualityEmptyState
          lines={[
            'Oops, something broke.',
            'The assessment stopped before it finished. Nothing was saved, so running it again is safe.',
          ]}
          action={<AssessButton onAssess={onAssess} label="Re-assess this post" />}
        />
      ) : !assessment ? (
        <QualityEmptyState
          lines={[
            "This post hasn't been scored yet.",
            "Ogen reads it against the campaign brief and the channel's conventions,",
            'then scores correctness, clarity, engagement and delivery.',
          ]}
          action={<AssessButton onAssess={onAssess} label="Assess this post" />}
        />
      ) : (
        <>
          <Overall evaluation={assessment} postUpdatedAt={postUpdatedAt} cached={cached} />
          <div className="flex flex-col gap-3">
            {QUALITY_DIMENSIONS.map((meta) => (
              <QualityDimensionCard
                key={meta.key}
                meta={meta}
                dimension={assessment.result?.[meta.key]}
              />
            ))}
          </div>
        </>
      )}
    </RailPanel>
  )
}

function AssessButton({ onAssess, label }: { onAssess: () => void; label: string }) {
  return (
    <Button type="button" variant="outline" className="uppercase" onClick={onAssess}>
      <SparkleIcon />
      <span>{label}</span>
    </Button>
  )
}

/** The overall percentage, what it is made of, and how much to trust it. */
export function Overall({
  evaluation,
  postUpdatedAt,
  cached,
}: {
  evaluation: PostEvaluation
  postUpdatedAt: string
  cached: boolean
}) {
  const pct = overallPct(evaluation)
  const band = overallBand(pct)
  const stale = isAssessmentStale(evaluation, postUpdatedAt)
  const scored = relativeTime(evaluation.updated_at)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ScoreRing pct={pct} band={band} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">Overall quality</h3>
          <p className="text-xs text-tertiary-foreground">
            {scored ? `Scored ${scored}` : 'Scored'}
            {cached && ' · unchanged since the last run'}
          </p>
        </div>
      </div>

      <CompositionBar evaluation={evaluation} />

      {stale && (
        <Flag>
          This post has been edited since it was scored — re-assess to see where it stands now.
        </Flag>
      )}

      {evaluation.caption_scoped && (
        <Flag>
          Only the text was scored. This post carries media the model can't see, so the visual
          is not part of the number above.
        </Flag>
      )}
    </section>
  )
}

export function ScoreRing({ pct, band }: { pct: number; band: QualityBand }) {
  const r = 26
  const circumference = 2 * Math.PI * r
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="5"
          className="stroke-quinary"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="butt"
          // Via currentColor, so the arc and the number below it are painted
          // from one band class and can't disagree about the verdict.
          stroke="currentColor"
          className={BAND_TEXT[band]}
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
        />
      </svg>
      <p
        className={cn(
          'absolute inset-0 flex items-center justify-center text-lg font-display font-medium tabular-nums',
          BAND_TEXT[band],
        )}
      >
        {Math.round(pct)}
      </p>
    </div>
  )
}

/**
 * The overall as a bar, in the same band colour as the ring above it.
 *
 * It was four coloured slices — one per dimension's weighted contribution —
 * which read as a chart the four cards below already draw better, and put a
 * second colour scheme next to the one that means "good or bad". One solid
 * fill says the one thing the bar is for: how full the score is.
 */
export function CompositionBar({ evaluation }: { evaluation: PostEvaluation }) {
  const pct = overallPct(evaluation)
  return (
    <div className="h-2 w-full bg-quinary" aria-hidden>
      <div className={cn('h-full', BAND_FILL[overallBand(pct)])} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** A caveat about the score above it — never an error, always a qualifier. */
function Flag({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs/[1.5] text-secondary-foreground">
      <WarningIcon aria-hidden weight="regular" className="mt-[1px] size-4 shrink-0 text-warning" />
      <span>{children}</span>
    </p>
  )
}

