import * as React from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  CalendarDotsIcon,
  CardsThreeIcon,
  CaretDoubleLeftIcon,
  GearSixIcon,
  NotepadIcon,
  ScanIcon,
  SidebarIcon,
  SignOutIcon,
  ToolboxIcon,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCampaigns } from '@/hooks/useCampaigns'
import { formatAnchor } from '@/components/campaigns/calendar/date'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton.tsx'
import { CampaignIcon, campaignAbbr } from '@/components/layout/CampaignIcon.tsx'

function SectionLabel({ children, isCollapsed }: { children: React.ReactNode; isCollapsed: boolean }) {
  return (
    <div
      className={cn(
        'px-1.5 lg:px-2.5 pt-5 pb-1 text-xs font-mono uppercase text-quaternary-foreground truncate',
        isCollapsed && 'opacity-0'
      )}
    >
      {children}
    </div>
  )
}

const CAMPAIGN_SUB_ITEMS = [
  { id: 'overview', text: 'Overview', icon: SidebarIcon },
  { id: 'posts', text: 'Posts', icon: CalendarDotsIcon },
  { id: 'brief', text: 'Brief', icon: NotepadIcon },
  { id: 'assets', text: 'Assets', icon: ScanIcon },
  { id: 'settings', text: 'Settings', icon: GearSixIcon },
] as const

type CampaignSubItemId = (typeof CAMPAIGN_SUB_ITEMS)[number]['id']

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, setOpen, toggleSidebar } = useSidebar()
  const location = useLocation()
  const isCollapsed = isMobile ? false : state === 'collapsed'
  const { user } = useAuthStore()
  const { closeSecondaryNavbar } = useSettingsStore()
  const navigate = useNavigate()
  const { data: campaigns } = useCampaigns()

  const activeCampaignId = location.pathname.match(/^\/campaigns\/([^/]+)/)?.[1] ?? null

  const handleLogout = () => {
    navigate({ to: '/auth/logout' })
  }

  const activeSubItem: CampaignSubItemId | null = !activeCampaignId
    ? null
    : location.pathname.includes('/overview')
      ? 'overview'
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

  const initials = `${user!.firstName[0]}${user!.lastName[0]}`.toUpperCase()

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
                aria-label="Close sidebar"
              >
                <XIcon weight="bold" className="size-5" />
              </Button>
            ) : (
              <Link
                to="/"
                className={cn('flex items-center gap-2 font-semibold text-lg transition-all')}
                onClick={closeSecondaryNavbar}
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
                  weight="bold"
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
            <SectionLabel isCollapsed={isCollapsed}>Modules</SectionLabel>
            <AppSidebarButtonMenu
              icon={
                <ToolboxIcon
                  weight={location.pathname === '/campaigns' ? 'fill' : 'regular'}
                  className="size-5 flex-none"
                />
              }
              text="Campaigns"
              isActive={location.pathname === '/campaigns'}
              to="/campaigns"
              onClick={closeSecondaryNavbar}
            />
            <AppSidebarButtonMenu
              icon={
                <CardsThreeIcon
                  weight={location.pathname.startsWith('/content-bank') ? 'fill' : 'regular'}
                  className="size-5 flex-none"
                />
              }
              text="Content Bank"
              isActive={location.pathname.startsWith('/content-bank')}
              to="/content-bank"
              onClick={closeSecondaryNavbar}
            />

            {campaigns && campaigns.length > 0 && (
              <>
                <SectionLabel isCollapsed={isCollapsed}>Campaigns</SectionLabel>
                {campaigns.map((campaign) => {
                  const isActive = campaign.id === activeCampaignId
                  const name = campaign.name.trim() || 'Untitled campaign'
                  return (
                    <React.Fragment key={campaign.id}>
                      <AppSidebarButtonMenu
                        icon={
                          <CampaignIcon
                            abbr={campaignAbbr(name)}
                            active={isActive}
                            className="size-5 flex-none"
                          />
                        }
                        text={name}
                        isActive={isActive}
                        to="/campaigns/$campaignId"
                        params={{ campaignId: campaign.id }}
                        onClick={closeSecondaryNavbar}
                      />
                      {isActive && (
                        <div className="flex w-full flex-col gap-0.5 pb-2">
                          {CAMPAIGN_SUB_ITEMS.map((item) => {
                            const subActive = activeSubItem === item.id
                            const link = subItemLink(campaign.id, item.id)
                            return (
                              <AppSidebarButtonMenu
                                key={item.id}
                                icon={
                                  <item.icon
                                    weight={subActive ? 'fill' : 'regular'}
                                    className="size-4 flex-none"
                                  />
                                }
                                text={item.text}
                                isActive={subActive}
                                to={link.to}
                                params={link.params}
                                onClick={closeSecondaryNavbar}
                                className={cn('lg:h-8 text-xs', !isCollapsed && 'pl-4 lg:pl-6')}
                              />
                            )
                          })}
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </>
            )}
          </nav>
        </SidebarContent>

        <SidebarFooter>
          <AppSidebarButtonMenu
            icon={
              <GearSixIcon
                weight={location.pathname.startsWith('/instance-settings') ? 'fill' : 'regular'}
                className="size-5 flex-none"
              />
            }
            text="Workspace Settings"
            isActive={location.pathname.startsWith('/instance-settings')}
            to="/instance-settings"
            onClick={closeSecondaryNavbar}
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
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <p className="text-sm font-regular truncate">{`${user!.firstName} ${user!.lastName}`}</p>
                    <p className="text-xs text-tertiary-foreground truncate">
                      { user!.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-68 px-6 pt-6 pb-4 shadow-md"
                side="right"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuLabel className="font-normal p-0" asChild>
                  <div className="flex flex-col space-y-1">
                    <div className="h-8 text-xl font-display font-medium truncate">{`${user!.firstName} ${user!.lastName}`}</div>
                    <div className="text-sm leading-none text-tertiary-foreground">
                      {user!.email}
                    </div>
                  </div>
                </DropdownMenuLabel>


                  <DropdownMenuItem onClick={handleLogout} size="lg">
                    <SignOutIcon />
                    <span>Log out</span>
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
