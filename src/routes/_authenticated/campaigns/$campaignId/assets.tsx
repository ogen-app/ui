import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/assets",
)({
  component: CampaignAssets,
});

function CampaignAssets() {
  return (
    <div className="py-8 text-sm text-tertiary-foreground">
      Assets are coming soon.
    </div>
  );
}
