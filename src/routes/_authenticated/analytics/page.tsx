import { useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { PageHeader } from '@/components/page-primitives/PageHeader.tsx'
import { WorkspaceScopeBar } from '@/components/analytics/WorkspaceScopeBar'
import { WorkspaceLearningsView } from '@/components/analytics/WorkspaceLearnings'
import { WorkspaceOverviewView } from '@/components/analytics/WorkspaceOverview'
import {
  PerformerSelection,
  WorkspacePerformersView,
} from '@/components/analytics/WorkspacePerformers'
import {
  DEFAULT_OVERVIEW_WINDOW,
  OVERVIEW_WINDOWS,
  useAnalyticsOverview,
} from '@/hooks/useAnalyticsOverview.ts'
import { useAnalyticsPerformers } from '@/hooks/useAnalyticsPerformers.ts'
import { useAnalyticsLearnings } from '@/hooks/useAnalyticsLearnings.ts'
import { DEFAULT_PERFORMER_BASIS } from '@/lib/analyticsPerformersView'
import { DEFAULT_LEARNINGS_METRIC } from '@/lib/analyticsLearningsView'
import { usePlatformViews } from '@/hooks/usePlatforms.ts'
import { connectedAccounts } from '@/lib/platformDictionary.ts'
import type { LearningsMetric, PerformerSort } from '@/types/analytics'
import { useAssistantPage } from '@/hooks/useAssistantContext'
import { useCampaigns } from '@/hooks/useCampaigns'
import { searchPlatforms, type AnalyticsSearch } from '@/lib/analyticsSearch'

/**
 * Analytics — the workspace's own numbers: what happened (CON-237), which posts
 * did it (CON-238), and what holds regardless (CON-239).
 *
 * Workspace-wide because the endpoints are: all three of
 * `/api/analytics/{overview,performers,learnings}` are tenant-scoped and take
 * no campaign, so this is a destination of its own rather than a section inside
 * a campaign. The campaign Analytics tab keeps answering the campaign's
 * question by a different route.
 *
 * **Three controls, in two different places, because they are two different
 * kinds of thing.** The window is the page's — so it sits top-right, the corner
 * for anything that switches a representation and never changes the document
 * (CON-178). A card's own control sits in that card's own header: the board
 * chooses what "best" means, the lessons card chooses what it mines on. Putting
 * either in the corner would claim it governs the page.
 *
 * And the window does not govern the page either, which is the thing the layout
 * has to make visible. The first two cards repeat the window they resolved to
 * in their own headings; the third takes no window at all and says "All time —
 * not affected by the period above" under its title. A card that quietly
 * ignored the control above it would be the worst of the three options.
 *
 * The platforms, by contrast, reach all three (CON-289) — so the scope bar's
 * marks are a filter on the page, and no card has to disclaim them.
 */
export function AnalyticsPage() {
  const { t } = useTranslation()
  // The period, platforms and campaign are the address (CON-463): the
  // assistant's `set_window` lands there, and BACK puts the old one back.
  const search = useSearch({ from: '/_authenticated/analytics/' })
  const navigate = useNavigate({ from: '/analytics/' })
  const setSearch = (next: AnalyticsSearch) =>
    void navigate({ search: next, replace: true })
  const range =
    search.from && search.to ? { from: search.from, to: search.to } : undefined
  const window = search.window ?? DEFAULT_OVERVIEW_WINDOW
  const period = range ?? { window }
  const campaignId = search.campaign_id
  // Zernio's wire slugs, which since CON-292 are the one identifier both ends
  // understand: the dictionary that draws the marks is filed under them, and
  // all three reads narrow by them (CON-289). Empty is every platform, and is
  // sent as no parameter at all.
  const selected = searchPlatforms(search)
  const setSelected = (next: string[]) =>
    setSearch({
      ...search,
      platform: next.length > 0 ? next.join(',') : undefined,
    })
  const setWindow = (next: string) =>
    setSearch({ ...search, window: next, from: undefined, to: undefined })
  const setCampaign = (next: string | undefined) =>
    setSearch({ ...search, campaign_id: next })
  const campaigns = useCampaigns().data ?? []
  // The board's own control, held here because it is a query parameter rather
  // than a view of what is already loaded — the server ranks and sends two
  // clamped ends, so re-ranking is a refetch.
  const [by, setBy] = useState<PerformerSort>(DEFAULT_PERFORMER_BASIS)
  // The lessons card's own, and deliberately not passed the window: that read
  // is all-time and takes no date range at all.
  const [metric, setMetric] = useState<LearningsMetric>(
    DEFAULT_LEARNINGS_METRIC,
  )

  const views = usePlatformViews()
  const platforms = views.map((view) => ({
    id: view.info.zernioId,
    label: view.info.name,
    accounts: connectedAccounts(view).length,
  }))

  // What is actually counted: only platforms the bar still draws a mark for.
  // One that lost its last account while chosen, or the only one left
  // connected, has no mark to switch it off with — and a filter nobody can see
  // must not be narrowing the numbers.
  const connected = platforms.filter((p) => p.accounts > 0)
  const counted =
    connected.length > 1 ? connected.filter((p) => selected.includes(p.id)) : []
  const slugs = counted.map((p) => p.id)

  // Performers the reader ticked, for "make more like these" (CON-455).
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const performerSelection = useMemo(
    () => ({
      selected: picked,
      toggle: (id: string) =>
        setPicked((prev) => {
          const next = new Set(prev)
          if (!next.delete(id)) next.add(id)
          return next
        }),
    }),
    [picked],
  )

  const overview = useAnalyticsOverview(period, slugs, campaignId)
  const performers = useAnalyticsPerformers(period, by, slugs, campaignId)

  // The assistant reads the period and platforms the overview on screen
  // answered for (CON-451) — the server's resolved dates, never ones worked out
  // here, so "this month" means what the card shows even near midnight UTC —
  // and the performers ticked.
  const answered = overview.range
  const answeredKey = overview.platforms.join(',')
  const answeredCampaign = overview.campaignId
  const answeredPreset = range ? undefined : window
  useAssistantPage(
    useMemo(() => {
      if (!answered && picked.size === 0) return null
      return {
        ...(answered
          ? {
              window: {
                from: answered.from,
                to: answered.to,
                // The picker's span, so the rail names it as the picker does.
                ...(answeredPreset ? { preset: answeredPreset } : {}),
                ...(answeredKey ? { platforms: answeredKey.split(',') } : {}),
                ...(answeredCampaign ? { campaignId: answeredCampaign } : {}),
              },
            }
          : {}),
        ...(picked.size > 0
          ? {
              selection: {
                kind: 'post' as const,
                ids: [...picked],
                count: picked.size,
              },
            }
          : {}),
      }
    }, [answered, answeredKey, answeredCampaign, answeredPreset, picked]),
  )

  const learnings = useAnalyticsLearnings(metric, slugs)

  // Each card names the platforms *its* answer counted, not the selection: a
  // card holds its last answer while the next is in flight, and the three
  // land at different moments.
  const namesOf = (shown: readonly string[]) =>
    shown.map((slug) => platforms.find((p) => p.id === slug)?.label ?? slug)

  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader title={t('analytics.surface.title')} />
        {/*
          What happened, then which posts did it, then what holds whatever the
          period. The order is the order the questions arrive in: the overview's
          five figures provoke exactly one follow-up and the board is it, and only
          once you have seen both is "so what should we do differently" a question
          rather than a slogan. It is last for a second reason — it is the one
          card the period above does not reach, and the reader meets it having
          already used it.
        */}
        <div className="flex flex-col gap-3 px-3 lg:px-6 pt-4 pb-10">
          <WorkspaceScopeBar
            platforms={platforms}
            selected={selected}
            onSelectedChange={setSelected}
            window={window}
            windows={OVERVIEW_WINDOWS}
            onWindowChange={setWindow}
            range={range}
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
            campaignId={campaignId}
            onCampaignChange={setCampaign}
          />
          <WorkspaceOverviewView
            {...overview}
            narrowedTo={namesOf(overview.platforms)}
          />
          <PerformerSelection.Provider value={performerSelection}>
            <WorkspacePerformersView
              result={performers}
              by={by}
              onChangeBasis={setBy}
              narrowedTo={namesOf(performers.platforms)}
            />
          </PerformerSelection.Provider>
          <WorkspaceLearningsView
            result={learnings}
            metric={metric}
            onChangeMetric={setMetric}
            narrowedTo={namesOf(learnings.platforms)}
            campaignNarrowed={Boolean(campaignId)}
          />
        </div>
      </div>
    </PageContainer>
  )
}
