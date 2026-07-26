import { createFileRoute } from "@tanstack/react-router";
import { CampaignBriefForm } from "@/components/forms/campaignBriefForm";
import { useCampaign } from "@/hooks/useCampaigns.ts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/brief",
)({
  component: CampaignBriefView,
});

function CampaignBriefView() {
  const { campaignId } = Route.useParams();
  const { data: campaign } = useCampaign(campaignId);
  if (!campaign) return null;
  // The campaign layout owns the scrolling and the fading header for this
  // section, so the form renders bare.
  return <CampaignBriefForm campaign={campaign} />;
}
