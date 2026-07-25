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
        'px-1.5 lg:px-2.5 pt-5 pb-1 w-[232px] shrink-0 font-grotesk text-xs/4 font-medium uppercase text-sidebar-secondary-foreground transition-opacity duration-200',
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

/** The app's main navigation sidebar, including the user/workspace menu. */
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
                aria-label="Close sidebar"
              >
                <XIcon className="size-5" />
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
                <ToolboxIcon weight="regular" className="size-5 flex-none" />
              }
              text="Campaigns"
              isActive={location.pathname === '/campaigns'}
              to="/campaigns"
              onClick={closeSecondaryNavbar}
            />
            <AppSidebarButtonMenu
              icon={
                <CardsThreeIcon weight="regular" className="size-5 flex-none" />
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
                        // Sub-items sit flush against each other; the 12px pad
                        // plus the nav's 4px gap makes 16px before the next
                        // campaign.
                        <div className="flex w-full flex-col gap-0 pb-3">
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
                                text={item.text}
                                isActive={subActive}
                                to={link.to}
                                params={link.params}
                                onClick={closeSecondaryNavbar}
                                className="lg:h-8 text-xs"
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
              <GearSixIcon weight="regular" className="size-5 flex-none" />
            }
            text="Workspace Settings"
            isActive={location.pathname.startsWith('/workspace-settings')}
            to="/workspace-settings"
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
                  <div className="flex w-[168px] shrink-0 flex-col items-start transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
                    <p className="w-full text-sm font-regular truncate text-left">{fullName}</p>
                    <p className="w-full text-xs text-tertiary-foreground truncate text-left">
                      {user?.email}
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
                    <div className="h-8 text-xl font-display font-medium truncate">{fullName}</div>
                    <div className="text-sm leading-none text-tertiary-foreground">
                      {user?.email}
                    </div>
                    {user?.tenant && (
                      <div className="text-xs leading-none text-tertiary-foreground truncate pt-1">
                        Workspace: {user.tenant.name}
                      </div>
                    )}
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
