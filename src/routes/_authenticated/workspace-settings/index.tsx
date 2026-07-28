import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { usePlatforms } from '@/hooks/usePlatforms'
import {
  SettingsSaveButton,
  SettingsSaveProvider,
} from '@/components/settings/settingsSave'
import { WorkspaceSection } from '@/components/workspace-settings/WorkspaceSection'
import { WorkspacesSection } from '@/components/workspace-settings/WorkspacesSection'
import { PeopleSection } from '@/components/workspace-settings/PeopleSection'
import { PlatformsSection } from '@/components/workspace-settings/PlatformsSection'
import { ConnectPlatformsSection } from '@/components/workspace-settings/ConnectPlatformsSection'
import { DeleteWorkspaceCard } from '@/components/workspace-settings/DeleteWorkspaceCard'

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
      <SettingsSaveProvider>
        <div className="h-0 grow overflow-y-auto flex flex-col">
          <PageHeader
            title="Workspace Settings"
            fadeOnScroll
            actions={<SettingsSaveButton />}
          />
          <div className="flex flex-col gap-8 px-3 lg:px-6 pt-4 pb-10">
            {/* Which workspaces exist comes before the settings of the one
                you're in — it's the question a person with several clients
                arrives on this page asking. */}
            <WorkspacesSection />
            <WorkspaceSection />
            <PeopleSection />
            <PlatformsSection />
            <ConnectPlatformsSection />
            <DeleteWorkspaceCard />
          </div>
        </div>
      </SettingsSaveProvider>
    </PageContainer>
  )
}
