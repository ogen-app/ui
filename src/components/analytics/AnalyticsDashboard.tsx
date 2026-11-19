import { useMemo, useState } from 'react'
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
 * The analytics dashboard: what happened (CON-237), which posts did it
 * (CON-238), and what holds regardless (CON-239).
 *
 * One dashboard at both levels, because the campaign is a filter over it: the
 * workspace's page (`/analytics`) lets the reader pick the campaign in the
 * scope bar, and a campaign's Analytics tab is the same dashboard with the
 * campaign fixed by its address (`campaign`) and no picker. The overview and
 * the board narrow to it on the server (`campaign_id`, CON-288); the lessons
 * card is the workspace's either way — the endpoint refuses a campaign — and
 * says so.
 *
 * **Three controls, in two different places, because they are two different
 * kinds of thing.** The period and the platforms are the page's, in the scope
 * bar above the cards. A card's own control sits in that card's own header:
 * the board chooses what "best" means, the lessons card chooses what it mines
 * on. Putting either in the bar would claim it governs the page.
 *
 * And the period does not govern the page either, which is the thing the
 * layout has to make visible. The first two cards repeat the window they
 * resolved to in their own headings; the third takes no window at all and says
 * so under its title. A card that quietly ignored the control above it would
 * be the worst of the three options. The platforms, by contrast, reach all
 * three (CON-289) — so no card has to disclaim them.
 *
 * The period, the platforms and — on the workspace's page — the campaign are
 * the address (CON-463), so the assistant can set them and a link carries
 * them; the page owns the address and hands it in.
 */
export function AnalyticsDashboard({
  search,
  onSearchChange,
  campaign,
}: {
  search: AnalyticsSearch
  onSearchChange: (next: AnalyticsSearch) => void
  /** A campaign's tab: the campaign the dashboard is fixed to, with no picker. */
  campaign?: string
}) {
  const range =
    search.from && search.to ? { from: search.from, to: search.to } : undefined
  const window = search.window ?? DEFAULT_OVERVIEW_WINDOW
  const period = range ?? { window }
  const campaignId = campaign ?? search.campaign_id
  // Zernio's wire slugs, which since CON-292 are the one identifier both ends
  // understand: the dictionary that draws the marks is filed under them, and
  // all three reads narrow by them (CON-289). Empty is every platform, and is
  // sent as no parameter at all.
  const selected = searchPlatforms(search)
  const setSelected = (next: string[]) =>
    onSearchChange({
      ...search,
      platform: next.length > 0 ? next.join(',') : undefined,
    })
  const setWindow = (next: string) =>
    onSearchChange({ ...search, window: next, from: undefined, to: undefined })
  const setCampaign = (next: string | undefined) =>
    onSearchChange({ ...search, campaign_id: next })
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
  const answeredPreset = overview.preset
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

  /*
    What happened, then which posts did it, then what holds whatever the
    period. The order is the order the questions arrive in: the overview's
    five figures provoke exactly one follow-up and the board is it, and only
    once you have seen both is "so what should we do differently" a question
    rather than a slogan. It is last for a second reason — it is the one card
    the period above does not reach, and the reader meets it having already
    used it.
  */
  return (
    <div className="flex flex-col gap-3">
      <WorkspaceScopeBar
        platforms={platforms}
        selected={selected}
        onSelectedChange={setSelected}
        window={window}
        windows={OVERVIEW_WINDOWS}
        onWindowChange={setWindow}
        range={range}
        {...(campaign
          ? {}
          : {
              campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
              campaignId,
              onCampaignChange: setCampaign,
            })}
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
  )
}
