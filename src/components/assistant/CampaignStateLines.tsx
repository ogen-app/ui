import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ResultBlock, ResultRow, TEXT_ACTION_CLASS } from './blocks'
import { counted, formatNumber } from '@/lib/intl'
import type { CampaignState } from '@/types/assistant'

/**
 * The figures a campaign reply leaned on, cited in one quiet line under it
 * (CON-483): "Read from the campaign · April 14 of 20 · 2 conflicts · 4 of 8
 * sources ready". Whatever the state doesn't have is left out, and with
 * nothing to cite there is no line.
 */
export function StateCitation({ state }: { state: CampaignState }) {
  const { t } = useTranslation()
  const parts = citedParts(t, state)
  if (parts.length === 0) return null
  return (
    <p className="border-t border-border pt-2 text-[12.5px] text-tertiary-foreground">
      {t('assistant.campaignState.readFrom')}
      <span className="ml-2 text-secondary-foreground">
        {parts.join(' · ')}
      </span>
    </p>
  )
}

function citedParts(t: TFunction, state: CampaignState): string[] {
  const parts: string[] = []
  const period = state.goal && !state.goal.unknown && state.goal.period
  if (period)
    parts.push(
      t('assistant.campaignState.period', {
        period: period.label,
        planned: formatNumber(period.planned),
        target: formatNumber(period.target),
      }),
    )
  if (state.calendar && state.calendar.total > 0)
    parts.push(
      t('assistant.campaignState.conflicts', counted(state.calendar.total)),
    )
  const sources = state.sources
  if (sources && !sources.wholeBank && sources.attached > 0)
    parts.push(
      t('assistant.campaignState.sourcesReady', {
        ready: formatNumber(sources.attached - sources.notReady),
        attached: formatNumber(sources.attached),
      }),
    )
  return parts
}

/**
 * Whether the SOURCES card has something to say: the campaign's own
 * documents, some of them not ready to write from.
 */
function sourcesWorthShowing(state: CampaignState): boolean {
  const sources = state.sources
  return (
    !!sources &&
    !sources.wholeBank &&
    sources.notReady > 0 &&
    sources.items.length > 0
  )
}

/**
 * The campaign's sources and how each stands (CON-483): ready, still being
 * analysed, or couldn't be read — the answer to "why are the drafts so
 * generic?", with OPEN ASSETS to the campaign's documents. Nothing when
 * every source is ready, or the campaign writes from the whole bank.
 */
export function SourcesCard({
  state,
  campaignId,
}: {
  state: CampaignState
  campaignId?: string
}) {
  const { t } = useTranslation()
  const sources = state.sources
  if (!sources || !sourcesWorthShowing(state)) return null
  return (
    <ResultBlock
      status={t('assistant.campaignState.sources.word')}
      title={t('assistant.campaignState.sources.title', {
        ready: formatNumber(sources.attached - sources.notReady),
        attached: formatNumber(sources.attached),
      })}
      action={
        campaignId && (
          <Link
            to="/campaigns/$campaignId/assets"
            params={{ campaignId }}
            className={TEXT_ACTION_CLASS}
          >
            {t('assistant.campaignState.sources.open')}
          </Link>
        )
      }
    >
      {sources.items.map((item) => (
        <ResultRow key={item.id} className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">{item.title}</span>
          <span
            className={
              item.status === 'ready'
                ? 'text-[12.5px] text-tertiary-foreground'
                : 'text-[12.5px] text-warning-ink'
            }
          >
            {t(`assistant.campaignState.sources.${item.status}`)}
          </span>
        </ResultRow>
      ))}
    </ResultBlock>
  )
}
