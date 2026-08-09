import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageContainer } from "@/components/page-primitives/PageContainer.tsx";
import { PageLoader } from "@/components/page-primitives/PageLoader.tsx";
import { PageError } from "@/components/page-primitives/PageError.tsx";
import { PageHeader } from "@/components/page-primitives/PageHeader.tsx";
import { CalendarHeaderActions } from "@/components/campaigns/calendar/CalendarHeaderActions.tsx";
import {
  SettingsSaveBar,
  SettingsSaveProvider,
} from "@/components/settings/settingsSave.tsx";
import { PAGE_ACTION_BAR_INSET } from "@/components/page-primitives/PageActionBar.tsx";
import { cn } from "@/lib";
import { useCampaign } from "@/hooks/useCampaigns.ts";
import { threadIdFor, useAssistantStore } from "@/stores/assistantStore.ts";

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId")({
  component: CampaignLayout,
});

// Section slug (from the URL) → title suffix. The header title and its icon
// set depend on the selected secondary-nav element.
const SECTIONS = [
  { slug: "/list", label: "List" },
  { slug: "/brief", label: "Brief" },
  { slug: "/assets", label: "Assets" },
  { slug: "/settings", label: "Settings" },
  { slug: "/overview", label: "Overview" },
] as const;

function CampaignLayout() {
  const { campaignId } = Route.useParams();
  const { data: campaign, isLoading, isError } = useCampaign(campaignId);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section =
    SECTIONS.find((s) => pathname.includes(s.slug))?.label ?? "Calendar";

  // Being in a campaign is what makes its assistant thread available (CON-112);
  // post pages escape this layout, so they get their own thread instead. The
  // thread outlives this page — a content plan keeps generating after you
  // navigate away, and the thread list is how you get back to it.
  const openThread = useAssistantStore((s) => s.openThread);
  const renameThread = useAssistantStore((s) => s.renameThread);
  const threadId = threadIdFor({ kind: "campaign", campaignId });
  const campaignName = campaign?.name;

  useEffect(() => {
    openThread({ kind: "campaign", campaignId }, "", "");
    // Only on arrival — the name is tracked separately so that renaming the
    // campaign doesn't yank the panel away from a thread the user is reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, campaignId]);

  useEffect(() => {
    // A campaign thread's own title and its campaign name are the same string.
    if (campaignName !== undefined)
      renameThread(threadId, campaignName.trim(), campaignName.trim());
  }, [renameThread, threadId, campaignName]);

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    );
  }

  if (isError || !campaign) {
    return (
      <PageContainer>
        <PageError header="Campaign not found" />
      </PageContainer>
    );
  }

  const displayName = campaign.name.trim();
  const title = `${displayName === "" ? "Untitled campaign" : displayName} ${section}`;

  // Brief and Settings edit inline and commit through the bottom save bar, so
  // they get the settings-page shell: one scroll container owning the sticky
  // header, whose title fades out on scroll, inside a positioned wrapper the
  // bar can anchor to without scrolling away with the cards.
  if (section === "Brief" || section === "Settings") {
    return (
      <PageContainer variant={"fullFlex"}>
        <SettingsSaveProvider>
          <div className={"relative h-0 grow flex flex-col"}>
            <div className={"h-0 grow overflow-y-auto flex flex-col"}>
              <PageHeader title={title} fadeOnScroll />
              {/* pt-4 is the shared 16px breath between a page header and its
                  first card — see the same value on Overview and Workspace
                  Settings. */}
              <div className={cn("px-3 lg:px-6 pt-4", PAGE_ACTION_BAR_INSET)}>
                <Outlet />
              </div>
            </div>
            <SettingsSaveBar />
          </div>
        </SettingsSaveProvider>
      </PageContainer>
    );
  }

  // Overview reads as a document too — same scrolling shell and fading header,
  // minus the save button, since nothing on it is edited in place.
  if (section === "Overview") {
    return (
      <PageContainer variant={"fullFlex"}>
        <div className={"h-0 grow overflow-y-auto flex flex-col"}>
          <PageHeader title={title} fadeOnScroll />
          <div className={"px-3 lg:px-6 pt-4"}>
            <Outlet />
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant={"fullFlex"}>
      <div className={"flex-1 min-h-0 flex flex-col"}>
        <PageHeader
          title={title}
          actions={
            section === "Calendar" ? (
              <CalendarHeaderActions campaignId={campaignId} />
            ) : undefined
          }
        />
        <div className={"grid overflow-hidden h-full px-3 lg:px-6"}>
          <Outlet />
        </div>
      </div>
    </PageContainer>
  );
}
