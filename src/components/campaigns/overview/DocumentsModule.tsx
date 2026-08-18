import { StatusBadge } from "@/components/ui/status-badge.tsx";
import type { Campaign } from "@/types/campaigns";
import { CollapsedCard } from "./OverviewCard.tsx";

/**
 * The documents row on the campaign Overview: how much this campaign has been
 * given to write from.
 *
 * It used to report which of three source modes the campaign was in. There are
 * no modes any more (CON-210) — a campaign owns a set of documents, and the
 * only thing worth saying here is how big it is.
 *
 * Titled "Documents" rather than "Content" because the card above it already
 * owns that word for the posts themselves.
 */
export function DocumentsModule({ campaign }: { campaign: Campaign }) {
  // Counted from the campaign alone, not against the asset list: the Overview
  // would otherwise pull every asset's full text to render one number. An id
  // whose asset has since been deleted therefore still counts here, and stops
  // counting the moment anyone opens the page below.
  const count = campaign.asset_ids.length;

  if (count === 0) {
    return (
      <CollapsedCard
        title="Documents"
        target="content"
        campaignId={campaign.id}
        label="Open this campaign's content"
      >
        <span className="min-w-0 flex-1 truncate text-tertiary-foreground">
          This campaign writes from its brief alone.
        </span>
      </CollapsedCard>
    );
  }

  return (
    <CollapsedCard
      title="Documents"
      target="content"
      campaignId={campaign.id}
      label="Open this campaign's content"
      status={
        <StatusBadge
          tone="positive"
          label={`${count} ${count === 1 ? "document" : "documents"}`}
        />
      }
    >
      <span className="min-w-0 flex-1 truncate">
        Generated posts can draw on the documents in this campaign.
      </span>
    </CollapsedCard>
  );
}
