import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { UploadTracker } from '@/components/uploads/UploadTracker'
import { RightSidebar } from '@/components/layout/RightSidebar'
import { useSettingsStore } from '@/stores/settingsStore'
import { useEventStream } from '@/hooks/useEventStream'
import { useNotificationStream } from '@/hooks/useNotifications'
import { prefetchReferenceData } from '@/lib/prefetch'

export const Route = createFileRoute('/_authenticated')({
  // Warm the shared reference caches now that we know there is a session —
  // see `lib/prefetch.ts` for why this can't live at module scope.
  loader: () => prefetchReferenceData(),
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)

  // The one place the broadcast stream is opened. Here rather than in `__root`
  // so it can't outlive the session: the auth routes render outside this
  // layout, so logging out unmounts it and closes the connection.
  useEventStream()
  // The durable one, on the same terms and for the same reason (CON-242). Two
  // connections rather than one because they answer different questions: this
  // one replays what was missed, and the bus above deliberately cannot.
  // A no-op while the `activity` flag is off.
  useNotificationStream()

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
    >
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Outlet />
      </SidebarInset>
      <RightSidebar />
      <UploadTracker />
    </SidebarProvider>
  )
}
