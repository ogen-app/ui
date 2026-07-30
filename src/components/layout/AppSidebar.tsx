import * as React from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  ArrowSquareOutIcon,
  ArrowsLeftRightIcon,
  CalendarDotsIcon,
  CardsThreeIcon,
  CaretDoubleLeftIcon,
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
import { useActiveWorkspace } from '@/hooks/useWorkspaces'
import { formatAnchor } from '@/components/campaigns/calendar/date'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton.tsx'
import { CampaignIcon } from '@/components/layout/CampaignIcon.tsx'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark.tsx'
import { ROLE_LABELS, type Workspace } from '@/types/workspace'

/** TODO: placeholder — no help site exists yet. Point at the real one when it does. */
const HELP_URL = 'https://getogen.com/help'
import { identityAbbr, identityColorVar } from '@/lib/identity.ts'

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
  const navigate = useNavigate()
  const { data: campaigns } = useCampaigns()
  const workspace = useActiveWorkspace()

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
          />
          <AppSidebarButtonMenu
            icon={
              <CardsThreeIcon weight="regular" className="size-5 flex-none" />
            }
            text="Content Bank"
            isActive={location.pathname.startsWith('/content-bank')}
            to="/content-bank"
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
                          abbr={identityAbbr(name)}
                          active={isActive}
                          color={identityColorVar(campaign.id)}
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
                              text={item.text}
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
        />
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                className={cn('flex w-full items-center justify-start gap-6 p-0 cursor-pointer select-none overflow-hidden')}
              >
                {/* The workspace's mark, not the user's portrait. The sidebar
                    belongs to one workspace at a time — every item above it is
                    that workspace's — and this is the one slot that survives
                    the collapsed rail, so it should carry the fact that
                    changes rather than the one that never does. Who you are is
                    in the menu behind it. */}
                {workspace ? (
                  <WorkspaceMark
                    id={workspace.id}
                    name={workspace.name}
                    className="size-10 text-sm"
                  />
                ) : (
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex w-[168px] shrink-0 flex-col items-start transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
                  <p className="w-full text-sm font-regular truncate text-left">{fullName}</p>
                  {/* The workspace, not the email: the email never changes
                      and is one click away in the menu, while the workspace
                      changes what every other screen is showing. */}
                  <p className="w-full text-xs text-tertiary-foreground truncate text-left">
                    {workspace?.name ?? user?.email}
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
                <span>Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem size="lg" className="px-2" asChild>
                {/* A real link, not an onSelect: middle-click and "copy link"
                    should work on the one row that leaves the app. */}
                <a href={HELP_URL} target="_blank" rel="noreferrer noopener">
                  <LifebuoyIcon weight="bold" />
                  <span className="flex-1">Help and support</span>
                  <ArrowSquareOutIcon
                    weight="bold"
                    className="text-tertiary-foreground"
                    aria-label="Opens in a new tab"
                  />
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-2" />

              <CurrentWorkspaceRow
                workspace={workspace}
                onSelect={() => navigate({ to: '/workspace-settings' })}
              />

              <DropdownMenuItem
                size="lg"
                className="px-2"
                onSelect={() => navigate({ to: '/workspaces' })}
              >
                <ArrowsLeftRightIcon weight="bold" />
                <span>Create or switch</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-2" />

              <DropdownMenuItem onClick={handleLogout} size="lg" className="px-2">
                <SignOutIcon weight="bold" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/**
 * Where you are and what you are there — and the way into that workspace's
 * settings, which is what the name and the role are both about.
 *
 * Not the switcher: that is its own row below, and it leads to a page rather
 * than a submenu because switching tears the app down (cleared cache, full
 * reload). The role sits here because it is the thing that changes between
 * workspaces and silently explains why a control was missing in one of them.
 */
function CurrentWorkspaceRow({
  workspace,
  onSelect,
}: {
  workspace: Workspace | undefined
  onSelect: () => void
}) {
  if (!workspace) return null

  return (
    <DropdownMenuItem className="gap-3 px-2 py-2" onSelect={onSelect}>
      <WorkspaceMark id={workspace.id} name={workspace.name} className="size-10 text-sm" />
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm">{workspace.name}</p>
        <p className="truncate text-xs text-tertiary-foreground">
          {ROLE_LABELS[workspace.role]}
        </p>
      </div>
    </DropdownMenuItem>
  )
}
