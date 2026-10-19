import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { PageHeader } from '@/components/page-primitives/PageHeader.tsx'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

/**
 * Analytics — the workspace's own numbers. The dashboard itself is shared with
 * the campaign's Analytics section, which passes its campaign where this passes
 * none; see `AnalyticsDashboard`.
 */
export function AnalyticsPage() {
  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader title="Analytics" />
        <div className="px-3 lg:px-6 pt-4">
          <AnalyticsDashboard campaignId={null} />
        </div>
      </div>
    </PageContainer>
  )
}
