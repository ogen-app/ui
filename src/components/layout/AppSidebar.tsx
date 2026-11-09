import * as React from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from '@hugeicons/core-free-icons'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar.tsx'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { CampaignLevel } from '@/components/layout/nav/CampaignLevel'
import { NavIcon } from '@/components/layout/nav/NavIcon'
import { NavPane } from '@/components/layout/nav/NavPane'
import { NavUtilityStrip } from '@/components/layout/nav/NavUtilityStrip'
import { WorkspaceLevel } from '@/components/layout/nav/WorkspaceLevel'
import { LiveStatus } from '@/components/layout/LiveStatus'
import { identityColorVar } from '@/lib/identity.ts'
import { navLevelOf } from '@/lib/navLevel'

/**
 * The app's navigation rail — two levels, one at a time.
 *
 * **The change this is.** The system has two things called Campaigns: the
 * collection, which is a module and belongs in a rail, and the instance, which
 * is an object and has no rail slot of its own. The old sidebar nested one
 * inside the other, so the instance had to borrow the module's vocabulary and
 * the rail ended up a replica of itself — an Analytics under an Analytics,
 * separated by an indent. Here the campaign *replaces* the level instead:
 * level 0 is the workspace, level 1 is one campaign, and neither ever draws
 * the other's rows.
 *
 * Which level is on screen is read off the URL (`lib/navLevel`) and held
 * nowhere. A level in state has to be pushed by every navigation that could
 * change it — the back row, a card on `/campaigns`, a notification opening a
 * post, the browser's own back button — and the one that gets missed leaves
 * the rail drawing a campaign the page is no longer showing.
 *
 * **Who and where are the top bar's.** The workspace (with you in it) sits in
 * the top-left corner above this rail, and the campaign in the bar's second
 * column above the page, as a switcher (`AppTopBar`). So the rail has no
 * header: it is the levels, then a footer of the utilities — whose
 * destinations survive the drill but whose shape does not (`NavUtilityStrip`)
 * — and the collapse, across the whole bottom edge.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile } = useSidebar()
  const { pathname } = useLocation()
  const isCollapsed = isMobile ? false : state === 'collapsed'

  const { level, campaignId } = navLevelOf(pathname)

  return (
    // The 1px `border` rule is the right panel's divider mirrored: the two
    // rails frame the work area, so they are edged the same way and in the
    // same tone. Desktop only — `className` never reaches the mobile sheet,
    // which floats over the content and needs no seam.
    //
    // It has to be written with the same `group-data-[side=left]` prefix the
    // primitive uses to zero the border out: a plain `border-r` is a weaker
    // selector *and* a different key to `twMerge`, so it would lose on both
    // counts instead of replacing it.
    <Sidebar
      collapsible="icon"
      className={'select-none group-data-[side=left]:border-r border-border'}
      {...props}
    >
      {/* The campaign's identity colour as a rule down the whole rail, in the
          hue its mark wears in the top bar — the level's edge. Absolute
          against the sidebar's own fixed container, so it runs past the
          footer too.

          Static: it belongs to the level the way the level's rows do, and a
          bar that draws itself on arrival would turn a property of the place
          into an event that happened.

          It survives the collapse, where it is worth more than at full width:
          a 52px rail has room for glyphs and nothing else, so the rule is
          most of what is left saying you are inside something rather than at
          the top level. */}
      {level === 1 && campaignId && (
        <span
          aria-hidden
          style={{ background: identityColorVar(campaignId) }}
          className="absolute left-0 top-0 h-full w-[3px]"
        />
      )}

      {/* `overflow-hidden`, against the primitive's own `overflow-auto`: the
          panes are absolutely placed and the outgoing one is deliberately
          32px off the left edge, which an `auto` ancestor would offer to
          scroll to. Each level scrolls inside itself instead. */}
      <SidebarContent className="overflow-hidden">
        {/* Both levels stay mounted through the push — see `NavPane`. */}
        <div className="relative flex-1 overflow-hidden">
          <NavPane shown={level === 0} from="left">
            <WorkspaceLevel />
          </NavPane>
          <NavPane shown={level === 1} from="right">
            {campaignId && <CampaignLevel campaignId={campaignId} />}
          </NavPane>
        </div>
      </SidebarContent>

      <SidebarFooter className="gap-1 p-0 lg:gap-1 lg:p-0">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          <LiveStatus isCollapsed={isCollapsed} />
          <NavUtilityStrip level={level} campaignId={campaignId} />
        </div>
        <CollapseRow />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/**
 * The collapse, as the rail's bottom edge: a full-width row under a hairline,
 * so it reads as part of the frame rather than as one more destination.
 *
 * It used to be a small double caret in the header's corner, which only
 * existed at full width — collapsed, the way back out was the rail's invisible
 * edge or `[`. Down here it is the same row at both widths, and on a phone,
 * where the rail is a sheet, it is what closes it.
 */
function CollapseRow() {
  const { t } = useTranslation()
  const { state, isMobile, toggleSidebar } = useSidebar()
  const collapsed = !isMobile && state === 'collapsed'
  const label = collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')

  return (
    <div className="border-t border-border p-2">
      <AppSidebarButtonMenu
        icon={
          <NavIcon icon={collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon} />
        }
        text={label}
        isActive={false}
        onClick={toggleSidebar}
        className="text-tertiary-foreground"
        shortcut="["
      />
    </div>
  )
}
