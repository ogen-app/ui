import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { EMPTY_FILTERS, type AssetPoolFilters } from "@/lib/assetPool";
import {
  poolStats,
  selectionStats,
  sourcesError,
  type SourceMode,
} from "@/lib/campaignSources";
import type { Asset, Tag } from "@/types/content";
import { AssetPoolSection } from "./AssetPoolSection";
import { ContentSourcesCard } from "./ContentSourcesCard";

type Props = {
  mode: SourceMode;
  onModeChange: (mode: SourceMode) => void;
  /** The whole Content Bank. */
  assets: Asset[];
  tags: Tag[];
  /** The campaign's assigned set. */
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
};

/**
 * The campaign Assets page: the mode tiles, and — unless the campaign is on
 * its own — the Content Bank list underneath them.
 *
 * Campaign only has no list because there is nothing to show: no asset can
 * reach a post, so a table of them would be decoration. The other two modes
 * both show it, which is what makes them comparable — one frozen with
 * everything ticked, one you tick yourself.
 *
 * Expects the campaign layout's non-scrolling shell (`grid overflow-hidden
 * h-full`): the table scrolls, the page doesn't.
 */
export function CampaignAssetsView({
  mode,
  onModeChange,
  assets,
  tags,
  selectedIds,
  onSelectedIdsChange,
}: Props) {
  const [filters, setFilters] = useState<AssetPoolFilters>(EMPTY_FILTERS);

  const bank = useMemo(() => poolStats(assets), [assets]);
  const selection = useMemo(
    () => selectionStats(assets, selectedIds),
    [assets, selectedIds],
  );

  const blocked = sourcesError(mode, selectedIds);

  return (
    <div className="flex min-h-0 flex-col gap-4 py-4">
      <div className="shrink-0">
        <ContentSourcesCard
          mode={mode}
          onModeChange={onModeChange}
          bank={bank}
          selection={selection}
        />
      </div>

      {/* Only ever shown after the set has been emptied out: an empty explicit
          set is the one thing the server can't be told, so the save is held
          back and the user has to hear why. */}
      {blocked !== null && (
        <StatusBadge
          tone="warn"
          label={blocked}
          className="shrink-0 text-sm text-primary-foreground"
        />
      )}

      {mode !== "campaign" && (
        <AssetPoolSection
          assets={assets}
          tags={tags}
          mode={mode}
          selectedIds={selectedIds}
          onSelectedIdsChange={onSelectedIdsChange}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
    </div>
  );
}
