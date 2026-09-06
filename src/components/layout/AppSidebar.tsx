import * as React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  CaretDoubleLeftIcon,
  CaretLeftIcon,
  XIcon,
} from '@phosphor-icons/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar.tsx'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CampaignLevel } from '@/components/layout/nav/CampaignLevel'
import { NavAccount } from '@/components/layout/nav/NavAccount'
import { NavPane } from '@/components/layout/nav/NavPane'
import { NavUtilityStrip } from '@/components/layout/nav/NavUtilityStrip'
import { WorkspaceLevel } from '@/components/layout/nav/WorkspaceLevel'
import { CampaignIcon } from '@/components/layout/CampaignIcon.tsx'
import { LiveStatus } from '@/components/layout/LiveStatus'
import { Logo } from '@/components/Logo'
import { useCampaign } from '@/hooks/useCampaigns'
import { identityAbbr, identityColorVar } from '@/lib/identity.ts'
import { navLevelOf } from '@/lib/navLevel'
import { cn } from '@/lib'
import type { Campaign } from '@/types/campaigns'

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
 * change it — the back control, a card on `/campaigns`, a notification opening
 * a post, the browser's own back button — and the one that gets missed leaves
 * the rail drawing a campaign the page is no longer showing.
 *
 * The bands, top to bottom: a header that changes with the level, the levels
 * themselves, then a footer of two parts — a utility strip that never changes
 * (`NavUtilityStrip`) and an identity slot that does (`NavAccount`).
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, setOpen, toggleSidebar } = useSidebar()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isCollapsed = isMobile ? false : state === 'collapsed'

  const { level, campaignId } = navLevelOf(pathname)
  // Safe on the empty string — the hook is `enabled: !!id` — and seeded from
  // the campaigns list cache, so arriving from `/campaigns` draws the name
  // immediately rather than a skeleton the width of the rail.
  const { data: campaign } = useCampaign(campaignId ?? '')

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
        <SidebarHeader>
          <div className="flex items-center justify-between">
            {isMobile ? (
              <Button
                variant="default"
                size="smIcon"
                onClick={toggleSidebar}
                aria-label={t('nav.closeSidebar')}
              >
                <XIcon className="size-5" />
              </Button>
            ) : (
              <HeaderMark
                level={level}
                campaignId={campaignId}
                campaign={campaign}
              />
            )}
            {isMobile ? (
              <Logo className={'size-8'} />
            ) : (
              <Button
                variant="ghost"
                size="xsIcon"
                className={cn(
                  'flex group/button h-full transition-all duration-150',
                  'group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0',
                )}
                onClick={() => setOpen(false)}
              >
                <CaretDoubleLeftIcon className="size-3 text-quaternary-foreground group-hover/button:text-primary-foreground transition-colors" />
              </Button>
            )}
          </div>
        </SidebarHeader>

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
              {campaignId && (
                <CampaignLevel campaignId={campaignId} campaign={campaign} />
              )}
            </NavPane>
          </div>
        </SidebarContent>

        {/* Tighter than the primitive's `lg:gap-6`: these three bands are one
            block — status, utilities, who you are — and 24px between them read
            as three separate footers. */}
        <SidebarFooter className="lg:gap-4">
          <LiveStatus isCollapsed={isCollapsed} />
          <NavUtilityStrip />
          <NavAccount level={level} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}

/**
 * The rail's top-left slot: the product at level 0, the campaign at level 1,
 * with the way out beside it.
 *
 * **Back is chrome, not a row.** A back row inside the nav sits where a
 * section would, scrolls with them, and reads as one more destination — but
 * the way out of a level is not a place in it. Up here it is always in the
 * same spot and never in the list.
 *
 * Swapping the logo for the campaign's mark is the loudest thing the rail can
 * do to say the scope changed: the logo is the one element that never changes,
 * so changing it is unmistakable. It is also what carries the campaign through
 * a collapse — the name and window below are the first things a 48px rail
 * loses, and the mark plus its tooltip are what is left saying which campaign
 * you are in.
 */
function HeaderMark({
  level,
  campaignId,
  campaign,
}: {
  level: 0 | 1
  campaignId: string | null
  campaign: Campaign | undefined
}) {
  const { t } = useTranslation()

  if (level === 0 || !campaignId) {
    return (
      <Link
        to="/"
        className="flex items-center gap-2 text-lg font-semibold transition-all"
      >
        <Logo className="size-10 shrink-0" />
      </Link>
    )
  }

  const name = campaign?.name.trim() || t('nav.untitledCampaign')

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Button
        variant="ghost"
        size="smIcon"
        asChild
        aria-label={t('nav.backToWorkspace')}
        className="-ml-1.5 flex-none text-tertiary-foreground hover:text-sidebar-primary-foreground group-data-[collapsible=icon]:hidden"
      >
        <Link to="/campaigns">
          <CaretLeftIcon weight="bold" className="size-4" />
        </Link>
      </Button>
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          {/* Focusable, because collapsed this mark is the only thing naming
              the campaign and a tooltip nobody can reach by keyboard is not a
              label. It goes back rather than nowhere: on the collapsed rail
              the back control is hidden, so the mark has to be it. */}
          <Link
            to="/campaigns"
            aria-label={t('nav.backToWorkspace')}
            className="flex-none rounded-sm"
          >
            <CampaignIcon
              abbr={identityAbbr(name)}
              color={identityColorVar(campaignId)}
              active
              className="size-10"
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{name}</TooltipContent>
      </Tooltip>
    </div>
  )
}
