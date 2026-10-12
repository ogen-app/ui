import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CircleIcon,
  FileDashedIcon,
  NotePencilIcon,
  TableIcon,
  FileXIcon,
  LockSimpleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib'
import {
  hasMeetingNotes,
  isLensWaiting,
  type InsightState,
} from '@/lib/assetAnalysis'
import { parseAssistantMarkup, type InlineSpan } from '@/lib/assistantMarkup'
import { formatNumber } from '@/lib/intl'
import type { SheetSummary } from '@/lib/sheetChunks'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { AssetIdeaList } from './AssetIdeaList'
import { Section } from './InsightSection'
import { Bullets, MeetingNotes } from './MeetingNotes'

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
        />
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

function Reading({
  lens,
  sheets,
}: {
  lens: AssetAnalysis
  sheets?: SheetSummary[]
}) {
  const { t, i18n } = useTranslation()
  const lensName =
    lens.campaign_id && lens.campaign_name
      ? lens.campaign_name
      : t('assetInsights.lens.theWorkspace')

  return (
    <div className="flex flex-col gap-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
      {isLensWaiting(lens) && (
        // A re-read in flight (a brief edit, a retry): the reading below
        // stays until the new one replaces it.
        <p className="flex items-center gap-2 text-xs text-tertiary-foreground">
          <Spinner tone="onSurface" className="w-4" />
          {t('assetInsights.state.refreshing', { lens: lensName })}
        </p>
      )}

      {lens.campaign_id && lens.relevance && (
        <div className="border-l-3 border-accent bg-accent/10 px-5 py-3">
          <p className="text-sm font-medium text-accent">
            {t('assetInsights.relevance.title', {
              campaign: lens.campaign_name ?? '',
            })}
          </p>
          <p className="text-sm text-secondary-foreground">
            {lens.relevance.why}
          </p>
        </div>
      )}

      {lens.summary.trim() && (
        <Section title={t('assetInsights.summary')}>
          <SummaryText text={lens.summary} />
          {(lens.partial_source || lens.truncated) && (
            <p className="text-xs text-warning">
              {lens.partial_source
                ? t('assetInsights.partialSource')
                : t('assetInsights.truncated')}
            </p>
          )}
        </Section>
      )}

      {lens.key_points.length > 0 && (
        <Section title={t('assetInsights.keyPoints')}>
          <Bullets items={lens.key_points} />
        </Section>
      )}

      {hasMeetingNotes(lens) && <MeetingNotes lens={lens} />}

      {sheets && sheets.length > 0 && (
        <Section title={t('assetInsights.sheet.read')}>
          <ul className="flex flex-wrap gap-2">
            {sheets.map((sheet) => (
              <li
                key={sheet.name}
                className="inline-flex items-center gap-2 rounded-full border border-quaternary px-3 py-1 text-sm text-secondary-foreground"
              >
                <TableIcon className="size-4 text-accent" aria-hidden />
                {sheet.rows === null
                  ? sheet.name
                  : t('assetInsights.sheet.chip', {
                      name: sheet.name,
                      count: sheet.rows,
                      formatted: formatNumber(sheet.rows, {}, i18n.language),
                    })}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(lens.topics.length > 0 || lens.entities.length > 0) && (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {lens.topics.length > 0 && (
            <Section title={t('assetInsights.topics')}>
              <Pills
                items={lens.topics.map((topic) => ({ text: topic }))}
                filled
              />
            </Section>
          )}
          {lens.entities.length > 0 && (
            <Section title={t('assetInsights.mentions')}>
              <Pills
                items={lens.entities.map((entity) => ({
                  text: entity.name,
                  title: t(`assetInsights.entityKind.${entity.kind}`, {
                    defaultValue: t('assetInsights.entityKind.other'),
                  }),
                }))}
              />
            </Section>
          )}
        </div>
      )}

      <AssetIdeaList lens={lens} spreadsheet={sheets !== undefined} />
    </div>
  )
}

function Pills({
  items,
  filled = false,
}: {
  /** `title` is the hover text — a mention's kind. */
  items: { text: string; title?: string }[]
  filled?: boolean
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.text}
          title={item.title}
          className={
            filled
              ? 'rounded-full bg-tertiary px-3 py-1 text-sm text-secondary-foreground'
              : 'rounded-full border border-quaternary px-3 py-1 text-sm text-secondary-foreground'
          }
        >
          {item.text}
        </li>
      ))}
    </ul>
  )
}

/**
 * The summary, as the light Markdown the model writes it in: paragraphs,
 * lists, bold — read with the assistant's own parser rather than an editor.
 */
function SummaryText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-7 text-foreground">
      {parseAssistantMarkup(text).map((block, i) =>
        block.kind === 'paragraph' ? (
          <p key={i}>
            <Spans spans={block.spans} />
          </p>
        ) : block.ordered ? (
          <ol key={i} className="flex list-decimal flex-col gap-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ol>
        ) : (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) =>
        span.bold ? (
          <strong key={i} className="font-semibold">
            {span.text}
          </strong>
        ) : (
          <Fragment key={i}>{span.text}</Fragment>
        ),
      )}
    </>
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
                  : 'text-tertiary-foreground',
            )}
          >
            {done.includes(name) ? (
              <CheckIcon weight="bold" className="size-3.5" aria-hidden />
            ) : active.includes(name) ? (
              <Spinner tone="onSurface" className="w-3.5" />
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
      <div className="flex flex-col gap-4 border-l-3 border-accent bg-accent/5 px-5 py-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-tertiary-foreground">{body}</p>
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
          <p className="text-sm text-tertiary-foreground">{body}</p>
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
