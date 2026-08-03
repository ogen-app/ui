import { StatusBadge } from "@/components/ui/status-badge.tsx";
import { sourceModeOf } from "@/lib/campaignSources.ts";
import type { Campaign } from "@/types/campaigns";
import { CollapsedCard } from "./OverviewCard.tsx";

/**
 * The Assets row on the campaign Overview. Reads the same three modes the
 * Assets page writes (`lib/campaignSources.ts`) — in particular, `use_assets`
 * with an empty `asset_ids` is the whole bank, not an unfinished setup.
 */
export function AssetsModule({ campaign }: { campaign: Campaign }) {
  const mode = sourceModeOf(campaign);

  if (mode === "campaign") {
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

  if (mode === "all") {
    return (
      <CollapsedCard
        title="Assets"
        target="assets"
        campaignId={campaign.id}
        label="Open campaign assets"
        status={<StatusBadge tone="positive" label="All assets" />}
      >
        <span className="min-w-0 flex-1 truncate">
          Generated posts can draw on the whole Content Bank, including anything
          added later.
        </span>
      </CollapsedCard>
    );
  }

  const count = campaign.asset_ids.length;

  return (
    <CollapsedCard
      title="Assets"
      target="assets"
      campaignId={campaign.id}
      label="Open campaign assets"
      status={
        <StatusBadge
          tone="positive"
          label={`${count} ${count === 1 ? "asset" : "assets"} assigned`}
        />
      }
    >
      <span className="min-w-0 flex-1 truncate">
        Generated posts can draw on this campaign's assigned material.
      </span>
    </CollapsedCard>
  );
}
