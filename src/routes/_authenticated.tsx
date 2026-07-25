import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Backdrop } from "@/components/ui/backdrop";
import { SecondaryNavbarContainer } from "@/components/layout/SecondaryNavbar";
import { CampaignsListContent } from "@/components/layout/CampaignsListContent";
import { OverlayOutlet } from "@/components/layout/OverlayOutlet";
import { UploadTracker } from "@/components/uploads/UploadTracker";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { useSettingsStore } from "@/stores/settingsStore";
import { ZIndex } from "@/config/zIndex";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const isSecondaryNavbarOpen = useSettingsStore((s) => s.isSecondaryNavbarOpen);
  const closeSecondaryNavbar = useSettingsStore((s) => s.closeSecondaryNavbar);

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
      <Backdrop
        open={isSecondaryNavbarOpen}
        onClick={closeSecondaryNavbar}
        zIndex={ZIndex.secondaryNavbarOverlay}
      />
      <SecondaryNavbarContainer>
        <CampaignsListContent />
      </SecondaryNavbarContainer>
      <OverlayOutlet />
      <UploadTracker />
    </SidebarProvider>
  );
}
