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
 */
export function AnalyticsPage() {
  const [window, setWindow] = useState<string>(DEFAULT_OVERVIEW_WINDOW)
  // Zernio's wire slug, which since CON-292 is the one identifier both ends
  // understand: the dictionary that draws the marks is filed under it, and the
  // board is the read the server narrows by it. It used to be our sqid, with a
  // translation on the way to the request — but a sqid is a row address the
  // server mints, and it was never the thing either side was naming.
  const [platform, setPlatform] = useState<string | undefined>(undefined)
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

  const overview = useAnalyticsOverview(window)
  const performers = useAnalyticsPerformers(window, by, platform)
  const learnings = useAnalyticsLearnings(metric)

  // Whether a filter the two standing cards cannot honour is on screen at all.
  // The bar hides its marks when only one platform is connected, and a card
  // must not disclaim a control the reader cannot see.
  const filterable = platforms.filter((p) => p.accounts > 0).length > 1

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
          card the controls above reach least, and the reader meets it having
          already used them.
        */}
        <div className="flex flex-col gap-3 px-3 lg:px-6 pt-4 pb-10">
          <WorkspaceScopeBar
            platforms={platforms}
            platform={platform}
            onPlatformChange={setPlatform}
            window={window}
            windows={OVERVIEW_WINDOWS}
            onWindowChange={setWindow}
          />
          <WorkspaceOverviewView {...overview} everyPlatform={filterable} />
          <WorkspacePerformersView
            result={performers}
            by={by}
            onChangeBasis={setBy}
          />
          <WorkspaceLearningsView
            result={learnings}
            metric={metric}
            onChangeMetric={setMetric}
            everyPlatform={filterable}
          />
        </div>
      </div>
    </PageContainer>
  )
}
