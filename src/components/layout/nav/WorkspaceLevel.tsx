import { useLocation } from '@tanstack/react-router'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useWorkspaceDestinations } from '@/components/layout/nav/workspaceDestinations'
import { TasksSidebarItem } from '@/components/tasks/TasksSidebarItem'

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
 * Inbox is the one row drawn by its own component rather than from the table,
 * because it carries a figure and that figure costs a query. Rendering it here
 * and only here is what keeps the query at level 0: the glyph the workspace
 * takes into a campaign has no room for a count, so it needs no request.
 */
export function WorkspaceLevel() {
  const { pathname } = useLocation()
  const destinations = useWorkspaceDestinations()

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-0 lg:px-6 group-data-[collapsible=icon]:items-center">
      {destinations.map((destination) =>
        destination.id === 'inbox' ? (
          <TasksSidebarItem
            key={destination.id}
            isActive={destination.isActive(pathname)}
          />
        ) : (
          <AppSidebarButtonMenu
            key={destination.id}
            icon={
              <destination.icon weight="regular" className="size-5 flex-none" />
            }
            text={destination.label}
            isActive={destination.isActive(pathname)}
            to={destination.to}
          />
        ),
      )}
    </nav>
  )
}
