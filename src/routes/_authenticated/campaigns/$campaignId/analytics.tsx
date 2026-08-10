import { createFileRoute, redirect } from "@tanstack/react-router";
import { CampaignAnalyticsPanel } from "@/components/campaigns/analytics/CampaignAnalyticsPanel.tsx";
import { isFeatureEnabled } from "@/config/featureFlags.ts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/analytics",
)({
  // The sidebar hides the item while the flag is off, but a bookmark or a
  // typed URL doesn't go through the sidebar — the route has to hold the gate
  // too, or the feature has an entry point its flag doesn't cover.
  beforeLoad: ({ params }) => {
    if (!isFeatureEnabled("campaign-analytics")) {
      throw redirect({
        to: "/campaigns/$campaignId/overview",
        params: { campaignId: params.campaignId },
      });
    }
  },
  component: CampaignAnalytics,
});

function CampaignAnalytics() {
  const { campaignId } = Route.useParams();
  return <CampaignAnalyticsPanel campaignId={campaignId} />;
}
