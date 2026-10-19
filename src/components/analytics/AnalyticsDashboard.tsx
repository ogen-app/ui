import { useState } from 'react'
import { WorkspaceScopeBar } from './WorkspaceScopeBar'
import { WorkspaceLearningsView } from './WorkspaceLearnings'
import { WorkspaceOverviewView } from './WorkspaceOverview'
import { WorkspacePerformersView } from './WorkspacePerformers'
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

/**
 * The analytics dashboard: what happened (CON-237), which posts did it
 * (CON-238), and what holds regardless (CON-239) — for the workspace, or with a
 * campaign for that campaign (CON-288).
 *
 * **One component at both levels, and `campaignId === null` is the workspace.**
 * The campaign's Analytics section is this dashboard with the campaign passed
 * to the reads, by the same rule that makes every row of the campaign's menu the
 * workspace's narrowed: two pages that drew the same three questions differently
 * would read as two features. The campaign changes exactly three things, and
 * each is the server's answer rather than ours:
 *
 * - **The overview and the board are the campaign's**, except the followers
 *   figure, which the server leaves workspace-wide — followers belong to
 *   accounts — and names in `followers_scope`, so the tile says so.
 * - **The board still measures each post against the workspace's typical
 *   post**, so "2.1×" keeps meaning "twice your usual", which is the question a
 *   campaign is asking.
 * - **The lessons card is the workspace's.** `/learnings` refuses a campaign:
 *   an all-time lesson mined from one campaign's history is a much thinner
 *   claim. The card says so in its header rather than sitting silently under a
 *   page that is about one campaign.
 *
 * **Three controls, in two different places, because they are two different
 * kinds of thing.** The period and the platforms are the page's, so they sit in
 * the scope bar above the cards; a card's own control sits in that card's own
 * header — the board chooses what "best" means, the lessons card chooses what it
 * mines on. Putting either in the scope bar would claim it governs the page.
 *
 * And the period does not govern the page either, which is the thing the layout
 * has to make visible. The first two cards repeat the window they resolved to
 * in their own headings; the third takes no window at all and says so under its
 * title. A card that quietly ignored the control above it would be the worst of
 * the options. The platforms, by contrast, reach all three (CON-289) — so the
 * scope bar's marks are a filter on the page, and no card has to disclaim them.
 */
export function AnalyticsDashboard({
  campaignId,
}: {
  /** The campaign to narrow to; `null` for the whole workspace. */
  campaignId: string | null
}) {
  const [window, setWindow] = useState<string>(DEFAULT_OVERVIEW_WINDOW)
  // Zernio's wire slugs, which since CON-292 are the one identifier both ends
  // understand: the dictionary that draws the marks is filed under them, and
  // all three reads narrow by them (CON-289). Empty is every platform, and is
  // sent as no parameter at all.
  const [selected, setSelected] = useState<string[]>([])
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
  const narrowedTo = counted.map((p) => p.label)

  const overview = useAnalyticsOverview(window, slugs, campaignId)
  const performers = useAnalyticsPerformers(window, by, slugs, campaignId)
  // No campaign, on purpose — the server answers 400 to one. See above.
  const learnings = useAnalyticsLearnings(metric, slugs)

  const campaign = campaignId !== null

  return (
    // What happened, then which posts did it, then what holds whatever the
    // period. The order is the order the questions arrive in: the overview's
    // five figures provoke exactly one follow-up and the board is it, and only
    // once you have seen both is "so what should we do differently" a question
    // rather than a slogan. It is last for a second reason — it is the one card
    // the period above does not reach, and the reader meets it having already
    // used it.
    <div className="flex flex-col gap-3 pb-10">
      <WorkspaceScopeBar
        platforms={platforms}
        selected={selected}
        onSelectedChange={setSelected}
        window={window}
        windows={OVERVIEW_WINDOWS}
        onWindowChange={setWindow}
      />
      <WorkspaceOverviewView
        {...overview}
        narrowedTo={narrowedTo}
        campaign={campaign}
      />
      <WorkspacePerformersView
        result={performers}
        by={by}
        onChangeBasis={setBy}
        narrowedTo={narrowedTo}
        campaign={campaign}
      />
      <WorkspaceLearningsView
        result={learnings}
        metric={metric}
        onChangeMetric={setMetric}
        narrowedTo={narrowedTo}
        wholeWorkspace={campaign}
      />
    </div>
  )
}
