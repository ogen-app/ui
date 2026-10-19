import { useState } from 'react'
import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { PageHeader } from '@/components/page-primitives/PageHeader.tsx'
import { WorkspaceScopeBar } from '@/components/analytics/WorkspaceScopeBar'
import { WorkspaceLearningsView } from '@/components/analytics/WorkspaceLearnings'
import { WorkspaceOverviewView } from '@/components/analytics/WorkspaceOverview'
import { WorkspacePerformersView } from '@/components/analytics/WorkspacePerformers'
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

  const overview = useAnalyticsOverview(window, slugs)
  const performers = useAnalyticsPerformers(window, by, slugs)
  const learnings = useAnalyticsLearnings(metric, slugs)

  // Each card names the platforms *its* answer counted, not the selection: a
  // card holds its last answer while the next is in flight, and the three
  // land at different moments.
  const namesOf = (shown: readonly string[]) =>
    shown.map((slug) => platforms.find((p) => p.id === slug)?.label ?? slug)

  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader title="Analytics" />
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
          />
          <WorkspaceOverviewView
            {...overview}
            narrowedTo={namesOf(overview.platforms)}
          />
          <WorkspacePerformersView
            result={performers}
            by={by}
            onChangeBasis={setBy}
            narrowedTo={namesOf(performers.platforms)}
          />
          <WorkspaceLearningsView
            result={learnings}
            metric={metric}
            onChangeMetric={setMetric}
            narrowedTo={namesOf(learnings.platforms)}
          />
        </div>
      </div>
    </PageContainer>
  )
}
