import { useLocation } from '@tanstack/react-router'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useWorkspaceDestinations } from '@/components/layout/nav/workspaceDestinations'
import { TasksSidebarItem } from '@/components/tasks/TasksSidebarItem'
import { IdeasSidebarItem } from '@/components/ideas/IdeasSidebarItem'

/**
 * Level 0 — the workspace's own destinations, and nothing else.
 *
 * What is *not* here is the point of the change. The rail used to list every
 * campaign under the Campaigns row and expand the active one into its six
 * sections, which put three campaigns × six sections = eighteen latent rows in
 * one sidebar and, worse, made the campaign borrow the module's vocabulary —
 * two rows reading "Analytics" in the same rail, told apart only by an indent.
 * Picking a campaign is the list screen's job (`/campaigns`); going into one
 * is a level change, and a level change replaces this.
 *
 * Inbox and Ideas are drawn by their own components rather than from the
 * table, because each carries a figure and a figure costs a query. Rendering
 * them here and only here is what keeps those queries at level 0: the glyph
 * the workspace takes into a campaign has no room for a count, so it needs no
 * request. The table still decides whether the row exists at all, and in what
 * order — what the component owns is the number.
 */
export function WorkspaceLevel() {
  const { pathname } = useLocation()
  const destinations = useWorkspaceDestinations()

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-0 lg:px-6 group-data-[collapsible=icon]:items-center">
      {destinations.map((destination) => {
        const isActive = destination.isActive(pathname)
        if (destination.id === 'inbox') {
          return <TasksSidebarItem key={destination.id} isActive={isActive} />
        }
        if (destination.id === 'ideas') {
          return <IdeasSidebarItem key={destination.id} isActive={isActive} />
        }
        return (
          <AppSidebarButtonMenu
            key={destination.id}
            icon={
              <destination.icon weight="regular" className="size-5 flex-none" />
            }
            text={destination.label}
            isActive={isActive}
            to={destination.to}
          />
        )
      })}
    </nav>
  )
}
