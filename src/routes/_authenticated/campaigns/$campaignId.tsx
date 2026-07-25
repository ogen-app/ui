import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { PageContainer } from "@/components/page-primitives/PageContainer.tsx";
import { PageLoader } from "@/components/page-primitives/PageLoader.tsx";
import { PageError } from "@/components/page-primitives/PageError.tsx";
import { PageHeader } from "@/components/page-primitives/PageHeader.tsx";
import { CalendarHeaderActions } from "@/components/campaigns/calendar/CalendarHeaderActions.tsx";
import { useCampaign } from "@/hooks/useCampaigns.ts";

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
