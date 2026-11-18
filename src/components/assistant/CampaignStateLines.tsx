import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ResultBlock, ResultRow, TEXT_ACTION_CLASS } from './blocks'
import { counted, formatList, formatNumber } from '@/lib/intl'
import { periodName } from '@/lib/goalPeriod'
import type { CampaignCite, CampaignState } from '@/types/assistant'

/**
 * The figures a campaign reply leaned on, cited in one quiet line under it
 * (CON-483): "Read from the campaign · April 14 of 20 · 2 conflicts · 4 of 8
 * sources ready". Only what the reply says it relied on (`cites`, CON-511),
 * in its order; a part the state can't word is left out, and with nothing to
 * cite there is no line.
 */
export function StateCitation({
  state,
  cites,
}: {
  state: CampaignState
  cites: CampaignCite[]
}) {
  const { t } = useTranslation()
  const parts = cites.flatMap((cite) => citedPart(t, state, cite) ?? [])
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

/** One cited part in words, or nothing when the state can't say it. */
function citedPart(
  t: TFunction,
  state: CampaignState,
  cite: CampaignCite,
): string | undefined {
  const goal = state.goal && !state.goal.unknown ? state.goal : undefined
  switch (cite) {
    case 'goal':
      return goal && goal.perPeriod > 0
        ? t(
            goal.cadence === 'week'
              ? 'assistant.campaignState.goalWeek'
              : 'assistant.campaignState.goalMonth',
            counted(goal.perPeriod),
          )
        : undefined
    case 'period':
      return goal?.period
        ? t('assistant.campaignState.period', {
            period: periodName(goal.period),
            planned: formatNumber(goal.period.planned),
            target: formatNumber(goal.period.target),
          })
        : undefined
    case 'posts':
      return state.posts !== undefined
        ? t('assistant.campaignState.posts', counted(state.posts))
        : undefined
    case 'platforms':
      return state.platforms?.length
        ? formatList(state.platforms.map((p) => p.name))
        : undefined
    case 'sources': {
      const sources = state.sources
      return sources && !sources.wholeBank && sources.attached > 0
        ? t('assistant.campaignState.sourcesReady', {
            ready: formatNumber(sources.attached - sources.notReady),
            attached: formatNumber(sources.attached),
          })
        : undefined
    }
    case 'calendar':
      return state.calendar && state.calendar.total > 0
        ? t('assistant.campaignState.conflicts', counted(state.calendar.total))
        : undefined
  }
}

/**
 * The campaign's sources and how each stands (CON-483): ready, still being
 * analysed, or couldn't be read — the answer to "why are the drafts so
 * generic?", with OPEN ASSETS to the campaign's documents. Drawn when the
 * reply cites the sources (CON-511), every one ready or not; nothing when the
 * campaign writes from the whole bank, which has no list of its own.
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
  if (!sources || sources.wholeBank || sources.items.length === 0) return null
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
