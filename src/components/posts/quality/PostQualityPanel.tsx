import type { ReactNode } from 'react'
import { ArrowClockwiseIcon, SparkleIcon, WarningIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { usePostAssessment } from '@/hooks/usePostAssessment.ts'
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
import type { Post } from '@/types/posts'
import type { PostEvaluation } from '@/types/quality'
import { AssessProgress } from './AssessProgress.tsx'
import { QualityDimensionCard } from './QualityDimensionCard.tsx'
import { BAND_TEXT, DIMENSION_FILL } from './tokens.ts'

/**
 * "Quality" for the right sidebar: the post scored across the four CON-85
 * dimensions, with the guidance that falls out of the scoring.
 *
 * The score is advisory and costs a model call to produce, so nothing here
 * runs on its own — the panel shows what is stored and the user asks for the
 * rest. What it does do is say when the stored score no longer describes the
 * post in the editor, which is the failure mode of a cached assessment.
 */
export function PostQualityPanel({ doc, onClose }: { doc: Post; onClose?: () => void }) {
  const {
    assessment,
    loading,
    unavailable,
    loadError,
    reload,
    assess,
    assessing,
    steps,
    cached,
    assessError,
  } = usePostAssessment(doc.id)

  const suggestions = assessment ? totalSuggestions(assessment) : 0

  return (
    <RailPanel
      title="Quality"
      onClose={onClose}
      className="h-full"
      titleAdornment={
        assessment && suggestions > 0 ? (
          <span className="text-sm text-tertiary-foreground">
            {suggestions} suggestion{suggestions === 1 ? '' : 's'}
          </span>
        ) : undefined
      }
      actions={
        // Only once there is a result: before that the call to action belongs
        // in the body, where it can explain itself.
        assessment && !unavailable ? (
          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            onClick={assess}
            loading={assessing}
            disabled={assessing}
            aria-label="Re-assess this post"
          >
            <ArrowClockwiseIcon className="size-5" />
          </Button>
        ) : undefined
      }
    >
      {unavailable ? (
        <Note>
          Quality assessment isn't switched on for this workspace, so there's nothing to
          score against yet.
        </Note>
      ) : assessing ? (
        <AssessProgress steps={steps} />
      ) : loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-start gap-3">
          <Note>Couldn't load this post's assessment.</Note>
          <p className="text-xs text-tertiary-foreground">{loadError}</p>
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : !assessment ? (
        <FirstRun onAssess={assess} assessError={assessError} />
      ) : (
        <>
          {assessError && <RunError message={assessError} />}
          <Overall evaluation={assessment} post={doc} cached={cached} />
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

function FirstRun({
  onAssess,
  assessError,
}: {
  onAssess: () => void
  assessError: string | null
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      {assessError && <RunError message={assessError} />}
      <Note>This post hasn't been scored yet.</Note>
      <p className="text-sm text-secondary-foreground">
        An assessment reads the post against its campaign brief and its channel's conventions,
        then scores it on correctness, clarity, engagement and delivery — with a concrete note
        on each.
      </p>
      <Button type="button" variant="default" size="sm" onClick={onAssess}>
        <SparkleIcon />
        <span>Assess this post</span>
      </Button>
    </div>
  )
}

/** The overall percentage, what it is made of, and how much to trust it. */
function Overall({
  evaluation,
  post,
  cached,
}: {
  evaluation: PostEvaluation
  post: Post
  cached: boolean
}) {
  const pct = overallPct(evaluation)
  const band = overallBand(pct)
  const stale = isAssessmentStale(evaluation, post.updated_at)
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

function ScoreRing({ pct, band }: { pct: number; band: QualityBand }) {
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
 * The overall split into what each dimension actually put into it. Two posts
 * can reach the same number from very different places, and the weights
 * differ by post type — a bar makes that visible where four scores don't.
 *
 * No legend: each dimension card below carries the matching dot.
 */
function CompositionBar({ evaluation }: { evaluation: PostEvaluation }) {
  return (
    <div className="flex h-2 w-full bg-quinary" aria-hidden>
      {QUALITY_DIMENSIONS.map((meta) => {
        const contribution = Math.max(0, evaluation.result?.[meta.key]?.contribution ?? 0)
        return (
          <div
            key={meta.key}
            className={DIMENSION_FILL[meta.key]}
            style={{ width: `${contribution}%` }}
          />
        )
      })}
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

/**
 * A failed run, shown above whatever is already on screen. Deliberately not a
 * replacement for it: the previous assessment is still the truth about the
 * post, and losing it because a re-run failed would be the worse outcome.
 */
function RunError({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1.5 border border-border px-3 py-2 text-xs/[1.5] text-secondary-foreground">
      <WarningIcon
        aria-hidden
        weight="regular"
        className="mt-[1px] size-4 shrink-0 text-destructive"
      />
      <span>The assessment didn't finish: {message}</span>
    </p>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-tertiary-foreground">{children}</p>
}
