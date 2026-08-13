import * as React from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowSquareOutIcon,
  CalendarDotsIcon,
  CardsThreeIcon,
  CaretDoubleLeftIcon,
  ChartLineUpIcon,
  GearSixIcon,
  LifebuoyIcon,
  NotepadIcon,
  ScanIcon,
  SidebarIcon,
  SignOutIcon,
  ToolboxIcon,
  UserIcon,
  XIcon,
} from '@phosphor-icons/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar.tsx'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { useCampaigns } from '@/hooks/useCampaigns'
import { formatAnchor } from '@/components/campaigns/calendar/date'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton.tsx'
import { CampaignIcon, campaignAbbr } from '@/components/layout/CampaignIcon.tsx'
import { LiveStatus } from '@/components/layout/LiveStatus'
import { campaignColorVar } from '@/lib/campaignColor.ts'

/** TODO: placeholder — no help site exists yet. Point at the real one when it does. */
const HELP_URL = 'https://getogen.com/help'

function SectionLabel({ children, isCollapsed }: { children: React.ReactNode; isCollapsed: boolean }) {
  return (
    <div
      className={cn(
        'px-1.5 lg:px-2.5 pt-5 pb-1 w-[232px] shrink-0 font-grotesk text-xs/4 font-medium uppercase text-sidebar-secondary-foreground transition-opacity duration-200',
        isCollapsed && 'opacity-0'
      )}
    >
      {children}
    </div>
  )
}

// Module scope, so the label is a key rather than a string — `t` is only
// available inside the component, and a constant built at import time would
// freeze whichever language was loaded first.
const CAMPAIGN_SUB_ITEMS = [
  { id: 'overview', labelKey: 'nav.campaign.overview', icon: SidebarIcon },
  { id: 'posts', labelKey: 'nav.campaign.posts', icon: CalendarDotsIcon },
  { id: 'analytics', labelKey: 'nav.campaign.analytics', icon: ChartLineUpIcon },
  { id: 'brief', labelKey: 'nav.campaign.brief', icon: NotepadIcon },
  { id: 'assets', labelKey: 'nav.campaign.assets', icon: ScanIcon },
  { id: 'settings', labelKey: 'nav.campaign.settings', icon: GearSixIcon },
] as const

type CampaignSubItemId = (typeof CAMPAIGN_SUB_ITEMS)[number]['id']

/** The app's main navigation sidebar, including the user/workspace menu. */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, setOpen, toggleSidebar } = useSidebar()
  const { t } = useTranslation()
  const location = useLocation()
  const isCollapsed = isMobile ? false : state === 'collapsed'
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data: campaigns, isPending: campaignsPending } = useCampaigns()

  const activeCampaignId = location.pathname.match(/^\/campaigns\/([^/]+)/)?.[1] ?? null

  // The heading belongs to whichever of the two bodies below is rendering —
  // skeleton rows or real ones — so it is written once for both.
  const showCampaignsGroup = campaignsPending
    ? !isCollapsed
    : !!campaigns && campaigns.length > 0

  const handleLogout = () => {
    navigate({ to: '/auth/logout' })
  }

  // Everything unrecognised is the calendar, which is what Posts opens — so
  // each real section has to be named before that fallback is reached.
  const activeSubItem: CampaignSubItemId | null = !activeCampaignId
    ? null
    : location.pathname.includes('/overview')
      ? 'overview'
      : location.pathname.includes('/analytics')
        ? 'analytics'
        : location.pathname.includes('/brief')
          ? 'brief'
          : location.pathname.includes('/assets')
            ? 'assets'
            : location.pathname.includes('/settings')
              ? 'settings'
              : 'posts'

  // Posts lands on the current week of the calendar; the rest are plain pages.
  const subItemLink = (campaignId: string, id: CampaignSubItemId): { to: string; params: Record<string, string> } =>
    id === 'posts'
      ? {
          to: '/campaigns/$campaignId/calendar/$anchor/$view',
          params: { campaignId, anchor: formatAnchor(new Date()), view: 'week' },
        }
      : { to: `/campaigns/$campaignId/${id}`, params: { campaignId } }

  const initials =
    `${user?.firstName[0] ?? ''}${user?.lastName[0] ?? ''}`.toUpperCase() || '?'
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  return (
    <>
      <Sidebar collapsible="icon" className={'select-none'} {...props}>
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
              <Link
                to="/"
                className={cn('flex items-center gap-2 font-semibold text-lg transition-all')}
              >
                <Logo className="size-10 shrink-0" />
              </Link>
            )}
            {isMobile ? (
              <Logo className={'size-8'} />
            ) : (
              <Button
                variant="ghost"
                size="xsIcon"
                className={cn(
                  'flex group/button h-full transition-all duration-150',
                  isCollapsed && 'opacity-0 pointer-events-none',
                  !isCollapsed && 'opacity-100 delay-100'
                )}
                onClick={() => setOpen(false)}
              >
                <CaretDoubleLeftIcon
                  className="size-3 text-quaternary-foreground group-hover/button:text-primary-foreground transition-colors"
                />
              </Button>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav
            className={cn('flex flex-col gap-1 px-3 py-0 lg:px-6', isCollapsed && 'items-center')}
          >
            <SectionLabel isCollapsed={isCollapsed}>{t('nav.modules')}</SectionLabel>
            <AppSidebarButtonMenu
              icon={
                <ToolboxIcon weight="regular" className="size-5 flex-none" />
              }
              text={t('nav.campaigns')}
              isActive={location.pathname === '/campaigns'}
              to="/campaigns"
            />
            <AppSidebarButtonMenu
              icon={
                <CardsThreeIcon weight="regular" className="size-5 flex-none" />
              }
              text={t('nav.contentBank')}
              isActive={location.pathname.startsWith('/content-bank')}
              to="/content-bank"
            />

            {/* The nav is the same on every page, so an empty group here is
                the first thing you see on a cold load. Three rows hold the
                space the campaigns will take. */}
            {showCampaignsGroup && (
              <SectionLabel isCollapsed={isCollapsed}>{t('nav.campaigns')}</SectionLabel>
            )}
            {campaignsPending && !isCollapsed && (
              <>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </>
            )}

            {campaigns?.map((campaign) => {
              const isActive = campaign.id === activeCampaignId
              const name = campaign.name.trim() || t('nav.untitledCampaign')
              return (
                <React.Fragment key={campaign.id}>
                  <AppSidebarButtonMenu
                    icon={
                      <CampaignIcon
                        abbr={campaignAbbr(name)}
                        active={isActive}
                        color={campaignColorVar(campaign.id)}
                        className="size-5 flex-none"
                      />
                    }
                    text={name}
                    isActive={isActive}
                    to="/campaigns/$campaignId"
                    params={{ campaignId: campaign.id }}
                  />
                  {isActive && (
                    // Sub-items sit flush against each other; the 12px pad
                    // plus the nav's 4px gap makes 16px before the next
                    // campaign. The 2px rule closes the sub-menu, so the
                    // campaign that follows doesn't read as one more of
                    // its sections.
                    <div className="flex w-full flex-col gap-0 pb-3 border-b-2 border-quaternary">
                      {CAMPAIGN_SUB_ITEMS.map((item) => {
                        const subActive = activeSubItem === item.id
                        const link = subItemLink(campaign.id, item.id)
                        return (
                          <AppSidebarButtonMenu
                            key={item.id}
                            icon={
                              // Same 20px icon slot as top-level items so the labels
                              // line up; only the glyph inside is smaller.
                              <span className="flex size-5 flex-none items-center justify-center">
                                <item.icon className="size-4" />
                              </span>
                            }
                            text={t(item.labelKey)}
                            isActive={subActive}
                            to={link.to}
                            params={link.params}
                            className="lg:h-8 text-xs"
                          />
                        )
                      })}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        </SidebarContent>

        <SidebarFooter>
          <LiveStatus isCollapsed={isCollapsed} />
          <AppSidebarButtonMenu
            icon={
              <GearSixIcon weight="regular" className="size-5 flex-none" />
            }
            text={t('nav.workspaceSettings')}
            isActive={location.pathname.startsWith('/workspace-settings')}
            to="/workspace-settings"
          />
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  className={cn('flex w-full items-center justify-start gap-6 p-0 cursor-pointer select-none overflow-hidden')}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-10">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                  </div>
                  <div className="flex w-[168px] shrink-0 flex-col items-start transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
                    <p className="w-full text-sm font-regular truncate text-left">{fullName}</p>
                    <p className="w-full text-xs text-tertiary-foreground truncate text-left">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-72 p-2 shadow-md"
                side="right"
                align="end"
                sideOffset={8}
              >
                {/* The same block the sidebar shows, in the same type — avatar,
                    name, email — so opening the menu reads as the trigger
                    unfolding rather than as a different screen. */}
                <DropdownMenuLabel
                  className="flex items-center gap-3 p-2 font-normal tracking-normal"
                  asChild
                >
                  <div>
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-sm text-primary-foreground">{fullName}</p>
                      <p className="truncate text-xs text-tertiary-foreground">{user?.email}</p>
                      {user?.tenant && (
                        <p className="truncate text-xs text-tertiary-foreground">
                          {user.tenant.name}
                        </p>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem
                  size="lg"
                  className="px-2"
                  onSelect={() => navigate({ to: '/profile' })}
                >
                  <UserIcon weight="bold" />
                  <span>{t('nav.profile')}</span>
                </DropdownMenuItem>

                <DropdownMenuItem size="lg" className="px-2" asChild>
                  {/* A real link, not an onSelect: middle-click and "copy link"
                      should work on the one row that leaves the app. */}
                  <a href={HELP_URL} target="_blank" rel="noreferrer noopener">
                    <LifebuoyIcon weight="bold" />
                    <span className="flex-1">{t('nav.help')}</span>
                    <ArrowSquareOutIcon
                      weight="bold"
                      className="text-tertiary-foreground"
                      aria-label={t('common.opensInNewTab')}
                    />
                  </a>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem onClick={handleLogout} size="lg" className="px-2">
                  <SignOutIcon weight="bold" />
                  <span>{t('nav.logOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

    </>
  )
}
