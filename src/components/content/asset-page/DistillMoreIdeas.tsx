import { useId, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { AiChemistry02Icon } from '@hugeicons/core-free-icons'
import {
  CircleDashedIcon,
  LightbulbIcon,
  LockSimpleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { refusalOf, type useIdeaDistill } from '@/hooks/useIdeaDistill'
import { cn } from '@/lib'
import { isLensWaiting } from '@/lib/assetAnalysis'
import {
  DISTILL_DEFAULT_COUNT,
  outcomeOf,
  type DistillOutcome,
} from '@/lib/ideaDistill'
import type { AssetAnalysis, IdeaDistillRun } from '@/types/assetAnalysis'
import { DistillIdeasModal, type DistillDraft } from './DistillIdeasModal'

type Distill = ReturnType<typeof useIdeaDistill>

/**
 * The foot of an asset's ideas (CON-398): a ghost "Distill more ideas", and
 * above it whatever the last request came to.
 *
 * Everything about a run is said **here**, in a row where its ideas will land,
 * and nothing above it moves: the run in flight, a run that found nothing, a
 * failure, a month's runs used up, a plan without it. A run that landed says
 * nothing at all — its ideas are the answer, marked in the list above.
 *
 * The button stays on screen when it can't be pressed, with the reason beside
 * it rather than in a tooltip, so the feature is learnable before it's usable.
 */
export function DistillMoreIdeas({
  lens,
  distill,
}: {
  lens: AssetAnalysis
  distill: Distill
}) {
  const { t } = useTranslation()
  const reasonId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DistillDraft>({
    count: DISTILL_DEFAULT_COUNT,
    focus: '',
  })
  const { active, reported, refusal, request } = distill

  // A refusal that belongs at the foot of the list (out of runs, not on the
  // plan) or a 409 the re-read answers closes the form; one about the form
  // itself — a 400, a request that never got an answer — keeps it open, and
  // reopens it when the click came from a row.
  const send = (next: DistillDraft, from?: IdeaDistillRun) =>
    request.mutate(next, {
      onSuccess: () => setOpen(false),
      onError: (err) => {
        const refused = refusalOf(err)
        if (refused === 'invalid' || refused === 'failed') openWith(from)
        else setOpen(false)
      },
    })

  const openWith = (from?: IdeaDistillRun) => {
    if (from) setDraft({ count: from.count, focus: from.focus })
    setOpen(true)
  }

  // A refusal from the POST outranks a run's old news: it is about the click
  // that just happened.
  const outcome: DistillOutcome | null =
    refusal === 'limit' || refusal === 'plan'
      ? refusal
      : reported
        ? outcomeOf(reported)
        : null

  const reason = isLensWaiting(lens)
    ? t('assetInsights.distill.reason.analysing')
    : active
      ? t('assetInsights.distill.reason.running')
      : outcome === 'limit'
        ? t('assetInsights.distill.reason.limit')
        : outcome === 'plan'
          ? t('assetInsights.distill.reason.plan')
          : null

  const formError =
    refusal === 'invalid'
      ? t('assetInsights.distill.modal.invalid')
      : refusal === 'failed'
        ? t('assetInsights.distill.modal.failed')
        : null

  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite" className="contents">
        {active ? (
          <InFlightRow run={active} />
        ) : outcome && outcome !== 'landed' ? (
          <OutcomeRow
            outcome={outcome}
            run={reported}
            pending={request.isPending}
            onTryAgain={(run) =>
              outcomeOf(run) === 'failed'
                ? send({ count: run.count, focus: run.focus }, run)
                : openWith(run)
            }
          />
        ) : null}
      </div>

      {/* Hung out by its own padding, so the flask sits on the score tracks'
          line rather than a step inside it. */}
      <div className="-ml-3 flex flex-wrap items-center gap-x-1 gap-y-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={reason !== null}
          aria-describedby={reason ? reasonId : undefined}
          onClick={() => openWith()}
          className="disabled:opacity-50"
        >
          <HugeiconsIcon icon={AiChemistry02Icon} size={16} aria-hidden />
          {t('assetInsights.distill.action')}
        </Button>
        {reason && (
          <span id={reasonId} className="text-xs text-tertiary-foreground">
            {reason}
          </span>
        )}
      </div>

      <DistillIdeasModal
        isOpen={open}
        onClose={() => setOpen(false)}
        campaignName={lens.campaign_id ? lens.campaign_name : null}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => send(draft)}
        pending={request.isPending}
        error={open ? formError : null}
      />
    </div>
  )
}

/** Where the new ideas will land, saying so while they're on their way. */
function InFlightRow({ run }: { run: IdeaDistillRun }) {
  const { t } = useTranslation()
  return (
    <StatusRow
      tone="accent"
      icon={
        <CircleDashedIcon
          className="size-5 text-accent motion-safe:animate-spin"
          aria-hidden
        />
      }
      title={t('assetInsights.distill.running', { count: run.count })}
      body={
        run.focus
          ? t('assetInsights.distill.runningFocused', { focus: run.focus })
          : t('assetInsights.distill.runningBody')
      }
    />
  )
}

function OutcomeRow({
  outcome,
  run,
  pending,
  onTryAgain,
}: {
  outcome: Exclude<DistillOutcome, 'landed'>
  /** The run it is about; absent for a refusal the POST answered itself. */
  run: IdeaDistillRun | undefined
  pending: boolean
  onTryAgain: (run: IdeaDistillRun) => void
}) {
  const { t } = useTranslation()
  const tryAgain = run && (
    <button
      type="button"
      disabled={pending}
      onClick={() => onTryAgain(run)}
      className="cursor-pointer text-sm font-medium text-accent hover:underline disabled:cursor-default disabled:opacity-50"
    >
      {t('assetInsights.distill.tryAgain')}
    </button>
  )
  const seePlans = (
    <Link
      to="/plans"
      className="text-sm font-medium text-accent hover:underline"
    >
      {t('assetInsights.distill.seePlans')}
    </Link>
  )
  switch (outcome) {
    case 'empty':
      return (
        <StatusRow
          tone="neutral"
          icon={
            <LightbulbIcon
              className="size-5 text-tertiary-foreground"
              aria-hidden
            />
          }
          title={t('assetInsights.distill.empty')}
          body={
            run?.focus
              ? t('assetInsights.distill.emptyFocused', { focus: run.focus })
              : null
          }
          action={tryAgain}
        />
      )
    case 'failed':
      return (
        <StatusRow
          tone="destructive"
          icon={
            <WarningCircleIcon
              className="size-5 text-destructive"
              aria-hidden
            />
          }
          title={t('assetInsights.distill.failed')}
          body={t(
            `assetInsights.distill.failure.${run?.failure_code || 'unknown'}`,
            { defaultValue: t('assetInsights.distill.failure.unknown') },
          )}
          action={tryAgain}
        />
      )
    case 'limit':
    case 'plan':
      return (
        <StatusRow
          tone="neutral"
          icon={
            <LockSimpleIcon
              className="size-5 text-secondary-foreground"
              aria-hidden
            />
          }
          title={t(`assetInsights.distill.${outcome}`)}
          body={t(`assetInsights.distill.${outcome}Body`)}
          action={seePlans}
        />
      )
  }
}

/**
 * One line of news at the foot of the list, on the idea rows' grid — the mark
 * in the score track's column and the words in the titles' — so it reads as a
 * row of the list rather than a banner under it.
 */
function StatusRow({
  tone,
  icon,
  title,
  body,
  action,
}: {
  tone: 'accent' | 'neutral' | 'destructive'
  icon: ReactNode
  title: string
  body: string | null
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        '-mx-3 grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-x-3 rounded-md px-3 py-3.5',
        tone === 'accent' && 'bg-accent/10',
        tone === 'neutral' && 'bg-secondary',
        tone === 'destructive' && 'bg-destructive/5',
      )}
    >
      <span className="flex h-6 items-center">{icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm/6 font-medium text-foreground">{title}</p>
        {body && (
          <p className="text-[13px]/[19px] text-secondary-foreground">{body}</p>
        )}
      </div>
      {action && <span className="flex h-6 items-center">{action}</span>}
    </div>
  )
}
