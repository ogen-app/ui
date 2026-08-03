import { useMemo, useState } from "react";
import { EMPTY_FILTERS, type AssetPoolFilters } from "@/lib/assetPool";
import {
  poolStats,
  selectionStats,
  type SourceMode,
} from "@/lib/campaignSources";
import type { Asset } from "@/types/content";
import { AssetPoolSection } from "./AssetPoolSection";
import { ContentSourcesCard } from "./ContentSourcesCard";

type Props = {
  mode: SourceMode;
  onModeChange: (mode: SourceMode) => void;
  /** The whole Content Bank. */
  assets: Asset[];
  /** The campaign's assigned set. */
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
};

/**
 * The campaign Assets page: the mode tiles, and the Content Bank list
 * underneath them unless the campaign is on its own.
 *
 * Campaign only has no list because there is nothing to show: no asset can
 * reach a post, so a table of them would be decoration. The other two modes
 * both show it, which is what makes them comparable. One comes frozen with
 * everything ticked, one you tick yourself.
 *
 * Expects the campaign layout's non-scrolling shell (`grid overflow-hidden
 * h-full`): the table scrolls, the page doesn't.
 */
export function CampaignAssetsView({
  mode,
  onModeChange,
  assets,
  selectedIds,
  onSelectedIdsChange,
}: Props) {
  const [filters, setFilters] = useState<AssetPoolFilters>(EMPTY_FILTERS);

  const bank = useMemo(() => poolStats(assets), [assets]);
  const selection = useMemo(
    () => selectionStats(assets, selectedIds),
    [assets, selectedIds],
  );

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

      {mode !== "campaign" && (
        <AssetPoolSection
          assets={assets}
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
