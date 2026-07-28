import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/ui/status-badge.tsx";
import type { Campaign } from "@/types/campaigns";
import { CollapsedCard, OverviewCard } from "./OverviewCard.tsx";

export function AssetsModule({ campaign }: { campaign: Campaign }) {
  if (!campaign.use_assets) {
    return (
      <CollapsedCard
        title="Assets"
        target="assets"
        campaignId={campaign.id}
        label="Open campaign assets"
      >
        <span className="min-w-0 flex-1 truncate text-tertiary-foreground">
          Content Bank assets aren't used in this campaign.
        </span>
      </CollapsedCard>
    );
  }

  const count = campaign.asset_ids.length;

  if (count === 0) {
    return (
      <OverviewCard
        title="Assets"
        status={<StatusBadge tone="warn" label="None attached" />}
        link={{
          target: "assets",
          campaignId: campaign.id,
          label: "Open campaign assets",
        }}
      >
        <p className="text-sm text-secondary-foreground">
          Assets are switched on for this campaign but none are attached yet.
          Attach reference material from the Content Bank so generated posts
          can draw on it.
        </p>
        <Link
          to="/content-bank"
          className="text-xs text-tertiary-foreground hover:text-primary-foreground"
        >
          Browse the Content Bank
        </Link>
      </OverviewCard>
    );
  }

  return (
    <CollapsedCard
      title="Assets"
      target="assets"
      campaignId={campaign.id}
      label="Open campaign assets"
      status={
        <StatusBadge
          tone="positive"
          label={`${count} ${count === 1 ? "asset" : "assets"} attached`}
        />
      }
    >
      <span className="min-w-0 flex-1 truncate">
        Generated posts can draw on this campaign's Content Bank material.
      </span>
    </CollapsedCard>
  );
}
