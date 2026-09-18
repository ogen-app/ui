import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { usePlatforms } from '@/hooks/usePlatforms'
import {
  SettingsSaveBar,
  SettingsSaveProvider,
} from '@/components/settings/settingsSave'
import { PAGE_ACTION_BAR_INSET } from '@/components/page-primitives/PageActionBar'
import { cn } from '@/lib'
import { WorkspaceSection } from '@/components/workspace-settings/WorkspaceSection'
import { PlanSection } from '@/components/workspace-settings/PlanSection'
import { PeopleSection } from '@/components/workspace-settings/PeopleSection'
import { PlatformsSection } from '@/components/workspace-settings/PlatformsSection'
import { ConnectPlatformsSection } from '@/components/workspace-settings/ConnectPlatformsSection'
import { ConnectLanding } from '@/components/workspace-settings/ConnectLanding'
import { DeleteWorkspaceCard } from '@/components/workspace-settings/DeleteWorkspaceCard'

/**
 * Where the connect flow comes back to (CON-217), and where the expiry emails
 * point (CON-219).
 *
 * Every one of these is written by the backend, not by a link in the app: the
 * browser leaves for the platform's consent screen and is redirected here with
 * the outcome. All three are optional and none is trusted for anything beyond
 * choosing a message — `connected` and `reconnect` name things the server has
 * already done or decided.
 */
const workspaceSettingsSearchSchema = z.object({
  /** Zernio platform id of an account that just finished connecting. */
  connected: z.string().optional(),
  /** A `connect_error` code; see `ConnectLanding` for the ones we word. */
  connect_error: z.string().optional(),
  /**
   * An account id from a "your connection is expiring" email (CON-219).
   * Accepted so the link resolves rather than 404s; singling the account out
   * on the page is not part of CON-217 and wants its own issue.
   */
  reconnect: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/workspace-settings/')({
  validateSearch: workspaceSettingsSearchSchema,
  component: WorkspaceSettings,
})

/** Workspace Settings page: workspace identity, connected platforms, connect grid. */
function WorkspaceSettings() {
  const { t } = useTranslation()
  const { connected, connect_error: connectError } = Route.useSearch()
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
        {/* The connect callback still has to be consumed here — this page is
            where the flow returns, and the failed platforms request above has
            nothing to do with the outcome in the URL. Without it the
            parameters survive to re-announce themselves on every reload. */}
        <ConnectLanding connected={connected} connectError={connectError} />
        <PageError header={t('workspaceSettings.loadFailed')} />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <SettingsSaveProvider>
        {/* The scroller is nested inside a positioned wrapper so the save bar
            can anchor to the column without scrolling away with the cards. */}
        <div className="relative flex h-0 grow flex-col">
          <div className="h-0 grow overflow-y-auto flex flex-col">
            <PageHeader title={t('workspaceSettings.title')} fadeOnScroll />
            <div
              className={cn(
                'flex flex-col gap-8 px-3 lg:px-6 pt-4',
                PAGE_ACTION_BAR_INSET,
              )}
            >
              {/* This page is about the workspace you're in; the list of all
                  of them lives at /workspaces, one click from the Switch
                  button in the card below. */}
              {/* Above the cards: it reports on something that has already
                  happened, and the account it is about arrives below it. */}
              <ConnectLanding
                connected={connected}
                connectError={connectError}
              />
              <WorkspaceSection />
              <PlanSection />
              <PeopleSection />
              <PlatformsSection />
              <ConnectPlatformsSection />
              <DeleteWorkspaceCard />
            </div>
          </div>
          <SettingsSaveBar />
        </div>
      </SettingsSaveProvider>
    </PageContainer>
  )
}
