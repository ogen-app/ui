import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
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
import { PlatformsSection } from '@/components/workspace-settings/PlatformsSection'
import { ConnectPlatformsSection } from '@/components/workspace-settings/ConnectPlatformsSection'

export const Route = createFileRoute('/_authenticated/workspace-settings/')({
  component: WorkspaceSettings,
})

/** Workspace Settings page: workspace identity, connected platforms, connect grid. */
function WorkspaceSettings() {
  const { t } = useTranslation()
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
        <PageError header={t('workspaceSettings.loadFailed')} />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="fullFlex">
      <SettingsSaveProvider>
        <div className="h-0 grow overflow-y-auto flex flex-col">
          <PageHeader
            title={t('workspaceSettings.title')}
            fadeOnScroll
            actions={<SettingsSaveButton />}
          />
          <div className="flex flex-col gap-8 px-3 lg:px-6 pt-4 pb-10">
            <WorkspaceSection />
            <PlatformsSection />
            <ConnectPlatformsSection />
          </div>
        </div>
      </SettingsSaveProvider>
    </PageContainer>
  )
}
