import { useState } from 'react'
import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { PageHeader } from '@/components/page-primitives/PageHeader.tsx'
import { Picker } from '@/components/analytics/ComparisonBar'
import { NotYet, SectionCard } from '@/components/analytics/shell'
import { WorkspaceOverviewView } from '@/components/analytics/WorkspaceOverview'
import {
  DEFAULT_OVERVIEW_WINDOW,
  OVERVIEW_WINDOWS,
  useAnalyticsOverview,
} from '@/hooks/useAnalyticsOverview.ts'
import { useFeatureFlag } from '@/config/featureFlags.ts'

/**
 * Analytics — the workspace's own numbers (CON-237).
 *
 * Workspace-wide because the endpoint is: `/api/analytics/overview` is
 * tenant-scoped and takes neither a campaign nor a platform, so this is a
 * destination of its own rather than a section inside a campaign. The campaign
 * Analytics tab keeps answering the campaign's question by a different route.
 *
 * The window picker sits top-right, which is the corner for anything that
 * switches a representation and never changes the document (CON-178). It is the
 * only control on the page, and the card repeats the window it resolved to in
 * its own heading — the server does the resolving, so what the picker asked for
 * and what the figures cover are two different facts and both are shown.
 */
export function AnalyticsPage() {
  const enabled = useFeatureFlag('analytics-overview')

  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        {enabled ? <Live /> : <ComingSoon />}
      </div>
    </PageContainer>
  )
}

/**
 * Split from {@link ComingSoon} so an off flag makes no request: the hook
 * mounts with the feature rather than beside it.
 */
function Live() {
  const [window, setWindow] = useState<string>(DEFAULT_OVERVIEW_WINDOW)
  const result = useAnalyticsOverview(window)
  const current =
    OVERVIEW_WINDOWS.find((w) => w.window === window) ?? OVERVIEW_WINDOWS[1]

  return (
    <>
      <PageHeader
        title="Analytics"
        actions={
          <Picker
            label="Period"
            value={current.label}
            options={OVERVIEW_WINDOWS.map((w) => ({
              value: w.window,
              label: w.label,
            }))}
            onChange={setWindow}
          />
        }
      />
      <div className="flex flex-col gap-3 px-3 lg:px-6 pt-4 pb-10">
        <WorkspaceOverviewView {...result} />
      </div>
    </>
  )
}

/**
 * The page before it measures anything. No numbers and no zeroes — a
 * placeholder that invents figures is worse than an empty page, because the
 * reader can't tell which is which.
 *
 * No period picker either: a control that can only change a sentence is a
 * control that teaches people it does nothing.
 */
function ComingSoon() {
  return (
    <>
      <PageHeader title="Analytics" />
      <div className="flex flex-col gap-3 px-3 lg:px-6 pt-4 pb-10">
        <SectionCard title="What happened">
          <NotYet title="Not switched on yet">
            How this workspace's posts did once they went out — reach,
            interactions, engagement rate, followers and how much you published,
            each against the stretch before it. Nothing else about the workspace
            is affected, and the numbers will fill in here on their own once
            this is switched on.
          </NotYet>
        </SectionCard>
      </div>
    </>
  )
}
