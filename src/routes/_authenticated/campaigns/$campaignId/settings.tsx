import { createFileRoute } from "@tanstack/react-router";
import { CampaignSettingsForm } from "@/components/forms/campaignSettingsForm";
import { PageLoader } from "@/components/page-primitives/PageLoader.tsx";
import { useCampaign } from "@/hooks/useCampaigns.ts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/settings",
)({
  component: CampaignSettings,
});

function CampaignSettings() {
  const { campaignId } = Route.useParams();
  const { data: campaign } = useCampaign(campaignId);

  if (!campaign) {
    return <PageLoader />;
  }

  // The campaign layout owns the scrolling and the fading header for this
  // section, so the form renders bare.
  return <CampaignSettingsForm campaign={campaign} />;
}
