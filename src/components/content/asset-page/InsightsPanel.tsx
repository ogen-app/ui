import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowsClockwiseIcon,
  TableIcon,
  FileXIcon,
  LockSimpleIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { hasMeetingNotes, type InsightState } from '@/lib/assetAnalysis'
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
export type PanelState = InsightState | 'loadFailed' | 'none'

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
          title={t('assetInsights.state.reading')}
          body={t('assetInsights.state.readingBody')}
        />
      )
    case 'analysing':
      return (
        <Waiting
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
          body={t('assetInsights.state.noneBody')}
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
  const paragraphs = lens.summary
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const people = lens.entities.map((e) => e.name)

  return (
    <div className="flex flex-col gap-8 motion-safe:animate-in motion-safe:fade-in">
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

      {(lens.partial_source || lens.truncated) && (
        <p className="text-sm text-warning">
          {lens.partial_source
            ? t('assetInsights.partialSource')
            : t('assetInsights.truncated')}
        </p>
      )}

      {paragraphs.length > 0 && (
        <Section title={t('assetInsights.summary')}>
          <div className="flex flex-col gap-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] leading-7 text-foreground">
                {p}
              </p>
            ))}
          </div>
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

      {(lens.topics.length > 0 || people.length > 0) && (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {lens.topics.length > 0 && (
            <Section title={t('assetInsights.topics')}>
              <Pills items={lens.topics} filled />
            </Section>
          )}
          {people.length > 0 && (
            <Section title={t('assetInsights.mentions')}>
              <Pills items={people} />
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
  items: string[]
  filled?: boolean
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className={
            filled
              ? 'rounded-full bg-tertiary px-3 py-1 text-sm text-secondary-foreground'
              : 'rounded-full border border-quaternary px-3 py-1 text-sm text-secondary-foreground'
          }
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

/**
 * Something is on its way: a line saying what, and the shape of what is
 * coming — summary, points, ideas — so the page does not jump when it lands.
 */
function Waiting({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-8" aria-busy>
      <div className="flex items-start gap-3">
        <Spinner tone="onSurface" className="mt-0.5 w-5" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-tertiary-foreground">{body}</p>
        </div>
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
