import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { usePlatforms } from '@/hooks/usePlatforms'
import { WorkspaceSection } from '@/components/workspace-settings/WorkspaceSection'
import { PlatformsSection } from '@/components/workspace-settings/PlatformsSection'
import { ConnectPlatformsSection } from '@/components/workspace-settings/ConnectPlatformsSection'

export const Route = createFileRoute('/_authenticated/workspace-settings/')({
  component: WorkspaceSettings,
})

/** Workspace Settings page: workspace identity, connected platforms, connect grid. */
function WorkspaceSettings() {
  const { isLoading, isError } = usePlatforms()

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    )
  }

  if (isError) {
    return (
      <PageContainer>
        <PageError header="Failed to load settings" />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="fullFlex">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader
          title="Workspace Settings"
          className="sticky top-0 z-10 pb-6 pr-1 bg-gradient-to-b from-background from-42% to-transparent"
        />
        <div className="flex flex-col gap-8 px-3 lg:px-6 pb-10">
          <WorkspaceSection />
          <PlatformsSection />
          <ConnectPlatformsSection />
        </div>
      </div>
    </PageContainer>
  )
}
