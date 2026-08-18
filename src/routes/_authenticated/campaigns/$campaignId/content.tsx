import { createFileRoute } from "@tanstack/react-router";
import { CampaignContentPage } from "@/components/campaigns/content/CampaignContentPage.tsx";
import { useCampaign } from "@/hooks/useCampaigns.ts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/content",
)({
  component: CampaignContent,
});

function CampaignContent() {
  const { campaignId } = Route.useParams();
  const { data: campaign } = useCampaign(campaignId);
  // The layout above has already handled loading and failure for this
  // campaign; this only renders once it is here.
  if (!campaign) return null;
  return <CampaignContentPage key={campaign.id} campaign={campaign} />;
}
