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
  return (
    <div className="min-h-0 overflow-y-auto">
      <CampaignBriefForm campaign={campaign} />
    </div>
  );
}
