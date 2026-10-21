import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CircleDashedIcon,
  CircleIcon,
  FileDashedIcon,
  NotePencilIcon,
  TargetIcon,
  FileXIcon,
  LockSimpleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib'
import {
  coversAnything,
  hasMeetingNotes,
  isLensWaiting,
  type InsightState,
} from '@/lib/assetAnalysis'
import type { SheetSummary } from '@/lib/sheetChunks'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { AssetIdeaList } from './AssetIdeaList'
import { ReadingSummary } from './ReadingSummary'
import { WhatItCovers } from './WhatItCovers'
import { Separator } from '@/components/ui/separator'
import { MeetingNotes } from './MeetingNotes'

/**
 * `InsightState`, plus the two answers only the page can give: the analyses
 * could not be read at all, and an asset that settled before analysis existed
 * and so has no lens to show.
 */
export type PanelState = InsightState | 'loadFailed' | 'none' | 'empty'

type Props = {
  state: PanelState
  lens: AssetAnalysis | undefined
  onRetry: () => void
  retrying: boolean
  /**
   * A spreadsheet's sheets as far as they are loaded, named for display —
   * shown as what the reading covered (§5.4). Absent on every other kind.
   */
  sheets?: SheetSummary[]
  /**
   * A note or Markdown file — written here, not ingested. Its empty and
   * not-yet-analysed states point at writing rather than at the file.
   */
  authored?: boolean
  /** Switches to the Source tab — the empty note's way to start writing. */
  onOpenSource?: () => void
}

/**
 * The Insights tab for one lens (CON-366) — the reading itself once it is
 * there, and an honest sentence for every way it is not: the file still being
 * read, the analysis on its way, a failure that can be retried, and the two
 * plan gates, which are not errors and are not worded as ones.
 */
export function InsightsPanel({
  state,
  lens,
  onRetry,
  retrying,
  sheets,
  authored = false,
  onOpenSource,
}: Props) {
  const { t } = useTranslation()
  const lensName =
    lens?.campaign_id && lens.campaign_name
      ? lens.campaign_name
      : t('assetInsights.lens.theWorkspace')

  switch (state) {
    case 'reading':
      return (
        <Waiting
          step="extract"
          title={t('assetInsights.state.reading')}
          body={t('assetInsights.state.readingBody')}
        />
      )
    case 'analysing':
      return (
        <Waiting
          step="analyse"
          title={t('assetInsights.state.analysing', { lens: lensName })}
          body={t('assetInsights.state.analysingBody')}
        />
      )
    case 'loadFailed':
      return (
        <Notice
          icon={<WarningIcon className="size-5 text-destructive" />}
          title={t('assetInsights.state.loadFailed')}
          body={t('assetInsights.state.loadFailedBody')}
        />
      )
    case 'none':
      return (
        <Notice
          icon={<FileXIcon className="size-5 text-tertiary-foreground" />}
          title={t('assetInsights.state.none')}
          body={
            authored
              ? t('assetInsights.state.noneNoteBody')
              : t('assetInsights.state.noneBody')
          }
        >
          {/* Starts the missing lens through the retry endpoint, which
              creates it when there is none (CON-367). */}
          <Button
            variant="outline"
            className="uppercase"
            onClick={onRetry}
            loading={retrying}
          >
            <ArrowsClockwiseIcon />
            <span>{t('assetInsights.state.analyseNow')}</span>
          </Button>
        </Notice>
      )
    case 'empty':
      return authored ? (
        <Notice
          icon={<NotePencilIcon className="size-5 text-tertiary-foreground" />}
          title={t('assetInsights.state.emptyNote')}
          body={t('assetInsights.state.emptyNoteBody')}
        >
          {onOpenSource && (
            <Button
              variant="outline"
              className="uppercase"
              onClick={onOpenSource}
            >
              {t('assetInsights.state.startWriting')}
            </Button>
          )}
        </Notice>
      ) : (
        <Notice
          icon={<FileDashedIcon className="size-5 text-tertiary-foreground" />}
          title={t('assetInsights.state.emptySource')}
          body={t('assetInsights.state.emptySourceBody')}
        />
      )
    case 'assetFailed':
      return (
        <Notice
          icon={<FileXIcon className="size-5 text-tertiary-foreground" />}
          title={t('assetInsights.state.assetFailed')}
          body={t('assetInsights.state.assetFailedBody')}
        />
      )
    case 'failed':
      return (
        <Notice
          icon={<WarningIcon className="size-5 text-destructive" />}
          title={t('assetInsights.state.failed')}
          body={t(`assetInsights.failure.${lens?.failure_code || 'unknown'}`, {
            defaultValue: t('assetInsights.failure.unknown'),
          })}
        >
          <RetryButton onRetry={onRetry} retrying={retrying} />
        </Notice>
      )
    case 'notInPlan':
      return (
        <Notice
          icon={<LockSimpleIcon className="size-5 text-tertiary-foreground" />}
          title={t('assetInsights.state.notInPlan')}
          body={t('assetInsights.state.notInPlanBody')}
        >
          <PlansButton />
        </Notice>
      )
    case 'limitReached':
      return (
        <Notice
          icon={<LockSimpleIcon className="size-5 text-tertiary-foreground" />}
          title={t('assetInsights.state.limitReached')}
          body={t('assetInsights.state.limitReachedBody')}
        >
          <PlansButton />
          <RetryButton onRetry={onRetry} retrying={retrying} />
        </Notice>
      )
    case 'ready':
      return lens ? <Reading lens={lens} sheets={sheets} /> : null
  }
}

/**
 * A settled reading, in the order someone mining it reads (CON-369): what it
 * is in four lines, the post ideas it gave, then — for a recording — what was
 * agreed, and last what it covers. The ideas come second because they are
 * what the page is for; everything after them is context.
 */
function Reading({
  lens,
  sheets,
}: {
  lens: AssetAnalysis
  sheets?: SheetSummary[]
}) {
  const { t } = useTranslation()
  const lensName =
    lens.campaign_id && lens.campaign_name
      ? lens.campaign_name
      : t('assetInsights.lens.theWorkspace')

  return (
    <div className="flex flex-col gap-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
      {isLensWaiting(lens) && (
        // A re-read in flight (a brief edit, a retry): the reading below
        // stays until the new one replaces it.
        <p className="-mb-4 flex items-center gap-2 text-xs text-secondary-foreground">
          <CircleDashedIcon className="size-4 animate-spin" aria-hidden />
          {t('assetInsights.state.refreshing', { lens: lensName })}
        </p>
      )}

      {lens.campaign_id && lens.relevance && (
        // A tinted panel with a leading mark — not a coloured side stripe.
        <div className="flex items-start gap-3 rounded-md bg-accent/10 px-5 py-4">
          <TargetIcon
            className="mt-0.5 size-5 shrink-0 text-accent"
            aria-hidden
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-foreground">
              {t('assetInsights.relevance.title', {
                campaign: lens.campaign_name ?? '',
              })}
            </p>
            <p className="text-sm text-secondary-foreground">
              {lens.relevance.why}
            </p>
          </div>
        </div>
      )}

      <ReadingSummary lens={lens} />

      {/* A pale rule between the three parts — what it says, what to make,
          what it covers — standing in the column's own gap on either side. */}
      <Separator className="bg-quaternary" />

      <AssetIdeaList lens={lens} spreadsheet={sheets !== undefined} />

      {hasMeetingNotes(lens) && (
        <>
          <Separator className="bg-quaternary" />
          <div className="flex flex-col gap-8">
            <MeetingNotes lens={lens} />
          </div>
        </>
      )}

      {coversAnything(lens, sheets) && (
        <>
          <Separator className="bg-quaternary" />
          <WhatItCovers lens={lens} sheets={sheets} />
        </>
      )}
    </div>
  )
}

const STEPS = ['upload', 'extract', 'analyse', 'ideas'] as const

/**
 * Where the reading has got to, as four steps. Illustrative rather than a
 * progress bar: only a recording reports real progress (the status line has
 * it), and analysing and distilling ideas are one step on the server, so they
 * light together.
 */
function StepTracker({ step }: { step: 'extract' | 'analyse' }) {
  const { t } = useTranslation()
  const active = step === 'extract' ? ['extract'] : ['analyse', 'ideas']
  const done = step === 'extract' ? ['upload'] : ['upload', 'extract']
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
      {STEPS.map((name, i) => (
        <li key={name} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden className="h-px w-6 bg-quaternary" />}
          <span
            className={cn(
              'flex items-center gap-1.5',
              done.includes(name)
                ? 'text-foreground'
                : active.includes(name)
                  ? 'font-medium text-accent'
                  : 'text-secondary-foreground',
            )}
          >
            {done.includes(name) ? (
              <CheckIcon weight="bold" className="size-3.5" aria-hidden />
            ) : active.includes(name) ? (
              <CircleDashedIcon className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <CircleIcon className="size-3.5" aria-hidden />
            )}
            {t(`assetInsights.steps.${name}`)}
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Something is on its way: a line saying what, and the shape of what is
 * coming — summary, points, ideas — so the page does not jump when it lands.
 */
function Waiting({
  step,
  title,
  body,
}: {
  step: 'extract' | 'analyse'
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col gap-8" aria-busy>
      <div className="flex flex-col gap-4 rounded-md bg-accent/5 px-5 py-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-secondary-foreground">{body}</p>
        </div>
        <StepTracker step={step} />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex flex-col gap-3 border-t border-quaternary pt-8">
        <Skeleton className="h-5 w-32" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

function Notice({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-secondary-foreground">{body}</p>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  )
}

function RetryButton({
  onRetry,
  retrying,
}: {
  onRetry: () => void
  retrying: boolean
}) {
  const { t } = useTranslation()
  return (
    <Button
      variant="outline"
      className="uppercase"
      onClick={onRetry}
      loading={retrying}
    >
      <ArrowsClockwiseIcon />
      <span>{t('assetInsights.retry')}</span>
    </Button>
  )
}

function PlansButton() {
  const { t } = useTranslation()
  return (
    <Button variant="defaultInverted" className="uppercase" asChild>
      <Link to="/workspace-settings">{t('assetInsights.seePlans')}</Link>
    </Button>
  )
}
