import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();

  if (!campaign) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-xl overflow-y-auto">
      <CampaignSettingsForm
        campaign={campaign}
        onClose={() =>
          navigate({ to: "/campaigns/$campaignId", params: { campaignId } })
        }
      />
    </div>
  );
}
