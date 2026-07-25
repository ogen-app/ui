import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/campaigns/$campaignId/overview",
)({
  component: CampaignOverview,
});

function CampaignOverview() {
  return (
    <div className="py-8 text-sm text-tertiary-foreground">
      Overview is coming soon.
    </div>
  );
}
