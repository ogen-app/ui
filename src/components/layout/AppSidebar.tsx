import * as React from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowSquareOutIcon,
  ArrowsLeftRightIcon,
  CardsThreeIcon,
  CaretDoubleLeftIcon,
  ChartLineUpIcon,
  GearSixIcon,
  LifebuoyIcon,
  PaletteIcon,
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
import { useWorkspace } from '@/hooks/useWorkspaces'
import { formatAnchor } from '@/components/campaigns/calendar/date'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton.tsx'
import { CampaignIcon } from '@/components/layout/CampaignIcon.tsx'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark.tsx'
import { LiveStatus } from '@/components/layout/LiveStatus'
import { ActivitySidebarItem } from '@/components/activity/ActivitySidebarItem'
import { TasksSidebarItem } from '@/components/tasks/TasksSidebarItem'
import { useFeatureFlag } from '@/config/featureFlags'
import {
  CAMPAIGN_SECTIONS,
  type CampaignSectionId,
} from '@/lib/campaignSections.ts'
// One categorical scale for campaigns and workspaces alike — the mark is how
// you recognise a thing, so it can't be per-entity (see lib/identity.ts).
import { identityAbbr, identityColorVar } from '@/lib/identity.ts'
import { ROLE_LABEL_KEYS, type Workspace } from '@/types/workspace'

/** TODO: placeholder — no help site exists yet. Point at the real one when it does. */
const HELP_URL = 'https://getogen.com/help'

/**
 * `font-mono`, not the `font-grotesk` label voice the rows below use. These
 * headings and the rows they head are both uppercase and both small, so on the
 * old shared face the only thing separating them was a tone step — and the
 * headings kept reading as one more nav item. Geist Mono is genuinely a
 * different face, so the split now survives at a glance.
 *
 * It is the only place in the sidebar that gets it: mono is otherwise the
 * figure voice, and spending it on the rows too would put it back to one face.
 */
function SectionLabel({
  children,
  isCollapsed,
}: {
  children: React.ReactNode
  isCollapsed: boolean
}) {
  return (
    <div
      className={cn(
        'px-1.5 lg:px-2.5 pt-5 pb-1 w-[232px] shrink-0 font-mono text-xs/4 font-medium uppercase text-sidebar-secondary-foreground transition-opacity duration-200',
        isCollapsed && 'opacity-0',
      )}
    >
      {children}
    </div>
  )
}

// The rows and the Overview's cards read one table — see `lib/campaignSections`.
type CampaignSubItemId = CampaignSectionId

/** The app's main navigation sidebar, including the user/workspace menu. */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, setOpen, toggleSidebar } = useSidebar()
  const { t } = useTranslation()
  const location = useLocation()
  const isCollapsed = isMobile ? false : state === 'collapsed'
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data: campaigns, isPending: campaignsPending } = useCampaigns()
  const workspace = useWorkspace()
  const activityEnabled = useFeatureFlag('activity')
  const tasksEnabled = useFeatureFlag('tasks')
  const analyticsEnabled = useFeatureFlag('analytics-overview')
  const brandEnabled = useFeatureFlag('brand-materials')

  const activeCampaignId =
    location.pathname.match(/^\/campaigns\/([^/]+)/)?.[1] ?? null

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
          : location.pathname.includes('/content')
            ? 'content'
            : location.pathname.includes('/settings')
              ? 'settings'
              : 'posts'

  // Posts lands on the current week of the calendar; the rest are plain pages.
  const subItemLink = (
    campaignId: string,
    id: CampaignSubItemId,
  ): { to: string; params: Record<string, string> } =>
    id === 'posts'
      ? {
          to: '/campaigns/$campaignId/calendar/$anchor/$view',
          params: {
            campaignId,
            anchor: formatAnchor(new Date()),
            view: 'week',
          },
        }
      : { to: `/campaigns/$campaignId/${id}`, params: { campaignId } }

  const initials =
    `${user?.firstName[0] ?? ''}${user?.lastName[0] ?? ''}`.toUpperCase() || '?'
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

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
              <Link
                to="/"
                className={cn(
                  'flex items-center gap-2 font-semibold text-lg transition-all',
                )}
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
                  !isCollapsed && 'opacity-100 delay-100',
                )}
                onClick={() => setOpen(false)}
              >
                <CaretDoubleLeftIcon className="size-3 text-quaternary-foreground group-hover/button:text-primary-foreground transition-colors" />
              </Button>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav
            className={cn(
              'flex flex-col gap-1 px-3 py-0 lg:px-6',
              isCollapsed && 'items-center',
            )}
          >
            <SectionLabel isCollapsed={isCollapsed}>
              {t('nav.modules')}
            </SectionLabel>
            {/* First in the section, and first for a reason: it answers "what
                happened while I was away", which is the question you arrive
                with. Rendered only when the flag is on so the feature's own
                queries mount with it (CON-225). */}
            {activityEnabled && (
              <ActivitySidebarItem
                isActive={location.pathname.startsWith('/activity')}
              />
            )}
            {/* Directly under it: the feed is what reports the closures the
                board produces. Near neighbours, separate destinations — what
                happened and what is owed are two objects, opened at different
                times. Its own flag, because the two ship separately. */}
            {tasksEnabled && (
              <TasksSidebarItem
                isActive={location.pathname.startsWith('/tasks')}
              />
            )}
            {/* The two module rows stay in the text colour. Colour here is for
                telling near-identical siblings apart, and these two are a pair
                with unmistakable glyphs — tinting them would only make the rail
                louder. */}
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
              // The tab, not the redirect that picks it — same reason as the
              // campaign rows above, minus the visible symptom: the tab bar
              // falls back to All anyway, so this only spares the second
              // router pass.
              to="/content-bank/all"
            />
            {/* CON-227. Below Content Bank rather than above it because it is
                the newer of the two and the one that has to earn its place —
                and because CON-210 is about to vacate that slot, at which point
                Brand is what stays. Gated here as well as on the route: with
                the flag off the app must have no Brand at all. */}
            {brandEnabled && (
              <AppSidebarButtonMenu
                icon={
                  <PaletteIcon weight="regular" className="size-5 flex-none" />
                }
                text={t('nav.brand')}
                isActive={location.pathname.startsWith('/brand')}
                to="/brand"
              />
            )}
            {/* Last of the workspace destinations, because it is the one you
                arrive at after the work rather than to do it. Workspace-wide,
                like the three above and unlike the campaign rows below — the
                endpoint behind it is tenant-scoped and takes no campaign, so
                this row is the only place the whole workspace's numbers are
                asked for. */}
            {analyticsEnabled && (
              <AppSidebarButtonMenu
                icon={
                  <ChartLineUpIcon
                    weight="regular"
                    className="size-5 flex-none"
                  />
                }
                text={t('nav.analytics')}
                isActive={location.pathname.startsWith('/analytics')}
                to="/analytics"
              />
            )}

            {/* The nav is the same on every page, so an empty group here is
                the first thing you see on a cold load. Three rows hold the
                space the campaigns will take. */}
            {showCampaignsGroup && (
              <SectionLabel isCollapsed={isCollapsed}>
                {t('nav.campaigns')}
              </SectionLabel>
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
                        abbr={identityAbbr(name)}
                        active={isActive}
                        color={identityColorVar(campaign.id)}
                        className="size-5 flex-none"
                      />
                    }
                    // No `tone`: the campaign already carries its colour in the
                    // icon, and washing the row in it too made the selection
                    // about the campaign rather than about where you are.
                    text={name}
                    isActive={isActive}
                    // Straight to the section, not to `/campaigns/:id` and its
                    // redirect. That hop costs a second router pass, and for
                    // its duration the URL names no section at all — so the
                    // fallback below lit POSTS up before OVERVIEW took over,
                    // one visible beat later. The redirect stays for links
                    // arriving from outside; this is the one that has a
                    // sub-menu watching it.
                    to="/campaigns/$campaignId/overview"
                    params={{ campaignId: campaign.id }}
                  />
                  {isActive && (
                    // The 12px pad plus the nav's 4px gap makes 16px before
                    // the next campaign. The 2px rule closes the sub-menu, so
                    // the campaign that follows doesn't read as one more of
                    // its sections.
                    //
                    // The group itself is flush with the rail: the indent is
                    // inside each row, so a row's hover and selected tint still
                    // runs the full width of the nav like every other row —
                    // an indented block of narrower buttons would read as a
                    // second, inset menu.
                    <div className="flex w-full flex-col gap-1 pb-3 border-b-2 border-quaternary">
                      {CAMPAIGN_SECTIONS.map((item) => {
                        const subActive = activeSubItem === item.id
                        const link = subItemLink(campaign.id, item.id)
                        return (
                          <AppSidebarButtonMenu
                            key={item.id}
                            icon={
                              // Same 20px icon slot as top-level items so the labels
                              // line up; only the glyph inside is smaller.
                              <span
                                className="flex size-5 flex-none items-center justify-center"
                                style={{ color: item.tone }}
                              >
                                <item.icon className="size-4" />
                              </span>
                            }
                            text={t(item.labelKey)}
                            isActive={subActive}
                            to={link.to}
                            params={link.params}
                            // One step lighter than the grey a top-level row
                            // takes (gray-50 against gray-100), on hover as
                            // well as selected, so the campaign heading them
                            // stays the stronger mark and the group reads as
                            // one thing rather than seven equal rows.
                            //
                            // The indent is what says these rows belong to the
                            // campaign above, and it exists only while there
                            // are labels to line up: collapsed, the rail is
                            // one column of icons and an offset row would just
                            // look misaligned, so it falls back to the
                            // variant's own 10px. It runs on the same 200ms
                            // linear curve as the sidebar's width, so the rows
                            // slide in with the labels rather than snapping
                            // once they arrive.
                            //
                            // `lg:pl-3` has to be written out: the variant
                            // sets `lg:px-2.5`, and a plain `pl-*` is neither
                            // a `twMerge` conflict nor a match for a media
                            // query, so it would lose on the desktop rail.
                            className={cn(
                              'lg:h-8 text-xs hover:bg-secondary data-[active=true]:bg-secondary',
                              'duration-200 ease-linear',
                              !isCollapsed && 'pl-10 lg:pl-3',
                            )}
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
            icon={<GearSixIcon weight="regular" className="size-5 flex-none" />}
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
                  className={cn(
                    'flex w-full items-center justify-start gap-6 p-0 cursor-pointer select-none overflow-hidden',
                  )}
                >
                  {/* The workspace's mark, not the user's portrait. The
                      sidebar belongs to one workspace at a time — every item
                      above it is that workspace's — and this is the one slot
                      that survives the collapsed rail, so it should carry the
                      fact that changes rather than the one that never does.
                      Who you are is in the menu behind it. */}
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
                    <p className="w-full text-sm font-regular truncate text-left">
                      {fullName}
                    </p>
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
                      <p className="truncate text-sm text-primary-foreground">
                        {fullName}
                      </p>
                      {/* Just the account here. Which workspace you are in is
                          its own row below, with the role that comes with it. */}
                      <p className="truncate text-xs text-tertiary-foreground">
                        {user?.email}
                      </p>
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
                  <span>{t('nav.switchWorkspace')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  size="lg"
                  className="px-2"
                >
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
  const { t } = useTranslation()
  if (!workspace) return null

  return (
    <DropdownMenuItem className="gap-3 px-2 py-2" onSelect={onSelect}>
      <WorkspaceMark
        id={workspace.id}
        name={workspace.name}
        className="size-10 text-sm"
      />
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm">{workspace.name}</p>
        <p className="truncate text-xs text-tertiary-foreground">
          {t(ROLE_LABEL_KEYS[workspace.role])}
        </p>
      </div>
    </DropdownMenuItem>
  )
}
