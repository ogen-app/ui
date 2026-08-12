import { createFileRoute } from "@tanstack/react-router";
import { CampaignAssetsPanel } from "@/components/campaigns/assets/CampaignAssetsPanel.tsx";
import { useCampaign } from "@/hooks/useCampaigns.ts";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/assets",
)({
  component: CampaignAssets,
});

function CampaignAssets() {
  const { campaignId } = Route.useParams();
  const { data: campaign } = useCampaign(campaignId);
  if (!campaign) return null;
  // Keyed on the campaign: the panel seeds its mode and its assigned set from
  // the campaign once and then owns them, so switching campaigns has to give it
  // a fresh mount rather than leave the previous one's selection on screen.
  return <CampaignAssetsPanel key={campaign.id} campaign={campaign} />;
}
