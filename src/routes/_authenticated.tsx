import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { UploadTracker } from "@/components/uploads/UploadTracker";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { useSettingsStore } from "@/stores/settingsStore";
import { useEventStream } from "@/hooks/useEventStream";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);

  // The one place the broadcast stream is opened. Here rather than in `__root`
  // so it can't outlive the session: the auth routes render outside this
  // layout, so logging out unmounts it and closes the connection.
  useEventStream();

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
  );
}
