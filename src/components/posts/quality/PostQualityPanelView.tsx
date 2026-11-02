import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import {
  ArrowClockwiseIcon,
  GearSixIcon,
  SparkleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { QualityEmptyState } from './QualityEmptyState.tsx'
import {
  QUALITY_DIMENSIONS,
  automaticTrigger,
  overallBand,
  overallPct,
  postSuggestions,
  runsLeft,
  staleReason,
} from '@/lib/postQuality.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import type { PostEvaluation, QualityTrigger } from '@/types/quality'
import { AssessProgress } from './AssessProgress.tsx'
import { QualityDimensionCard } from './QualityDimensionCard.tsx'
import { QualitySuggestionList } from './QualitySuggestionList.tsx'
import { CompositionBar, ScoreRing } from './ScoreRing.tsx'

export type PostQualityPanelViewProps = {
  /** `null` means never assessed; `undefined` means not loaded yet. */
  assessment: PostEvaluation | null | undefined
  loading: boolean
  unavailable: boolean
  loadError: string | null
  onReload: () => void
  onAssess: () => void
  assessing: boolean
  /**
   * The server is scoring the post on its own (CON-438), and what started
   * it. No steps to show — the run is not this tab's stream.
   */
  autoAssessing?: QualityTrigger | null
  steps: string[]
  cached: boolean
  assessError: string | null
  /** The post's run allowance is used up; the run is refused until the plan changes. */
  exhausted?: boolean
  /**
   * The post is submitted, so the panel keeps every reading and loses the run
   * (CON-251). A stored score still describes the post exactly — better than
   * before, since nothing can edit past it now — but paying for a new one
   * would buy a verdict about text nobody can act on.
   */
  locked?: boolean
  onClose?: () => void
}

/**
 * "Quality" for the right sidebar: the post scored across the four CON-85
 * dimensions, with the guidance that falls out of the scoring.
 *
 * Since CON-438 the server also scores a post on its own, at the lifecycle
 * checkpoints — marked ready, a version saved, scheduled, published — so the
 * panel can be showing a run nobody here asked for. It says when, and it says
 * when the stored score has fallen behind the post or its campaign, which a
 * checkpoint only catches for the post's own text.
 *
 * Presentational, and stays that way: every state it can be in is reachable
 * from props alone, which is what lets a harness show all of them side by
 * side. The post route is the container that feeds it from the API.
 */
export function PostQualityPanelView({
  assessment,
  loading,
  unavailable,
  loadError,
  onReload,
  onAssess,
  assessing,
  autoAssessing = null,
  steps,
  cached,
  assessError,
  exhausted = false,
  locked = false,
  onClose,
}: PostQualityPanelViewProps) {
  const { t } = useTranslation()
  const suggestions = assessment ? postSuggestions(assessment) : []
  const busy = assessing || !!autoAssessing
  // The run is refused rather than offered once the allowance is spent, and
  // the reason sits right above the button that would have spent it.
  const canRun = !busy && !exhausted

  return (
    <RailPanel
      title={t('posts.quality.title')}
      onClose={onClose}
      className="h-full"
      // The empty states centre themselves in whatever height is left, so the
      // body has to claim it rather than hug its content.
      bodyClassName="flex-1"
      titleAdornment={
        assessment && suggestions.length > 0 ? (
          <span className="text-sm text-tertiary-foreground">
            {t('posts.quality.suggestionCount', { count: suggestions.length })}
          </span>
        ) : undefined
      }
      // Pinned to the foot of the rail like the assistant's composer: the
      // action that runs the panel belongs at the bottom, in one place,
      // rather than moving as the body scrolls. Only once there is a result
      // — before that the call to action is the body, where it explains
      // itself.
      footer={
        assessment && !unavailable && !locked ? (
          <div className="flex flex-col gap-2">
            <RunsHint assessment={assessment} exhausted={exhausted} />
            <Button
              type="button"
              variant="outline"
              // `justify-center`: the button base is `inline-flex` with no
              // justification, so at full width the label would sit against
              // the left edge with the rest of the row empty.
              className="w-full justify-center uppercase"
              onClick={onAssess}
              loading={busy}
              disabled={!canRun}
            >
              <ArrowClockwiseIcon />
              <span>
                {busy
                  ? t('posts.quality.assessingPost')
                  : t('posts.quality.reassessPost')}
              </span>
            </Button>
          </div>
        ) : undefined
      }
      footerFade={12}
    >
      {unavailable ? (
        <QualityEmptyState
          lines={[
            t('posts.quality.empty.unavailable'),
            t('posts.quality.empty.unavailableHint'),
          ]}
          action={
            <Button variant="outline" className="uppercase" asChild>
              <Link to="/workspace-settings">
                <GearSixIcon />
                <span>{t('posts.quality.empty.goToSettings')}</span>
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
            t('posts.quality.empty.broke'),
            t('posts.quality.empty.loadFailed'),
          ]}
          action={
            <Button variant="outline" className="uppercase" onClick={onReload}>
              <ArrowClockwiseIcon />
              {/* Reload, not re-assess: the score may well be sitting there
                  intact, and a failed fetch is no reason to pay for a run. */}
              <span>{t('posts.quality.empty.tryAgain')}</span>
            </Button>
          }
        />
      ) : !assessment && autoAssessing ? (
        // First of the never-scored states: the score is on its way, and
        // offering a button would start a second run beside it.
        <QualityEmptyState
          lines={[
            t('posts.quality.assessingPost'),
            autoRunningLine(t, autoAssessing),
          ]}
          action={<Spinner tone="onSurface" />}
        />
      ) : !assessment && locked ? (
        // Before the two states below it, and without their action: on a
        // submitted post "hasn't been scored yet" describes a run that is
        // never going to happen, and offering the button would spend a model
        // call on text nobody can change.
        <QualityEmptyState
          lines={[
            t('posts.quality.neverScored'),
            t('posts.quality.scoringIsForDrafts'),
          ]}
        />
      ) : assessError && !assessment ? (
        <QualityEmptyState
          lines={[
            t('posts.quality.empty.broke'),
            t('posts.quality.empty.runFailed'),
          ]}
          action={
            <AssessButton
              onAssess={onAssess}
              label={t('posts.quality.reassessPost')}
              disabled={exhausted}
            />
          }
        />
      ) : !assessment ? (
        <QualityEmptyState
          lines={[
            t('posts.quality.empty.notScored'),
            t('posts.quality.empty.notScoredHow'),
            t('posts.quality.empty.notScoredAuto'),
          ]}
          action={
            <AssessButton
              onAssess={onAssess}
              label={t('posts.quality.assessPost')}
              disabled={exhausted}
            />
          }
        />
      ) : (
        <>
          {autoAssessing && (
            <p className="flex items-center gap-2 text-xs text-secondary-foreground">
              <Spinner tone="onSurface" className="w-4 shrink-0" />
              <span>{autoRunningLine(t, autoAssessing)}</span>
            </p>
          )}
          <Overall
            evaluation={assessment}
            cached={cached}
            onReassess={!locked && canRun ? onAssess : undefined}
          />
          <div className="flex flex-col gap-3">
            {QUALITY_DIMENSIONS.map((meta) => (
              <QualityDimensionCard
                key={meta.key}
                meta={meta}
                dimension={assessment.result?.[meta.key]}
              />
            ))}
          </div>
          <QualitySuggestionList suggestions={suggestions} />
        </>
      )}
    </RailPanel>
  )
}

/** What started the automatic run, as the sentence under "Assessing…". */
function autoRunningLine(t: TFunction, trigger: QualityTrigger): string {
  switch (trigger) {
    case 'ready':
    case 'version':
    case 'scheduled':
    case 'published':
      return t(`posts.quality.auto.running.${trigger}`)
    default:
      return t('posts.quality.auto.runningGeneric')
  }
}

function AssessButton({
  onAssess,
  label,
  disabled = false,
}: {
  onAssess: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="uppercase"
      onClick={onAssess}
      disabled={disabled}
    >
      <SparkleIcon />
      <span>{label}</span>
    </Button>
  )
}

/**
 * What is left of the post's run allowance, when the plan sets one (CON-438).
 * Silent on an unlimited plan — "unlimited reviews left" is a number nobody
 * needed — and at the limit it says why the button below it won't run.
 */
function RunsHint({
  assessment,
  exhausted,
}: {
  assessment: PostEvaluation
  exhausted: boolean
}) {
  const { t } = useTranslation()
  const runs = runsLeft(assessment)
  let text: string
  if (!runs) {
    if (!exhausted) return null
    text = t('posts.quality.runs.noneFlat')
  } else if (exhausted || runs.left === 0) {
    text = t('posts.quality.runs.none', { count: runs.limit })
  } else {
    text = t('posts.quality.runs.left', {
      count: runs.left,
      limit: runs.limit,
    })
  }
  return <p className="text-center text-xs text-tertiary-foreground">{text}</p>
}

/** The overall percentage, what it is made of, and how much to trust it. */
export function Overall({
  evaluation,
  cached,
  onReassess,
}: {
  evaluation: PostEvaluation
  cached: boolean
  /** Absent when a run can't be started here — locked, busy or spent. */
  onReassess?: () => void
}) {
  const { t } = useTranslation()
  const pct = overallPct(evaluation)
  const band = overallBand(pct)
  const stale = staleReason(evaluation)
  const trigger = automaticTrigger(evaluation)
  const when = relativeTime(evaluation.updated_at)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ScoreRing pct={pct} band={band} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">
            {t('posts.quality.overall')}
          </h3>
          <p className="text-xs text-tertiary-foreground">
            {when
              ? cached
                ? t('posts.quality.scoredAtCached', { when })
                : t('posts.quality.scoredAt', { when })
              : cached
                ? t('posts.quality.scoredCached')
                : t('posts.quality.scored')}
          </p>
          {trigger && (
            <p className="text-xs text-tertiary-foreground">
              {t(`posts.quality.trigger.${trigger}`)}
            </p>
          )}
        </div>
      </div>

      <CompositionBar evaluation={evaluation} />

      {stale && (
        <div className="flex flex-col items-start gap-1.5">
          <StatusBadge tone="warn" label={t('posts.quality.stale.badge')} />
          <p className="text-xs/[1.5] text-secondary-foreground">
            {t(`posts.quality.stale.${stale}`)}
          </p>
          {onReassess && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              // Cancels the ghost's own left padding so the label lines up
              // with the sentence above it.
              className="-ml-3 uppercase"
              onClick={onReassess}
            >
              <ArrowClockwiseIcon />
              <span>{t('posts.quality.stale.action')}</span>
            </Button>
          )}
        </div>
      )}

      {evaluation.caption_scoped && (
        <Flag>{t('posts.quality.captionScoped')}</Flag>
      )}
    </section>
  )
}

/** A caveat about the score above it — never an error, always a qualifier. */
function Flag({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs/[1.5] text-secondary-foreground">
      <WarningIcon
        aria-hidden
        weight="regular"
        className="mt-[1px] size-4 shrink-0 text-warning"
      />
      <span>{children}</span>
    </p>
  )
}
