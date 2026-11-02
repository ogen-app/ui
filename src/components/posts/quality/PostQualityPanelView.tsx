import { useCallback, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { Trans, useTranslation } from 'react-i18next'
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
  automaticTrigger,
  dimensionLabel,
  heaviestDimension,
  overallBand,
  overallPct,
  postSuggestions,
  reasonRowId,
  runsLeft,
  staleReason,
} from '@/lib/postQuality.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import type {
  PostEvaluation,
  QualityDimensionKey,
  QualitySuggestion,
  QualityTrigger,
} from '@/types/quality'
import { AssessProgress } from './AssessProgress.tsx'
import { BandTag } from './BandTag.tsx'
import { FixFirstList, type FixFirstHighlight } from './FixFirstList.tsx'
import { QualityRadar } from './QualityRadar.tsx'
import { ScoreReasons } from './ScoreReasons.tsx'

export type PostQualityPanelViewProps = {
  /** `null` means never assessed; `undefined` means not loaded yet. */
  assessment: PostEvaluation | null | undefined
  /**
   * The assessment a newer run replaced while the post was open — the radar's
   * dashed outline and every "before your edits" (CON-440). `null` if none.
   */
  previous?: PostEvaluation | null
  /** The scored platform's display name, e.g. "LinkedIn"; `null` if unknown. */
  platformName?: string | null
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
  /**
   * The list's link to the post's marks (CON-441). Absent, the rows are
   * plain text — the harness and anything else without an editor beside it.
   */
  highlight?: FixFirstHighlight
  onClose?: () => void
}

/**
 * "Quality" for the right sidebar: the post scored across the four CON-85
 * dimensions, and what to do about it.
 *
 * A result reads top to bottom in the order a user asks about it (CON-440):
 * how did it go (the summary and the radar), what do I fix (every suggestion
 * in one list, most severe first), and why (the model's verdict per
 * dimension).
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
  previous = null,
  platformName = null,
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
  highlight,
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
          <Skeleton className="h-64 w-full" />
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
          <Result
            evaluation={assessment}
            previous={previous}
            platformName={platformName}
            suggestions={suggestions}
            cached={cached}
            onReassess={!locked && canRun ? onAssess : undefined}
            highlight={highlight}
          />
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

/** A stored score, read top to bottom: how it went, what to fix, and why. */
function Result({
  evaluation,
  previous,
  platformName,
  suggestions,
  cached,
  onReassess,
  highlight,
}: {
  evaluation: PostEvaluation
  previous: PostEvaluation | null
  platformName: string | null
  suggestions: QualitySuggestion[]
  cached: boolean
  onReassess?: () => void
  highlight?: FixFirstHighlight
}) {
  // A radar corner brings its dimension's verdict into view and hands it
  // focus, so a screen reader lands on the answer it asked for.
  const showReason = useCallback((key: QualityDimensionKey) => {
    const row = document.getElementById(reasonRowId(key))
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    row?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <Summary
        evaluation={evaluation}
        previous={previous}
        cached={cached}
        onReassess={onReassess}
      />
      <div className="border-t border-border pt-5">
        <QualityRadar
          evaluation={evaluation}
          previous={previous}
          platformName={platformName}
          onSelectDimension={showReason}
        />
      </div>
      <div className="border-t border-border pt-5">
        <FixFirstList suggestions={suggestions} highlight={highlight} />
      </div>
      <div className="border-t border-border pt-5">
        <ScoreReasons evaluation={evaluation} />
      </div>
    </div>
  )
}

/**
 * The overall, how it moved, where it came from and how far to trust it. Each
 * line says one of those; none of them repeats the number in another form.
 */
function Summary({
  evaluation,
  previous,
  cached,
  onReassess,
}: {
  evaluation: PostEvaluation
  previous: PostEvaluation | null
  cached: boolean
  /** Absent when a run can't be started here — locked, busy or spent. */
  onReassess?: () => void
}) {
  const { t } = useTranslation()
  const pct = Math.round(overallPct(evaluation))
  const band = overallBand(pct)
  const before = previous ? Math.round(overallPct(previous)) : null
  const stale = staleReason(evaluation)
  const trigger = automaticTrigger(evaluation)
  const when = relativeTime(evaluation.updated_at)
  const heaviest = heaviestDimension(evaluation)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <p className="font-display text-[44px]/none font-medium tracking-[-0.03em] text-foreground tabular-nums">
          {pct}
        </p>
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <BandTag band={band} />
          {before !== null && (
            <p className="text-sm text-secondary-foreground">
              {before === pct ? (
                t('posts.quality.summary.sameAs')
              ) : (
                <Trans
                  i18nKey={
                    pct > before
                      ? 'posts.quality.summary.upFrom'
                      : 'posts.quality.summary.downFrom'
                  }
                  values={{ score: before }}
                  components={{
                    strong: (
                      <span className="font-medium text-foreground tabular-nums" />
                    ),
                  }}
                />
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 text-[13px]/[1.5] text-secondary-foreground">
        <p>
          {when
            ? cached
              ? t('posts.quality.scoredAtCached', { when })
              : t('posts.quality.scoredAt', { when })
            : cached
              ? t('posts.quality.scoredCached')
              : t('posts.quality.scored')}
        </p>
        {trigger && <p>{t(`posts.quality.trigger.${trigger}`)}</p>}
        {heaviest && (
          <p>
            {t('posts.quality.summary.weighsMost', {
              dimension: dimensionLabel(t, heaviest),
            })}
          </p>
        )}
      </div>

      {stale && (
        <div className="flex flex-col items-start gap-1.5">
          <StatusBadge tone="warn" label={t('posts.quality.stale.badge')} />
          <p className="text-[13px]/[1.5] text-secondary-foreground">
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
