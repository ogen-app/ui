import * as React from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { XIcon } from '@phosphor-icons/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar.tsx'
import { Button } from '@/components/ui/button'
import { CampaignLevel } from '@/components/layout/nav/CampaignLevel'
import { NavAccount } from '@/components/layout/nav/NavAccount'
import { WorkspaceCell } from '@/components/layout/nav/WorkspaceCell'
import { NavUtilityStrip } from '@/components/layout/nav/NavUtilityStrip'
import { WorkspaceLevel } from '@/components/layout/nav/WorkspaceLevel'
import { LiveStatus } from '@/components/layout/LiveStatus'
import { navLevelOf } from '@/lib/navLevel'

/**
 * The app's navigation rail — one menu.
 *
 * Which campaign the menu is narrowed to is chosen above the page
 * (`CampaignSwitcher`), not by drilling into a second level here: inside a
 * campaign the rows are its sections, outside it the workspace's places, and
 * the switch keeps you on the same kind of place (`lib/campaignScope`). The
 * scope is read off the URL (`lib/navLevel`) and held nowhere.
 *
 * The bands, top to bottom: the workspace (`WorkspaceCell`), the menu with
 * the utilities at its foot (`NavUtilityStrip`), and who you are
 * (`NavAccount`). The top and bottom bands are 56px, the bar's height.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, toggleSidebar } = useSidebar()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isCollapsed = isMobile ? false : state === 'collapsed'

  const { level, campaignId } = navLevelOf(pathname)

  return (
    <>
      {/* The 1px `border` rule is the right panel's divider mirrored: the two
          rails frame the work area, so they are edged the same way and in the
          same tone. Desktop only — `className` never reaches the mobile sheet,
          which floats over the content and needs no seam.

          It has to be written with the same `group-data-[side=left]` prefix the
          primitive uses to zero the border out: a plain `border-r` is a weaker
          selector *and* a different key to `twMerge`, so it would lose on both
          counts instead of replacing it. */}
      <Sidebar
        collapsible="icon"
        className={'select-none group-data-[side=left]:border-r border-border'}
        {...props}
      >
        {/* Top left: whose work this is. 56px, the bar's height, so its
            rule runs on into the bar's over the page. */}
        <SidebarHeader className="h-14 shrink-0 flex-row items-center gap-1 border-b border-border p-0 px-3 lg:p-0 lg:px-3">
          <WorkspaceCell />
          {isMobile && (
            <Button
              variant="ghost"
              size="smIcon"
              onClick={toggleSidebar}
              aria-label={t('nav.closeSidebar')}
            >
              <XIcon className="size-5" />
            </Button>
          )}
        </SidebarHeader>

        {/* One menu. Its rows follow the campaign scope chosen above the
            page (`CampaignSwitcher`) — a campaign's sections, or the
            workspace's places — and nothing slides: the scope is a filter
            over the same list, not a level you drill into. */}
        <SidebarContent className="gap-0">
          {level === 1 && campaignId ? (
            <CampaignLevel campaignId={campaignId} />
          ) : (
            <WorkspaceLevel />
          )}
          <div className="flex flex-col gap-0.5 px-3 pb-3">
            <LiveStatus isCollapsed={isCollapsed} />
            <NavUtilityStrip level={level} campaignId={campaignId} />
          </div>
        </SidebarContent>

        {/* You, mirroring the workspace at the top: the same row, the same
            56px band. */}
        <SidebarFooter className="h-14 shrink-0 flex-row items-center gap-0 border-t border-border p-0 px-3 lg:gap-0 lg:p-0 lg:px-3">
          <NavAccount />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}
